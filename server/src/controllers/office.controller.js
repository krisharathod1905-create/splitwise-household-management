import mongoose from "mongoose";
import Office from "#models/office.model.js";
import Service from "#models/service.model.js";
import Counter from "#models/counter.model.js";
import Token from "#models/token.model.js";
import { getServiceRequirements } from "#services/document.service.js";
import { asyncHandler, sendSuccess, paginate, getDateKey, ApiError } from "#utils/utils.js";
import { getLiveQueueStatus } from "#services/queue.service.js";

const DEMO_OFFICES = [
  {
    _id: "demo-office-1",
    name: "Delhi Passport Seva Kendra",
    department: "Ministry of External Affairs",
    category: "passport",
    address: { street: "12 Patel Chest Road", city: "Delhi", state: "Delhi", pincode: "110054" },
    stats: { activeQueue: 14, avgWaitMinutes: 12 },
    servicesCount: 3,
    description: "Apply for new passports, renewals, and emergency travel documents.",
    services: [
      { _id: "demo-srv-1", name: "Fresh Passport Application", code: "PSP-NEW", avgProcessingTimeMinutes: 20, requiredDocuments: ["Aadhaar Card", "Birth Certificate", "Address Proof"] },
      { _id: "demo-srv-2", name: "Passport Renewal", code: "PSP-RNW", avgProcessingTimeMinutes: 15, requiredDocuments: ["Old Passport", "Address Proof"] },
    ]
  },
  {
    _id: "demo-office-2",
    name: "Mumbai RTO - Andheri",
    department: "Maharashtra Transport Department",
    category: "rto",
    address: { street: "Western Express Highway", city: "Mumbai", state: "Maharashtra", pincode: "400093" },
    stats: { activeQueue: 8, avgWaitMinutes: 8 },
    servicesCount: 4,
    description: "Vehicle registration, driving licenses, and transport permits.",
    services: [
      { _id: "demo-srv-3", name: "Driving License (New)", code: "DL-NEW", avgProcessingTimeMinutes: 12, requiredDocuments: ["Application Form", "Age Proof", "Address Proof"] },
      { _id: "demo-srv-4", name: "Vehicle Registration", code: "VR-REG", avgProcessingTimeMinutes: 15, requiredDocuments: ["Insurance", "PUC", "Invoice"] },
    ]
  },
  {
    _id: "demo-office-3",
    name: "Bangalore Municipal Corporation - Jayanagar",
    department: "Bruhat Bengaluru Mahanagara Palike",
    category: "civic",
    address: { street: "11th Main Road, 4th Block", city: "Bangalore", state: "Karnataka", pincode: "560041" },
    stats: { activeQueue: 4, avgWaitMinutes: 5 },
    servicesCount: 4,
    description: "Property tax, birth/death certificates, trade licenses, and civic services.",
    services: [
      { _id: "demo-srv-5", name: "Birth Certificate", code: "BC-CERT", avgProcessingTimeMinutes: 10, requiredDocuments: ["Hospital Discharge Summary", "Parents' ID"] },
      { _id: "demo-srv-6", name: "Property Tax Assessment", code: "PT-ASMT", avgProcessingTimeMinutes: 20, requiredDocuments: ["Property Documents", "Previous Tax Receipt"] },
    ]
  }
];

