const mongoose = require("mongoose");

const employeeRecordSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("EmployeeRecord", employeeRecordSchema);
