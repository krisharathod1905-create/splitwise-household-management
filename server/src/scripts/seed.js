/**
 * QueueLess — Seed Script
 * Creates demo offices, services, counters, staff, citizens, and historical service data.
 * Idempotent: safe to run multiple times.
 */

import mongoose from "mongoose";
import { connectDB, disconnectDB } from "#config/db.config.js";
import User from "#models/user.model.js";
import Office from "#models/office.model.js";
import Service from "#models/service.model.js";
import Counter from "#models/counter.model.js";
import Token from "#models/token.model.js";
import QueueSequence from "#models/queueSequence.model.js";
import ServiceHistory from "#models/serviceHistory.model.js";

const OFFICES = [
  {
    name: "Delhi Passport Seva Kendra",
    department: "Ministry of External Affairs",
    officeCode: "PSK-DEL-01",
    address: { street: "12 Patel Chest Road", area: "Civil Lines", city: "Delhi", state: "Delhi", pincode: "110054" },
    contact: { phone: "011-2345-6789", email: "psk.delhi@mea.gov.in" },
    workingHours: [
      { day: "monday", open: "09:00", close: "17:00" },
      { day: "tuesday", open: "09:00", close: "17:00" },
      { day: "wednesday", open: "09:00", close: "17:00" },
      { day: "thursday", open: "09:00", close: "17:00" },
      { day: "friday", open: "09:00", close: "17:00" },
      { day: "saturday", open: "10:00", close: "14:00" },
      { day: "sunday", isClosed: true },
    ],
    status: "active",
    description: "Apply for new passports, renewals, and emergency travel documents.",
    operationalSettings: { maxDailyTokens: 300, checkInBufferMinutes: 20, gracePeriodMinutes: 15 },
  },
  {
    name: "Mumbai RTO - Andheri",
    department: "Maharashtra Transport Department",
    officeCode: "RTO-MUM-ANH",
    address: { street: "Western Express Highway", area: "Andheri East", city: "Mumbai", state: "Maharashtra", pincode: "400093" },
    contact: { phone: "022-2834-5678" },
    workingHours: [
      { day: "monday", open: "10:00", close: "18:00" },
      { day: "tuesday", open: "10:00", close: "18:00" },
      { day: "wednesday", open: "10:00", close: "18:00" },
      { day: "thursday", open: "10:00", close: "18:00" },
      { day: "friday", open: "10:00", close: "18:00" },
      { day: "saturday", open: "10:00", close: "15:00" },
      { day: "sunday", isClosed: true },
    ],
    status: "active",
    description: "Vehicle registration, driving licenses, and transport permits.",
    operationalSettings: { maxDailyTokens: 500, checkInBufferMinutes: 15, gracePeriodMinutes: 10 },
  },
  {
    name: "Bangalore Municipal Corporation - Jayanagar",
    department: "Bruhat Bengaluru Mahanagara Palike",
    officeCode: "BBMP-JAY-01",
    address: { street: "11th Main Road, 4th Block", area: "Jayanagar", city: "Bangalore", state: "Karnataka", pincode: "560041" },
    contact: { phone: "080-2222-3333", email: "jayanagar@bbmp.gov.in" },
    workingHours: [
      { day: "monday", open: "09:30", close: "17:30" },
      { day: "tuesday", open: "09:30", close: "17:30" },
      { day: "wednesday", open: "09:30", close: "17:30" },
      { day: "thursday", open: "09:30", close: "17:30" },
      { day: "friday", open: "09:30", close: "17:30" },
      { day: "saturday", isClosed: true },
      { day: "sunday", isClosed: true },
    ],
    status: "active",
    description: "Property tax, birth/death certificates, trade licenses, and civic services.",
    operationalSettings: { maxDailyTokens: 200, checkInBufferMinutes: 10, gracePeriodMinutes: 8 },
  },
];

