/**
 * QueueLess — Adaptive Queue Forecasting Engine
 *
 * Algorithm:
 * Step A: Compute historical service-duration baseline (median or trimmed mean)
 * Step B: Determine counter availability windows
 * Step C: Event-driven queue simulation to find target token's service start
 * Step D: Add uncertainty bounds from historical variance
 * Step E: Return structured prediction with confidence level
 */

import Token from "#models/token.model.js";
import Counter from "#models/counter.model.js";
import Service from "#models/service.model.js";
import ServiceHistory from "#models/serviceHistory.model.js";

// ─── Statistical helpers ──────────────────────────────────────────────────────

/**
 * Compute the median of a sorted numeric array.
 */
const median = (sorted) => {
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
};

/**
 * Compute the trimmed mean (discard top/bottom 10%).
 */
const trimmedMean = (sorted, trimFraction = 0.1) => {
  if (!sorted.length) return null;
  const trim = Math.floor(sorted.length * trimFraction);
  const trimmed = sorted.slice(trim, sorted.length - trim);
  if (!trimmed.length) return median(sorted);
  return trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
};

/**
 * Compute standard deviation of an array.
 */
const stdDev = (values, mean) => {
  if (values.length < 2) return 0;
  const variance =
    values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (values.length - 1);
  return Math.sqrt(variance);
};

// ─── Step A: Baseline Service Duration ───────────────────────────────────────

/**
 * Get historical service duration statistics for an office+service combo.
 * Falls back to configured default if insufficient data.
 */
const getBaselineDuration = async (officeId, serviceId, defaultDurationMinutes = 10) => {
  const LOOKBACK_DAYS = 30;
  const MIN_SAMPLE = 5;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - LOOKBACK_DAYS);
  const cutoffDateKey = cutoffDate.toISOString().split("T")[0];

  const history = await ServiceHistory.find({
    officeId,
    serviceId,
    queueDate: { $gte: cutoffDateKey },
    actualDurationMinutes: { $gt: 0, $lt: 120 }, // sanity bounds
  })
    .sort({ createdAt: -1 })
    .limit(200)
    .select("actualDurationMinutes")
    .lean();

  const durations = history.map((h) => h.actualDurationMinutes).sort((a, b) => a - b);
  const sampleSize = durations.length;

  if (sampleSize < MIN_SAMPLE) {
    return {
      estimatedMinutes: defaultDurationMinutes,
      stdDevMinutes: defaultDurationMinutes * 0.3,
      sampleSize,
      confidence: "low",
      source: "default_config",
    };
  }

  const med = median(durations);
  const tmean = trimmedMean(durations);
  const estimatedMinutes = med ?? tmean ?? defaultDurationMinutes;
  const sd = stdDev(durations, estimatedMinutes);

  const confidence =
    sampleSize >= 50 ? "high" : sampleSize >= 20 ? "medium" : "low";

  return {
    estimatedMinutes: Math.round(estimatedMinutes * 10) / 10,
    stdDevMinutes: Math.round(sd * 10) / 10,
    sampleSize,
    confidence,
    source: "historical_data",
  };
};

// ─── Step B: Counter Availability ────────────────────────────────────────────

/**
 * Build a map of counterId → estimated next available time (ms).
 * Accounts for currently-busy counters and their in-progress service.
 */
const buildCounterAvailabilityMap = async (officeId, serviceId, now = new Date()) => {
  const counters = await Counter.find({
    officeId,
    status: { $in: ["available", "busy"] },
    $or: [
      { supportedServiceIds: serviceId },
      { supportedServiceIds: { $size: 0 } },
    ],
  }).lean();

  const availabilityMap = new Map();

  for (const counter of counters) {
    if (counter.status === "available") {
      availabilityMap.set(counter._id.toString(), now.getTime());
    } else if (counter.status === "busy") {
      // Estimate from estimatedAvailableAt or default to 5 minutes
      const avail =
        counter.estimatedAvailableAt && counter.estimatedAvailableAt > now
          ? counter.estimatedAvailableAt.getTime()
          : now.getTime() + 5 * 60 * 1000;
      availabilityMap.set(counter._id.toString(), avail);
    }
  }

  return availabilityMap;
};

// ─── Step C: Queue Simulation ─────────────────────────────────────────────────

/**
 * Simulate queue processing to find when target token will be served.
 * Returns estimated service start time in milliseconds.
 */
const simulateQueue = (
  tokensAhead,
  targetTokenId,
  counterAvailabilityMap,
  baselineDurationMs,
  allTokens
) => {
  // Clone counter availability so we can mutate
  const counterAvail = new Map(counterAvailabilityMap);
  const counterIds = [...counterAvail.keys()];

  if (counterIds.length === 0) {
    // No counters — estimate linearly
    const position = tokensAhead + 1;
    return Date.now() + position * baselineDurationMs;
  }

  let simulationTime = Date.now();

  // Process each token ahead of target
  for (let i = 0; i < tokensAhead; i++) {
    // Find earliest available counter
    let earliestCounterId = null;
    let earliestAvailableAt = Infinity;

    for (const [cid, avail] of counterAvail.entries()) {
      if (avail < earliestAvailableAt) {
        earliestAvailableAt = avail;
        earliestCounterId = cid;
      }
    }

    if (!earliestCounterId) break;

    // This token gets served at earliest available counter
    const serviceStart = Math.max(earliestAvailableAt, simulationTime);
    const serviceEnd = serviceStart + baselineDurationMs;

    // Advance that counter's availability
    counterAvail.set(earliestCounterId, serviceEnd);
  }

  // Target token: find earliest available counter
  let targetCounterId = null;
  let targetAvailableAt = Infinity;

  for (const [cid, avail] of counterAvail.entries()) {
    if (avail < targetAvailableAt) {
      targetAvailableAt = avail;
      targetCounterId = cid;
    }
  }

  return Math.max(targetAvailableAt, simulationTime);
};

