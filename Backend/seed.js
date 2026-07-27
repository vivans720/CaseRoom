const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load env vars
dotenv.config({ path: path.join(__dirname, ".env") });

const EmployeeRecord = require("./src/models/EmployeeRecord");

const seedEmployees = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error(
        "MONGODB_URI is not defined in the environment variables.",
      );
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB Connected...");

    const initialEmployees = Array.from({ length: 100 }, (_, index) => ({
      employeeId: `EMP${String(index + 1).padStart(3, "0")}`,
    }));

    // Clear existing to avoid duplicate key errors on seed if we want a fresh start,
    // or just use insertMany with ordered:false to ignore duplicates.
    // For safety, let's just use updateOne with upsert to avoid deleting existing production records accidentally

    for (const emp of initialEmployees) {
      await EmployeeRecord.updateOne(
        { employeeId: emp.employeeId },
        { $set: { employeeId: emp.employeeId } },
        { upsert: true },
      );
    }

    console.log("Employee records seeded successfully.");
    process.exit();
  } catch (error) {
    console.error("Error with data import:", error);
    process.exit(1);
  }
};

seedEmployees();