export const listOffices = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const { search, department, city, status = "active" } = req.query;

  // Fallback to demo data if DB is disconnected
  if (mongoose.connection.readyState !== 1) {
    return sendSuccess(res, {
      offices: DEMO_OFFICES,
      pagination: { page: 1, limit: 10, total: DEMO_OFFICES.length, totalPages: 1 }
    });
  }

  const query = {};
  if (status) query.status = status;
  if (department) query.department = new RegExp(department, "i");
  if (city) query["address.city"] = new RegExp(city, "i");
  if (search) {
    query.$or = [
      { name: new RegExp(search, "i") },
      { department: new RegExp(search, "i") },
      { "address.city": new RegExp(search, "i") },
    ];
  }

  const [offices, total] = await Promise.all([
    Office.find(query).skip(skip).limit(limit).sort({ name: 1 }).lean(),
    Office.countDocuments(query),
  ]);

  // Attach live queue summary to each office
  const officesWithStatus = await Promise.all(
    offices.map(async (office) => {
      const services = await Service.find({ officeId: office._id, enabled: true })
        .select("_id name serviceCode requiredDocuments documentRequirements expectedDurationMinutes")
        .lean();
      const queueDate = getDateKey();
      const waitingCount = await Token.countDocuments({
        officeId: office._id,
        queueDate,
        status: { $in: ["issued", "checked_in"] },
      });
      const activeCounters = await Counter.countDocuments({
        officeId: office._id,
        status: { $in: ["available", "busy"] },
      });
      return { ...office, services, liveStats: { waitingCount, activeCounters } };
    })
  );

  return sendSuccess(res, {
    offices: officesWithStatus,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

export const getOfficeById = asyncHandler(async (req, res) => {
  const { officeId } = req.params;

  if (mongoose.connection.readyState !== 1) {
    const demoOffice = DEMO_OFFICES.find((o) => o._id === officeId) || DEMO_OFFICES[0];
    return sendSuccess(res, { office: demoOffice, services: demoOffice.services, counters: [] });
  }

  const office = await Office.findById(officeId).lean();
  if (!office) throw new ApiError(404, "Office not found.");

  const [services, counters] = await Promise.all([
    Service.find({ officeId, enabled: true }).lean(),
    Counter.find({ officeId }).populate("staffId", "fullName").lean(),
  ]);
  const servicesWithRequirements = services.map((service) => ({
    ...service,
    documentRequirements: getServiceRequirements(service),
  }));

  const queueDate = getDateKey();
  const liveStats = await Promise.all(
    servicesWithRequirements.map((s) => getLiveQueueStatus(officeId, s._id))
  );

  return sendSuccess(res, { office, services: servicesWithRequirements, counters, liveStats });
});

export const getOfficeServices = asyncHandler(async (req, res) => {
  const { officeId } = req.params;
  const services = await Service.find({ officeId, enabled: true }).lean();
  return sendSuccess(res, {
    services: services.map((service) => ({
      ...service,
      documentRequirements: getServiceRequirements(service),
    })),
  });
});

export const getOfficeLiveStatus = asyncHandler(async (req, res) => {
  const { officeId } = req.params;
  const services = await Service.find({ officeId, enabled: true }).select("_id name serviceCode").lean();
  const liveStatus = await Promise.all(
    services.map(async (s) => ({
      service: s,
      queue: await getLiveQueueStatus(officeId, s._id),
    }))
  );
  const activeCounters = await Counter.countDocuments({ officeId, status: { $in: ["available", "busy"] } });
  return sendSuccess(res, { liveStatus, activeCounters });
});

// ─── Admin: Create/Update Office ─────────────────────────────────────────────

export const createOffice = asyncHandler(async (req, res) => {
  const office = await Office.create(req.body);
  return sendSuccess(res, { office }, "Office created successfully.", 201);
});

export const updateOffice = asyncHandler(async (req, res) => {
  const { officeId } = req.params;
  const office = await Office.findByIdAndUpdate(officeId, req.body, { new: true, runValidators: true });
  if (!office) throw new ApiError(404, "Office not found.");
  return sendSuccess(res, { office }, "Office updated.");
});

export const createService = asyncHandler(async (req, res) => {
  const { officeId } = req.params;
  const input = { ...req.body, officeId };
  if (input.documentRequirements) {
    input.requiredDocuments = input.documentRequirements
      .filter((requirement) => requirement.required)
      .map((requirement) => requirement.name);
  }
  const service = await Service.create(input);
  return sendSuccess(res, { service }, "Service created.", 201);
});

export const updateService = asyncHandler(async (req, res) => {
  const { serviceId } = req.params;
  const input = { ...req.body };
  if (input.documentRequirements) {
    input.requiredDocuments = input.documentRequirements
      .filter((requirement) => requirement.required)
      .map((requirement) => requirement.name);
  }
  const service = await Service.findByIdAndUpdate(serviceId, input, { new: true, runValidators: true });
  if (!service) throw new ApiError(404, "Service not found.");
  return sendSuccess(res, { service }, "Service updated.");
});