const SERVICE_TEMPLATES = {
  "PSK-DEL-01": [
    { name: "Fresh Passport Application", serviceCode: "PSP-NEW", expectedDurationMinutes: 20, category: "passport", requiredDocuments: ["Aadhaar Card", "Birth Certificate", "Address Proof"] },
    { name: "Passport Renewal", serviceCode: "PSP-RNW", expectedDurationMinutes: 15, category: "passport", requiredDocuments: ["Old Passport", "Address Proof"] },
    { name: "Emergency Passport", serviceCode: "PSP-EMG", expectedDurationMinutes: 25, category: "passport", requiredDocuments: ["Aadhaar Card", "Emergency Proof", "Travel Ticket"] },
  ],
  "RTO-MUM-ANH": [
    { name: "Driving License (New)", serviceCode: "DL-NEW", expectedDurationMinutes: 12, category: "driving_license", requiredDocuments: ["Application Form", "Age Proof", "Address Proof", "Medical Certificate"] },
    { name: "Driving License Renewal", serviceCode: "DL-RNW", expectedDurationMinutes: 8, category: "driving_license", requiredDocuments: ["Old License", "Age Proof"] },
    { name: "Vehicle Registration", serviceCode: "VR-REG", expectedDurationMinutes: 15, category: "vehicle_registration", requiredDocuments: ["Insurance", "PUC", "Purchase Invoice"] },
    { name: "RC Transfer", serviceCode: "RC-TRF", expectedDurationMinutes: 18, category: "vehicle_registration", requiredDocuments: ["Old RC", "Form 29", "Form 30", "Insurance"] },
  ],
  "BBMP-JAY-01": [
    { name: "Birth Certificate", serviceCode: "BC-CERT", expectedDurationMinutes: 10, category: "birth_certificate", requiredDocuments: ["Hospital Discharge Summary", "Parents' ID"] },
    { name: "Death Certificate", serviceCode: "DC-CERT", expectedDurationMinutes: 10, category: "death_certificate", requiredDocuments: ["Hospital/Medical Certificate", "Deceased's ID"] },
    { name: "Property Tax Assessment", serviceCode: "PT-ASMT", expectedDurationMinutes: 20, category: "municipal", requiredDocuments: ["Property Documents", "Previous Tax Receipt"] },
    { name: "Trade License", serviceCode: "TL-NEW", expectedDurationMinutes: 25, category: "municipal", requiredDocuments: ["Business Registration", "Address Proof", "NOC"] },
  ],
};

const randomInRange = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

