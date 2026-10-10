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
    .populate("officeId", "name officeCode")
    .populate("staffId", "fullName email")
    .populate("supportedServiceIds", "name serviceCode")
    .lean();
  return sendSuccess(res, { counters });
});

export const createCounter = asyncHandler(async (req, res) => {
  const { officeId, counterNumber, displayName, staffId, supportedServiceIds = [], status = "available" } = req.body;
  if (!officeId || !counterNumber) throw new ApiError(400, "officeId and counterNumber are required.");
  const office = await Office.findById(officeId).select("_id");
  if (!office) throw new ApiError(404, "Office not found.");
  const services = await Service.find({ _id: { $in: supportedServiceIds }, officeId }).select("_id");
  if (services.length !== supportedServiceIds.length) {
    throw new ApiError(400, "Every supported service must belong to the selected office.");
  }
  let staff;
  if (staffId) {
    staff = await User.findOne({ _id: staffId, role: "staff", isActive: true });
    if (!staff) throw new ApiError(404, "Active staff member not found.");
    const staffOfficeIds = staff.assignedOfficeIds?.map((id) => id.toString()) || [];
    if (staff.assignedOfficeId) staffOfficeIds.push(staff.assignedOfficeId.toString());
    if (!staffOfficeIds.includes(officeId.toString())) {
      throw new ApiError(400, "Staff member is not assigned to this office.");
    }
    if (await Counter.exists({ staffId })) {
      throw new ApiError(409, "This staff member is already assigned to a counter.");
    }
  }
  try {
    const counter = await Counter.create({
      officeId,
      counterNumber,
      displayName: displayName?.trim() || `Counter ${counterNumber}`,
      staffId: staff?._id,
      supportedServiceIds,
      status,
      lastActivityAt: new Date(),
    });
    await Service.updateMany(
      { _id: { $in: supportedServiceIds } },
      { $addToSet: { compatibleCounterIds: counter._id } }
    );
    const populated = await Counter.findById(counter._id)
      .populate("staffId", "fullName email")
      .populate("supportedServiceIds", "name serviceCode")
      .lean();
    return sendSuccess(res, { counter: populated }, "Counter created.", 201);
  } catch (error) {
    if (error.code === 11000) throw new ApiError(409, "Counter number already exists in this office.");
    throw error;
  }
});

export const updateCounter = asyncHandler(async (req, res) => {
  const { counterId } = req.params;
  const counter = await Counter.findById(counterId);
  if (!counter) throw new ApiError(404, "Counter not found.");
  if (counter.currentTokenId && (req.body.officeId || req.body.staffId !== undefined)) {
    throw new ApiError(409, "Finish the active token before changing this counter assignment.");
  }
  const previousServiceIds = counter.supportedServiceIds.map((id) => id.toString());
  const officeId = req.body.officeId || counter.officeId;
  const supportedServiceIds = req.body.supportedServiceIds || counter.supportedServiceIds;
  const services = await Service.find({ _id: { $in: supportedServiceIds }, officeId }).select("_id");
  if (services.length !== supportedServiceIds.length) {
    throw new ApiError(400, "Every supported service must belong to the selected office.");
  }
  if (req.body.staffId) {
    const staff = await User.findOne({ _id: req.body.staffId, role: "staff", isActive: true });
    if (!staff) throw new ApiError(404, "Active staff member not found.");
    const staffOfficeIds = staff.assignedOfficeIds?.map((id) => id.toString()) || [];
    if (staff.assignedOfficeId) staffOfficeIds.push(staff.assignedOfficeId.toString());
    if (!staffOfficeIds.includes(officeId.toString())) {
      throw new ApiError(400, "Staff member is not assigned to this office.");
    }
    const otherCounter = await Counter.findOne({ staffId: req.body.staffId, _id: { $ne: counterId } }).select("_id");
    if (otherCounter) throw new ApiError(409, "This staff member is already assigned to another counter.");
  }
  Object.assign(counter, {
    ...req.body,
    officeId,
    supportedServiceIds,
    displayName: req.body.displayName?.trim() || counter.displayName,
    lastActivityAt: new Date(),
  });
  try {
    await counter.save();
  } catch (error) {
    if (error.code === 11000) throw new ApiError(409, "Counter number already exists in this office.");
    throw error;
  }
  await Service.updateMany(
    { _id: { $in: previousServiceIds } },
    { $pull: { compatibleCounterIds: counter._id } }
  );
  await Service.updateMany(
    { _id: { $in: supportedServiceIds } },
    { $addToSet: { compatibleCounterIds: counter._id } }
  );
  const populated = await Counter.findById(counter._id)
    .populate("staffId", "fullName email")
    .populate("supportedServiceIds", "name serviceCode")
    .lean();
  return sendSuccess(res, { counter: populated }, "Counter updated.");
});

export const deleteCounter = asyncHandler(async (req, res) => {
  const { counterId } = req.params;
  const counter = await Counter.findById(counterId);
  if (!counter) throw new ApiError(404, "Counter not found.");
  if (counter.currentTokenId || counter.status === "busy") {
    throw new ApiError(409, "Finish the active token before deleting this counter.");
  }
  await Counter.deleteOne({ _id: counterId });
  await Service.updateMany(
    { compatibleCounterIds: counter._id },
    { $pull: { compatibleCounterIds: counter._id } }
  );
  return sendSuccess(res, { counterId }, "Counter deleted.");
});

export const listStaff = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const [staff, total] = await Promise.all([
    User.find({ role: { $in: ["staff", "admin"] } }).skip(skip).limit(limit).populate("assignedOfficeId").lean(),
    User.countDocuments({ role: { $in: ["staff", "admin"] } }),
  ]);
  return sendSuccess(res, { staff, pagination: { page, limit, total } });
});

export const createStaff = asyncHandler(async (req, res) => {
  const { fullName, email, password, role = "staff", officeId } = req.body;
  console.log("Creating staff with data:", { fullName, email, role, officeId });
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw new ApiError(409, "Email already in use.");
  const passwordHash = await User.hashPassword(password);
  const user = await User.create({
    fullName, email: email.toLowerCase(), passwordHash, role,
    assignedOfficeId: officeId || undefined,
    assignedOfficeIds: officeId ? [officeId] : [],
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