// ─── Step D: Uncertainty Bounds ───────────────────────────────────────────────

const computeUncertaintyBounds = (estimatedMinutes, stdDevMinutes, sampleSize) => {
  // Use 1.25 SD for the bound (roughly 78% coverage)
  const multiplier = sampleSize >= 30 ? 1.0 : sampleSize >= 10 ? 1.25 : 1.5;
  const bound = Math.max(2, stdDevMinutes * multiplier);

  return {
    lowerBoundMinutes: Math.max(0, Math.round(estimatedMinutes - bound)),
    upperBoundMinutes: Math.round(estimatedMinutes + bound),
  };
};

// ─── Main Prediction Function ─────────────────────────────────────────────────

/**
 * Predict wait time for a specific token.
 *
 * @param {string} tokenId - Target token ID
 * @returns {Object} Prediction result
 */
export const predictWaitTime = async (tokenId) => {
  const now = new Date();

  // Fetch target token
  const targetToken = await Token.findById(tokenId)
    .populate("serviceId", "expectedDurationMinutes name")
    .lean();

  if (!targetToken) {
    return null;
  }

  // Already served
  if (["completed", "cancelled", "missed", "expired"].includes(targetToken.status)) {
    return {
      estimatedWaitMinutes: 0,
      lowerBoundMinutes: 0,
      upperBoundMinutes: 0,
      predictedServiceStart: null,
      status: targetToken.status,
      predictionUpdatedAt: now,
    };
  }

  const { officeId, serviceId, queueDate, sequenceNumber } = targetToken;
  const defaultDuration = targetToken.serviceId?.expectedDurationMinutes ?? 10;

  // Step A: Historical baseline
  const baseline = await getBaselineDuration(officeId, serviceId, defaultDuration);

  // Count tokens ahead in queue (issued or checked_in, lower sequence number)
  const tokensAhead = await Token.countDocuments({
    officeId,
    serviceId,
    queueDate,
    status: { $in: ["issued", "checked_in", "called"] },
    sequenceNumber: { $lt: sequenceNumber },
  });

  // Step B: Counter availability
  const counterAvailabilityMap = await buildCounterAvailabilityMap(officeId, serviceId, now);
  const activeCounterCount = counterAvailabilityMap.size;

  // Handle zero-counter edge case
  if (activeCounterCount === 0) {
    return {
      estimatedWaitMinutes: null,
      lowerBoundMinutes: null,
      upperBoundMinutes: null,
      predictedServiceStart: null,
      confidenceLevel: "none",
      sampleSize: baseline.sampleSize,
      predictionUpdatedAt: now,
      predictionFactors: {
        tokensAhead,
        activeCounters: 0,
        baselineDurationMinutes: baseline.estimatedMinutes,
        note: "No active counters. Waiting time cannot be estimated.",
      },
      error: "no_counters",
    };
  }

  // Step C: Simulate
  const baselineDurationMs = baseline.estimatedMinutes * 60 * 1000;
  const predictedServiceStartMs = simulateQueue(
    tokensAhead,
    tokenId,
    counterAvailabilityMap,
    baselineDurationMs,
    []
  );

  const estimatedWaitMs = Math.max(0, predictedServiceStartMs - now.getTime());
  const estimatedWaitMinutes = Math.round(estimatedWaitMs / 60000);

  // Step D: Uncertainty
  const { lowerBoundMinutes, upperBoundMinutes } = computeUncertaintyBounds(
    estimatedWaitMinutes,
    baseline.stdDevMinutes,
    baseline.sampleSize
  );

  const predictionFactors = {
    tokensAhead,
    activeCounters: activeCounterCount,
    baselineDurationMinutes: baseline.estimatedMinutes,
    sampleSize: baseline.sampleSize,
    dataSource: baseline.source,
    confidenceNote:
      baseline.confidence === "low"
        ? "Estimate based on limited data. Actual wait may vary."
        : "Based on recent service history.",
  };

  return {
    estimatedWaitMinutes,
    lowerBoundMinutes,
    upperBoundMinutes,
    predictedServiceStart: new Date(predictedServiceStartMs),
    confidenceLevel: baseline.confidence,
    sampleSize: baseline.sampleSize,
    predictionUpdatedAt: now,
    predictionFactors,
  };
};

/**
 * Batch recalculate predictions for all active tokens in an office queue.
 * Called after any queue state change.
 */
export const recalculateQueuePredictions = async (officeId, serviceId, queueDate, emitFn) => {
  const activeTokens = await Token.find({
    officeId,
    serviceId,
    queueDate,
    status: { $in: ["issued", "checked_in"] },
  })
    .sort("sequenceNumber")
    .select("_id userId estimatedWaitMinutes predictedServiceStart")
    .lean();

  for (const token of activeTokens) {
    try {
      const prediction = await predictWaitTime(token._id.toString());
      if (prediction) {
        await Token.findByIdAndUpdate(token._id, {
          estimatedWaitMinutes: prediction.estimatedWaitMinutes,
          predictedServiceStart: prediction.predictedServiceStart,
          lowerBoundMinutes: prediction.lowerBoundMinutes,
          upperBoundMinutes: prediction.upperBoundMinutes,
        });

        // Emit socket event if emitter provided
        if (emitFn) {
          emitFn("prediction:updated", {
            tokenId: token._id,
            userId: token.userId,
            prediction,
          });
        }
      }
    } catch (err) {
      console.error(`[Prediction] Failed for token ${token._id}:`, err.message);
    }
  }
};