export const seedDatabase = async () => {
  console.log("🌱 Starting QueueLess seed...\n");

  // ── Upsert admin user ──────────────────────────────────────────────────────
  let adminUser = await User.findOne({ email: "admin@queueless.app" });
  if (!adminUser) {
    const passwordHash = await User.hashPassword("Admin@1234");
    adminUser = await User.create({
      fullName: "QueueLess Admin",
      email: "admin@queueless.app",
      passwordHash,
      role: "admin",
    });
    console.log("✅ Admin user created: admin@queueless.app / Admin@1234");
  } else {
    console.log("ℹ️  Admin user already exists.");
  }

  // ── Upsert demo citizens ──────────────────────────────────────────────────
  const citizenData = [
    { fullName: "Aarav Sharma", email: "aarav@demo.queueless.app" },
    { fullName: "Priya Patel", email: "priya@demo.queueless.app" },
    { fullName: "Rohan Mehta", email: "rohan@demo.queueless.app" },
  ];
  const citizens = [];
  for (const cd of citizenData) {
    let c = await User.findOne({ email: cd.email });
    if (!c) {
      const passwordHash = await User.hashPassword("Demo@1234");
      c = await User.create({ ...cd, passwordHash, role: "citizen" });
      console.log(`✅ Citizen: ${cd.email} / Demo@1234`);
    }
    citizens.push(c);
  }

  // ── Upsert offices ────────────────────────────────────────────────────────
  const officeMap = {};
  for (const officeData of OFFICES) {
    let office = await Office.findOne({ officeCode: officeData.officeCode });
    if (!office) {
      office = await Office.create(officeData);
      console.log(`✅ Office created: ${office.name}`);
    } else {
      console.log(`ℹ️  Office exists: ${office.name}`);
    }
    officeMap[officeData.officeCode] = office;
  }

  // ── Upsert services & counters ────────────────────────────────────────────
  const serviceMap = {}; // officeCode → [services]
  for (const [officeCode, serviceTemplates] of Object.entries(SERVICE_TEMPLATES)) {
    const office = officeMap[officeCode];
    serviceMap[officeCode] = [];

    for (const st of serviceTemplates) {
      let service = await Service.findOne({ officeId: office._id, serviceCode: st.serviceCode });
      if (!service) {
        service = await Service.create({ ...st, officeId: office._id });
        console.log(`  ✅ Service: ${service.name} [${service.serviceCode}]`);
      }
      serviceMap[officeCode].push(service);
    }

    // Create 2-3 staff + counters per office
    const staffEmails = [
      `staff1.${officeCode.toLowerCase().replace(/-/g, "")}@demo.queueless.app`,
      `staff2.${officeCode.toLowerCase().replace(/-/g, "")}@demo.queueless.app`,
    ];
    const staffUsers = [];
    for (const email of staffEmails) {
      let su = await User.findOne({ email });
      if (!su) {
        const passwordHash = await User.hashPassword("Staff@1234");
        su = await User.create({
          fullName: `Staff ${email.split(".")[0]}`,
          email,
          passwordHash,
          role: "staff",
          assignedOfficeIds: [office._id],
        });
        console.log(`  ✅ Staff: ${email} / Staff@1234`);
      }
      staffUsers.push(su);
    }

    // Create counters
    for (let i = 0; i < 2; i++) {
      const counterNum = `C-${String(i + 1).padStart(2, "0")}`;
      let counter = await Counter.findOne({ officeId: office._id, counterNumber: counterNum });
      if (!counter) {
        counter = await Counter.create({
          officeId: office._id,
          counterNumber: counterNum,
          displayName: `Counter ${i + 1}`,
          staffId: staffUsers[i]?._id,
          supportedServiceIds: serviceMap[officeCode].map((s) => s._id),
          status: "available",
          lastActivityAt: new Date(),
        });
        console.log(`  ✅ Counter: ${counterNum} for ${office.name}`);
      }
    }
  }

  // ── Seed historical service data (for prediction engine) ─────────────────
  const today = new Date();
  let historyCount = 0;

  for (const [officeCode, services] of Object.entries(serviceMap)) {
    const office = officeMap[officeCode];

    for (const service of services) {
      // Check if we already have history
      const existingHistory = await ServiceHistory.countDocuments({
        officeId: office._id,
        serviceId: service._id,
      });
      if (existingHistory >= 30) {
        continue; // Skip if already seeded
      }

      // Generate 30 days of history, ~10-20 records per day
      for (let dayOffset = 1; dayOffset <= 30; dayOffset++) {
        const date = new Date(today);
        date.setDate(date.getDate() - dayOffset);
        const queueDate = date.toISOString().split("T")[0];
        const recordsThisDay = randomInRange(8, 20);

        for (let r = 0; r < recordsThisDay; r++) {
          const hour = randomInRange(9, 16);
          const minute = randomInRange(0, 59);
          const serviceStartedAt = new Date(date);
          serviceStartedAt.setHours(hour, minute, 0, 0);

          // Duration varies around expected duration with some noise
          const durationMinutes = Math.max(
            2,
            service.expectedDurationMinutes +
              (Math.random() * service.expectedDurationMinutes * 0.6 - service.expectedDurationMinutes * 0.3)
          );
          const completedAt = new Date(serviceStartedAt.getTime() + durationMinutes * 60000);

          await ServiceHistory.create({
            officeId: office._id,
            serviceId: service._id,
            tokenId: new mongoose.Types.ObjectId(),
            queueDate,
            serviceStartedAt,
            completedAt,
            actualDurationMinutes: Math.round(durationMinutes),
            isDemo: true,
          });
          historyCount++;
        }
      }
    }
  }

  if (historyCount > 0) {
    console.log(`\n✅ Seeded ${historyCount} historical service records for prediction engine.`);
  }

  // ── Create some pending demo tokens ──────────────────────────────────────
  const queueDate = today.toISOString().split("T")[0];
  const rtoOffice = officeMap["RTO-MUM-ANH"];
  const rtoServices = serviceMap["RTO-MUM-ANH"];

  if (rtoOffice && rtoServices?.length > 0) {
    const dlService = rtoServices.find((s) => s.serviceCode === "DL-NEW");
    if (dlService && citizens.length > 0) {
      for (const citizen of citizens) {
        const existingToken = await Token.findOne({
          userId: citizen._id,
          officeId: rtoOffice._id,
          serviceId: dlService._id,
          queueDate,
        });
        if (!existingToken) {
          let seq = await QueueSequence.findOneAndUpdate(
            { officeId: rtoOffice._id, serviceId: dlService._id, queueDate },
            { $inc: { lastSequence: 1, totalIssued: 1 } },
            { upsert: true, new: true }
          );
          const tokenNumber = `${dlService.serviceCode}-${String(seq.lastSequence).padStart(3, "0")}`;
          const token = new Token({
            userId: citizen._id,
            officeId: rtoOffice._id,
            serviceId: dlService._id,
            tokenNumber,
            sequenceNumber: seq.lastSequence,
            queueDate,
            status: "issued",
            source: "remote",
            issuedAt: new Date(),
            arrivalDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000),
          });
          token.generateVerificationNonce();
          await token.save();
          console.log(`  ✅ Demo token: ${tokenNumber} for ${citizen.fullName}`);
        }
      }
    }
  }

  console.log("\n🎉 Seed complete!\n");
  console.log("─────────────────────────────────────────────");
  console.log("Demo Credentials:");
  console.log("  Admin:   admin@queueless.app / Admin@1234");
  console.log("  Citizen: aarav@demo.queueless.app / Demo@1234");
  console.log("─────────────────────────────────────────────\n");
};

// If run directly from terminal `npm run seed` or `node seed.js`
if (import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, "/")}`) {
  (async () => {
    try {
      await connectDB();
      await seedDatabase();
      await disconnectDB();
      process.exit(0);
    } catch (err) {
      console.error("Seed failed:", err);
      process.exit(1);
    }
  })();
}

export default seedDatabase;
