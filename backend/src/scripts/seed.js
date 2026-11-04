import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import Supplier from "../modules/suppliers/supplierModel.js";
import Batch from "../modules/batches/batchModel.js";
import Pickup from "../modules/collections/pickupModel.js";
import WeightLog from "../modules/collections/weightLogModel.js";
import LabResult from "../modules/lab-results/labResultModel.js";
import {
  DEFAULT_CRITERIA,
  QualityDecision,
  QualityStatusHistory,
  QualityThreshold,
} from "../modules/quality/qualityModel.js";
import Experiment, { GrowthLog } from "../modules/experiments/experimentModel.js";
import { User } from "../modules/auth/authModel.js";

dotenv.config({ path: ['.env.local', '.env'] });

const DAY = 24 * 60 * 60 * 1000;
const today = new Date();
today.setUTCHours(0, 0, 0, 0);

const addDays = (date, days) => new Date(date.getTime() + days * DAY);
const iso = (date) => date.toISOString().slice(0, 10);
// Day offset from today as a YYYY-MM-DD string.
const d = (offset) => iso(addDays(today, offset));

const treatments = [
  { id: "T-1", label: "Control", kind: "control" },
  { id: "T-2", label: "Hair-free compost", kind: "hair-free" },
  { id: "T-3", label: "Hair-containing compost", kind: "hair-containing" },
];

const suppliers = [
  {
    code: "S-01",
    shopCode: "BBY-0101",
    shopName: "Studio Cut Barbers",
    owner: "Marco Reyes",
    phone: "0917 441 2280",
    email: "marco@studiocut.ph",
    barangay: "Cubao",
    address: "12B Aurora Blvd, Cubao",
    operatingHours: { days: "Mon–Sat", open: "09:00", close: "20:00" },
    pickupFrequency: "weekly",
    weeklyVolumeKg: 12.5,
    status: "approved",
    reviewedAt: d(-50),
    remarks: undefined,
  },
  {
    code: "S-02",
    shopCode: "BBY-0102",
    shopName: "Glow Salon",
    owner: "Ana Villanueva",
    phone: "0918 220 7741",
    email: "ana@glowsalon.ph",
    barangay: "Katipunan",
    address: "88 Esteban Abada St, Katipunan",
    operatingHours: { days: "Tue–Sun", open: "10:00", close: "19:00" },
    pickupFrequency: "biweekly",
    weeklyVolumeKg: 8,
    status: "approved",
    reviewedAt: d(-42),
  },
  {
    code: "S-03",
    shopCode: "BBY-0103",
    shopName: "Kapitan's Barbershop",
    owner: "Dante Cruz",
    phone: "0919 883 1120",
    email: "dante@kapitancuts.ph",
    barangay: "Commonwealth",
    address: "5 Commonwealth Ave, Batasan Hills",
    operatingHours: { days: "Daily", open: "08:00", close: "21:00" },
    pickupFrequency: "weekly",
    weeklyVolumeKg: 15,
    status: "pending",
  },
  {
    code: "S-04",
    shopCode: "BBY-0104",
    shopName: "Hair & Co.",
    owner: "Liza Santos",
    phone: "0920 551 3390",
    email: "liza@hairandco.ph",
    barangay: "Timog",
    address: "31 Scout Tobias, Timog",
    operatingHours: { days: "Mon–Sat", open: "09:30", close: "20:30" },
    pickupFrequency: "weekly",
    weeklyVolumeKg: 9.5,
    status: "approved",
    reviewedAt: d(-63),
  },
  {
    code: "S-05",
    shopCode: "BBY-0105",
    shopName: "Bella Beauty Lounge",
    owner: "Grace Lim",
    phone: "0921 776 4482",
    email: "grace@bellalounge.ph",
    barangay: "Diliman",
    address: "7 Sikatuna Ave, Diliman",
    operatingHours: { days: "Wed–Sun", open: "11:00", close: "20:00" },
    pickupFrequency: "monthly",
    weeklyVolumeKg: 6,
    status: "pending",
  },
  {
    code: "S-06",
    shopCode: "BBY-0106",
    shopName: "Fade Factory",
    owner: "Ron Dela Peña",
    phone: "0922 310 6655",
    email: "ron@fadefactory.ph",
    barangay: "Fairview",
    address: "24 Regalado Ave, Fairview",
    operatingHours: { days: "Daily", open: "09:00", close: "22:00" },
    pickupFrequency: "weekly",
    weeklyVolumeKg: 11,
    status: "rejected",
    reviewedAt: d(-21),
    remarks: "No covered storage area for segregated hair. Re-apply after setup.",
  },
  {
    code: "S-07",
    shopCode: "BBY-0107",
    shopName: "Novo Cuts",
    owner: "Jenny Ramos",
    phone: "0923 884 1276",
    email: "jenny@novocuts.ph",
    barangay: "Novaliches",
    address: "9 Quirino Hwy, Novaliches",
    operatingHours: { days: "Mon–Sun", open: "08:30", close: "20:00" },
    pickupFrequency: "biweekly",
    weeklyVolumeKg: 7.25,
    status: "approved",
    reviewedAt: d(-30),
  },
  {
    code: "S-08",
    shopCode: "BBY-0108",
    shopName: "San Bartolome Barbers",
    owner: "Luis Garcia",
    phone: "0924 559 8810",
    email: "luis@sanbartolome.ph",
    barangay: "San Bartolome",
    address: "3 Zabarte Rd, San Bartolome",
    operatingHours: { days: "Tue–Sat", open: "09:00", close: "19:30" },
    pickupFrequency: "weekly",
    weeklyVolumeKg: 10,
    status: "pending",
  },
];

