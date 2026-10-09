import Token from "#models/token.model.js";
import ServiceHistory from "#models/serviceHistory.model.js";
import Counter from "#models/counter.model.js";
import QueueSequence from "#models/queueSequence.model.js";
import User from "#models/user.model.js";
import Office from "#models/office.model.js";
import Service from "#models/service.model.js";
import AuditLog from "#models/auditLog.model.js";
import { asyncHandler, sendSuccess, ApiError, getDateKey, paginate } from "#utils/utils.js";

export const getOverviewStats = asyncHandler(async (req, res) => {
  const queueDate = getDateKey();
  const { officeId } = req.query;

  const matchQuery = officeId ? { officeId: new (await import("mongoose")).default.Types.ObjectId(officeId) } : {};
  const dateMatchQuery = { ...matchQuery, queueDate };

  const [totalToday, waiting, inService, completed, missed, activeCounters, sequences] =
    await Promise.all([
      Token.countDocuments({ ...dateMatchQuery }),
      Token.countDocuments({ ...dateMatchQuery, status: { $in: ["issued", "checked_in"] } }),
      Token.countDocuments({ ...dateMatchQuery, status: { $in: ["called", "in_service"] } }),
      Token.countDocuments({ ...dateMatchQuery, status: "completed" }),
      Token.countDocuments({ ...dateMatchQuery, status: "missed" }),
      Counter.countDocuments({ ...(officeId ? { officeId } : {}), status: { $in: ["available", "busy"] } }),
      QueueSequence.find(dateMatchQuery).lean(),
    ]);

  const avgWaitMinutes = await ServiceHistory.aggregate([
    { $match: { ...matchQuery, queueDate } },
    { $group: { _id: null, avg: { $avg: "$actualDurationMinutes" } } },
  ]);

  return sendSuccess(res, {
    queueDate,
    totalToday,
    waiting,
    inService,
    completed,
    missed,
    activeCounters,
    noShowRate: totalToday > 0 ? Math.round((missed / totalToday) * 100) : 0,
    avgServiceMinutes: avgWaitMinutes[0]?.avg ? Math.round(avgWaitMinutes[0].avg) : null,
  });
});

export const getHourlyStats = asyncHandler(async (req, res) => {
  const { officeId, date = getDateKey() } = req.query;
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(`${date}T23:59:59.999Z`);

  const matchQuery = { issuedAt: { $gte: start, $lte: end } };
  if (officeId) matchQuery.officeId = (await import("mongoose")).default.Types.ObjectId(officeId);

  const hourly = await Token.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: { $hour: "$issuedAt" },
        count: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
      },
    },
    { $sort: { "_id": 1 } },
  ]);

  const formatted = Array.from({ length: 24 }, (_, h) => {
    const found = hourly.find((x) => x._id === h);
    return { hour: h, count: found?.count ?? 0, completed: found?.completed ?? 0 };
  });

  return sendSuccess(res, { hourly: formatted, date });
});

export const getAdminCounters = asyncHandler(async (req, res) => {
  const { officeId } = req.query;
  const query = officeId ? { officeId } : {};
  const counters = await Counter.find(query)
    .populate("staffId", "fullName email")
    .populate("supportedServiceIds", "name serviceCode")
    .lean();
  return sendSuccess(res, { counters });
});

export const createCounter = asyncHandler(async (req, res) => {
  const counter = await Counter.create(req.body);
  return sendSuccess(res, { counter }, "Counter created.", 201);
});

export const updateCounter = asyncHandler(async (req, res) => {
  const { counterId } = req.params;
  const counter = await Counter.findByIdAndUpdate(counterId, req.body, { new: true });
  if (!counter) throw new ApiError(404, "Counter not found.");
  return sendSuccess(res, { counter }, "Counter updated.");
});

export const listStaff = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const [staff, total] = await Promise.all([
    User.find({ role: { $in: ["staff", "admin"] } }).skip(skip).limit(limit).lean(),
    User.countDocuments({ role: { $in: ["staff", "admin"] } }),
  ]);
  return sendSuccess(res, { staff, pagination: { page, limit, total } });
});

export const createStaff = asyncHandler(async (req, res) => {
  const { fullName, email, password, role = "staff", officeIds } = req.body;
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw new ApiError(409, "Email already in use.");
  const passwordHash = await User.hashPassword(password);
  const user = await User.create({
    fullName, email: email.toLowerCase(), passwordHash, role,
    assignedOfficeIds: officeIds || [],
  });
  return sendSuccess(res, { user: { _id: user._id, fullName: user.fullName, email: user.email, role: user.role } }, "Staff account created.", 201);
});

export const getAuditLogs = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const { officeId, eventType } = req.query;
  const query = {};
  if (officeId) query.officeId = officeId;
  if (eventType) query.eventType = eventType;
  const [logs, total] = await Promise.all([
    AuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit)
      .populate("actorId", "fullName email").lean(),
    AuditLog.countDocuments(query),
  ]);
  return sendSuccess(res, { logs, pagination: { page, limit, total } });
});