const batches = [
  {
    code: "CMP-2026-001",
    recipeVersion: "v1.2",
    operator: "R. Reyes",
    machine: "Composter A",
    startedAt: d(-17),
    stage: "composting",
    supplierCodes: ["S-01", "S-04"],
  },
  {
    code: "CMP-2026-002",
    recipeVersion: "v1.2",
    operator: "R. Reyes",
    machine: "Composter A",
    startedAt: d(-27),
    stage: "curing",
    supplierCodes: ["S-01", "S-02"],
  },
  {
    code: "CMP-2026-003",
    recipeVersion: "v1.3",
    operator: "M. Domer",
    machine: "Composter B",
    startedAt: d(-37),
    stage: "quality review",
    supplierCodes: ["S-01", "S-02", "S-04"],
  },
  {
    code: "CMP-2026-004",
    recipeVersion: "v1.3",
    operator: "M. Domer",
    machine: "Composter B",
    startedAt: d(-33),
    stage: "quality review",
    supplierCodes: ["S-02", "S-07"],
  },
  {
    code: "CMP-2026-005",
    recipeVersion: "v1.3",
    operator: "M. Domer",
    machine: "Composter B",
    startedAt: d(-11),
    stage: "sampling",
    supplierCodes: ["S-04", "S-07", "S-08"],
  },
];

const labResults = [
  {
    batchCode: "CMP-2026-002",
    version: 1,
    labName: "Verde Analytical Services",
    method: "AOAC 2001.11 (Kjeldahl)",
    sampledAt: d(-19),
    receivedAt: d(-17),
    values: {
      nitrogen: 1.42,
      phosphorus: 0.86,
      potassium: 1.18,
      ph: 6.9,
      moisture: 41,
      maturity: "mature",
      cadmium: 0.4,
      lead: 12,
      arsenic: 1.1,
      mercury: 0.05,
      eColi: 120,
      salmonella: "absent",
    },
    attachment: { name: "CMP-2026-002_lab-report.pdf", kind: "pdf", sizeKb: 412 },
  },
  {
    batchCode: "CMP-2026-003",
    version: 1,
    labName: "Verde Analytical Services",
    method: "EPA 3050B / ICP-OES",
    sampledAt: d(-32),
    receivedAt: d(-30),
    values: {
      nitrogen: 1.05,
      phosphorus: 0.61,
      potassium: 0.92,
      ph: 7.4,
      moisture: 46,
      maturity: "semi-mature",
      cadmium: 1.2,
      lead: 145,
      arsenic: 3.4,
      mercury: 0.18,
      eColi: 640,
      salmonella: "absent",
    },
    attachment: { name: "CMP-2026-003_retest-required.pdf", kind: "pdf", sizeKb: 388 },
    notes: "Lead above threshold. Re-curing recommended before re-test.",
  },
  {
    batchCode: "CMP-2026-003",
    version: 2,
    labName: "Verde Analytical Services",
    method: "EPA 3050B / ICP-OES",
    sampledAt: d(-21),
    receivedAt: d(-19),
    values: {
      nitrogen: 1.18,
      phosphorus: 0.72,
      potassium: 1.02,
      ph: 7.1,
      moisture: 43,
      maturity: "mature",
      cadmium: 0.8,
      lead: 96,
      arsenic: 2.2,
      mercury: 0.09,
      eColi: 210,
      salmonella: "absent",
    },
    attachment: { name: "CMP-2026-003_retest_v2.pdf", kind: "pdf", sizeKb: 431 },
    notes: "Re-test after 11 days of additional curing. Lead within limit.",
  },
  {
    batchCode: "CMP-2026-004",
    version: 1,
    labName: "UPLB Soil and Plant Analysis Lab",
    method: "SM 9221 (E. coli)",
    sampledAt: d(-28),
    receivedAt: d(-26),
    values: {
      nitrogen: 0.94,
      phosphorus: 0.48,
      potassium: 0.77,
      ph: 8.3,
      moisture: 58,
      maturity: "semi-mature",
      cadmium: 0.5,
      lead: 22,
      arsenic: 1.6,
      mercury: 0.07,
      eColi: 180,
      salmonella: "absent",
    },
    attachment: { name: "CMP-2026-004_report_scan.jpg", kind: "image", sizeKb: 1240 },
    notes: "Moisture high and pH above range. Turn and dry before re-test.",
  },
  {
    batchCode: "CMP-2026-004",
    version: 2,
    labName: "UPLB Soil and Plant Analysis Lab",
    method: "SM 9221 (E. coli)",
    sampledAt: d(-15),
    receivedAt: d(-13),
    values: {
      nitrogen: 1.09,
      phosphorus: 0.55,
      potassium: 0.88,
      ph: 7.3,
      moisture: 44,
      maturity: "mature",
      cadmium: 0.5,
      lead: 21,
      arsenic: 1.5,
      mercury: 0.06,
      eColi: 150,
      salmonella: "absent",
    },
    attachment: { name: "CMP-2026-004_retest_v2.pdf", kind: "pdf", sizeKb: 402 },
    notes: "Re-test after turning and drying.",
  },
  {
    batchCode: "CMP-2026-005",
    version: 1,
    labName: "Metro Manila Environmental Testing",
    method: "EPA 1682 (Salmonella)",
    sampledAt: d(-9),
    receivedAt: d(-7),
    values: {
      nitrogen: 1.31,
      phosphorus: 0.79,
      potassium: 1.11,
      ph: 6.7,
      moisture: 39,
      maturity: "mature",
      cadmium: 0.3,
      lead: 9,
      arsenic: 0.9,
      mercury: 0.04,
      eColi: 90,
      salmonella: "absent",
    },
  },
];

const decisions = [
  {
    batchCode: "CMP-2026-001",
    status: "Pending",
    decidedBy: null,
    decidedAt: d(-17),
    remarks: "Awaiting the first sampling.",
  },
  {
    batchCode: "CMP-2026-002",
    status: "Pending",
    decidedBy: null,
    decidedAt: d(-17),
    remarks: "Result on file, not yet reviewed.",
  },
  {
    batchCode: "CMP-2026-003",
    status: "Approved for Supervised Testing",
    decidedBy: null,
    decidedAt: d(-19),
    remarks: "Re-test v2 within all thresholds.",
  },
  {
    batchCode: "CMP-2026-004",
    status: "On Hold",
    decidedBy: null,
    decidedAt: d(-26),
    remarks: "Moisture and pH outside range.",
  },
  {
    batchCode: "CMP-2026-005",
    status: "Pending",
    decidedBy: null,
    decidedAt: d(-7),
    remarks: "Result on file, not yet reviewed.",
  },
];

const history = [
  {
    batchCode: "CMP-2026-003",
    previous: "Pending",
    status: "On Hold",
    decidedAt: d(-30),
    remarks: "Lead at 145 mg/kg, above the 120 mg/kg limit.",
  },
  {
    batchCode: "CMP-2026-003",
    previous: "On Hold",
    status: "Approved for Supervised Testing",
    decidedAt: d(-19),
    remarks: "Re-test v2: lead 96 mg/kg, all criteria within range.",
  },
  {
    batchCode: "CMP-2026-004",
    previous: "Pending",
    status: "On Hold",
    decidedAt: d(-26),
    remarks: "Moisture 58% and pH 8.3 outside limits; turn and dry.",
  },
];

const experiments = [
  {
    title: "Pechay growth trial",
    crop: "Pechay (Brassica rapa)",
    setup: "Seed trays, 30 plants per treatment, greenhouse",
    batchCode: "CMP-2026-003",
    startDate: d(-17),
    status: "active",
    treatments,
    growth: [
      [d(-10), "T-1", 4.2, 4, "fair", null],
      [d(-10), "T-2", 5.1, 5, "good", null],
      [d(-10), "T-3", 5.6, 5, "good", "pechay_w1_hair.jpg"],
      [d(-3), "T-1", 7.8, 6, "good", null],
      [d(-3), "T-2", 9.4, 7, "good", null],
      [d(-3), "T-3", 10.5, 8, "excellent", "pechay_w2_hair.jpg"],
      [d(4), "T-1", 11.2, 8, "good", null],
      [d(4), "T-2", 13.8, 9, "good", null],
      [d(4), "T-3", 15.4, 10, "excellent", "pechay_w3_hair.jpg"],
    ],
  },
  {
    title: "Tomato seedling trial",
    crop: "Tomato (Solanum lycopersicum)",
    setup: "Potting bags, 20 seedlings per treatment, open shade",
    batchCode: "CMP-2026-004",
    startDate: d(-11),
    status: "active",
    treatments,
    growth: [
      [d(-4), "T-1", 6.1, 5, "fair", null],
      [d(-4), "T-2", 6.8, 5, "good", null],
      [d(-4), "T-3", 7.2, 6, "good", null],
      [d(3), "T-1", 9.5, 7, "good", null],
      [d(3), "T-2", 10.8, 8, "good", null],
      [d(3), "T-3", 11.6, 9, "excellent", "tomato_w2_hair.jpg"],
    ],
  },
];

async function seed() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("MONGO_URI is not set");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("Connected to", mongoose.connection.name);

  await Promise.all([
    Supplier.deleteMany({}),
    Batch.deleteMany({}),
    Pickup.deleteMany({}),
    WeightLog.deleteMany({}),
    LabResult.deleteMany({}),
    QualityThreshold.deleteMany({}),
    QualityDecision.deleteMany({}),
    QualityStatusHistory.deleteMany({}),
    Experiment.deleteMany({}),
    GrowthLog.deleteMany({}),
    User.deleteMany({}),
  ]);

  // Admin account used to sign in. OTP verification is bypassed for seeded users.
  const admin = await User.create({
    name: "Admin Reyes",
    email: "admin@hair2harvest.ph",
    password: await bcrypt.hash("Admin123!", 10),
    isVerified: true,
    role: "admin",
  });
  console.log("Admin user:", admin.email, "/ Admin123!");

  await Supplier.insertMany(
    suppliers.map((supplier) => ({ ...supplier, reviewedBy: admin._id })),
  );
  console.log("Suppliers:", suppliers.length);

  await Batch.insertMany(batches);
  console.log("Batches:", batches.length);

  /* Pickups and weight logs across the last eight weeks so the inventory
     charts and history have real depth. */
  const batchCodes = batches.map((batch) => batch.code);
  const approved = suppliers.filter((supplier) => supplier.status === "approved");
  const pickups = [];
  const logs = [];
  let pickupNumber = 0;
  let logNumber = 0;
  let rejectNumber = 0;

  const pad = (prefix, n) => `${prefix}-${String(n).padStart(4, "0")}`;

  approved.forEach((supplier, supplierIndex) => {
    for (let week = 8; week >= 1; week -= 1) {
      const date = d(-week * 7 + supplierIndex);
      const weight =
        Math.round((supplier.weeklyVolumeKg + (week % 3) * 1.4) * 10) / 10;

      pickupNumber += 1;
      const code = pad("P", pickupNumber);
      const batchCode = batchCodes[(week + supplierIndex) % batchCodes.length];

      pickups.push({
        code,
        supplierCode: supplier.code,
        date,
        time: "10:00",
        recurrence: "weekly",
        stage: "delivered",
        estimatedWeightKg: supplier.weeklyVolumeKg,
        weightKg: weight,
        batchCode,
      });

      logNumber += 1;
      logs.push({
        code: pad("L", logNumber),
        supplierCode: supplier.code,
        pickupCode: code,
        date,
        type: "in",
        weightKg: weight,
        batchCode,
      });
    }

    // A rejected load for two shops keeps the rejection reporting meaningful.
    if (supplierIndex === 1) {
      rejectNumber += 1;
      logs.push({
        code: pad("R", rejectNumber),
        supplierCode: supplier.code,
        date: d(-18),
        type: "rejected",
        weightKg: 2.4,
        reason: "contaminated",
        note: "Mixed with sweepings and plastic.",
      });
    }
    if (supplierIndex === 3) {
      rejectNumber += 1;
      logs.push({
        code: pad("R", rejectNumber),
        supplierCode: supplier.code,
        date: d(-9),
        type: "rejected",
        weightKg: 1.1,
        reason: "wet",
        note: "Stored next to the wash area.",
      });
    }
  });

  // Hair consumed by composting, so on-hand stock is not everything ever received.
  batchCodes.forEach((code, index) => {
    logNumber += 1;
    logs.push({
      code: pad("L", logNumber),
      supplierCode: "S-01",
      date: d(-12 + index),
      type: "processed",
      weightKg: 18 + index * 3,
      batchCode: code,
      note: "Loaded into the composter",
    });
  });

  // Upcoming and in-progress pickups for the tracking board.
  const upcoming = [
    { supplierCode: "S-01", offset: 0, stage: "scheduled" },
    { supplierCode: "S-02", offset: 0, stage: "scheduled" },
    { supplierCode: "S-04", offset: 1, stage: "scheduled" },
    { supplierCode: "S-07", offset: 2, stage: "scheduled" },
    { supplierCode: "S-01", offset: -1, stage: "collected" },
    { supplierCode: "S-04", offset: -2, stage: "inspected" },
    { supplierCode: "S-02", offset: -3, stage: "weighed" },
  ];

  upcoming.forEach((entry) => {
    const supplier = suppliers.find((item) => item.code === entry.supplierCode);
    pickupNumber += 1;
    pickups.push({
      code: pad("P", pickupNumber),
      supplierCode: entry.supplierCode,
      date: d(entry.offset),
      time: entry.stage === "scheduled" ? "10:00" : "09:00",
      recurrence: "none",
      stage: entry.stage,
      estimatedWeightKg: supplier.weeklyVolumeKg,
      weightKg:
        entry.stage === "weighed"
          ? Math.round((supplier.weeklyVolumeKg - 1.2) * 10) / 10
          : undefined,
    });
  });

  await Pickup.insertMany(pickups);
  await WeightLog.insertMany(logs);
  console.log("Pickups:", pickups.length, "Weight logs:", logs.length);

  await LabResult.insertMany(
    labResults.map((result, index) => ({
      ...result,
      code: `LR-${String(index + 1).padStart(4, "0")}`,
      enteredBy: admin._id,
    })),
  );
  console.log("Lab results:", labResults.length);

  await QualityThreshold.create({ singleton: "default", criteria: DEFAULT_CRITERIA });

  const decisionDocs = await QualityDecision.insertMany(
    decisions.map((decision) => ({ ...decision, decidedBy: admin._id })),
  );
  await QualityStatusHistory.insertMany(
    history.map((entry) => ({ ...entry, decidedBy: admin._id })),
  );
  console.log("Quality decisions:", decisionDocs.length);

  for (const [index, experiment] of experiments.entries()) {
    const { growth, ...rest } = experiment;
    const created = await Experiment.create({
      ...rest,
      code: `EXP-2026-${String(index + 1).padStart(3, "0")}`,
      createdBy: admin._id,
    });

    await GrowthLog.insertMany(
      growth.map(([date, treatmentId, heightCm, leafCount, health, photo]) => ({
        experiment: created._id,
        date,
        treatmentId,
        heightCm,
        leafCount,
        health,
        photo,
        createdBy: admin._id,
      })),
    );
  }
  console.log("Experiments:", experiments.length);

  await mongoose.disconnect();
  console.log("\nSeed complete.");
  console.log("Sign in with admin@hair2harvest.ph / Admin123!");
}

seed().catch(async (error) => {
  console.error("Seed failed:", error);
  await mongoose.disconnect();
  process.exit(1);
});
