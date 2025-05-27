const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Leave = require('./Leave');

const employeeSchema = new mongoose.Schema({
  employeeId: { type: String, unique: true },
  userId: { type: String, unique: true },
  email: { type: String, unique: true },
  password: {
    type: String,
    minlength: [6, 'Password must be at least 6 characters long']
  },
  name: String,
  dateOfBirth: Date,
  fatherName: String,
  motherName: String,
  mobileNumber: { type: String, match: /^\d{10}$/ },
  permanentAddress: String,
  currentAddress: String,
  aadharNumber: { type: String, match: /^\d{12}$/ },
  bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
  gender: { type: String, enum: ['Male', 'Female', 'Other'] },
  maritalStatus: { type: String, enum: ['Single', 'Married'] },
  spouseName: { 
    type: String,
    required: function() { return this.maritalStatus === 'Married'; } 
  },
  emergencyContactName: String,
  emergencyContactNumber: String,
  dateOfJoining: Date,
  reportingManager: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  status: { type: String, enum: ['Working', 'Resigned'] },
  dateOfResigning: { 
    type: Date,
    required: function() { return this.status === 'Resigned'; } 
  },
  employeeType: { 
    type: String, 
    enum: ['Intern', 'Confirmed', 'Contractual', 'Probation'],
    required: function() { return this.status === 'Working'; }
  },
  probationPeriod: { 
    type: Number,
    required: function() { return this.status === 'Working' && this.employeeType === 'Probation'; } 
  },
  confirmationDate: { 
    type: Date,
    required: function() { return this.status === 'Working' && this.employeeType === 'Probation'; } 
  },
  referredBy: String,
  loginType: { type: String, enum: ['Employee', 'HOD', 'Admin', 'CEO'] },
  designation: String,
  location: String,
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  panNumber: { type: String, match: /^[A-Z0-9]{10}$/ },
  pfNumber: { type: String, match: /^\d{18}$/, sparse: true },
  uanNumber: { type: String, match: /^\d{12}$/, sparse: true },
  esiNumber: { type: String, match: /^\d{12}$/, sparse: true },
  profilePicture: { type: mongoose.Schema.Types.ObjectId, ref: 'Uploads.files' },
  documents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Uploads.files' }],
  paymentType: { type: String, enum: ['Cash', 'Bank Transfer'] },
  bankDetails: {
    bankName: { 
      type: String,
      required: function() { return this.paymentType === 'Bank Transfer'; } 
    },
    bankBranch: { 
      type: String,
      required: function() { return this.paymentType === 'Bank Transfer'; } 
    },
    accountNumber: { 
      type: String,
      required: function() { return this.paymentType === 'Bank Transfer'; } 
    },
    ifscCode: { 
      type: String,
      required: function() { return this.paymentType === 'Bank Transfer'; } 
    },
  },
  locked: { type: Boolean, default: true },
  basicInfoLocked: { type: Boolean, default: true },
  positionLocked: { type: Boolean, default: true },
  statutoryLocked: { type: Boolean, default: true },
  documentsLocked: { type: Boolean, default: true },
  paymentLocked: { type: Boolean, default: true },
  paidLeaves: { type: Number, default: 12 },
  unpaidLeavesTaken: { type: Number, default: 0 },
  lastLeaveReset: { type: Date }, // For yearly reset (Staff)
  lastMonthlyReset: { type: Date }, // For monthly credit (Interns)
}, { timestamps: true });

// Middleware to handle password hashing
employeeSchema.pre('save', async function(next) {
  if (this.isModified('password') && this.password) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

// Middleware to handle leave allocation and reset
employeeSchema.pre('save', async function(next) {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  if (this.employeeType === 'Confirmed') {
    // Yearly reset for Staff
    const lastResetYear = this.lastLeaveReset ? new Date(this.lastLeaveReset).getFullYear() : null;
    if (!lastResetYear || lastResetYear < currentYear) {
      this.paidLeaves = 12; // Reset to 12 for the new year
      this.lastLeaveReset = new Date(currentYear, 0, 1); // Set reset date to Jan 1 of current year
    }
  } else if (this.employeeType === 'Intern' ||this.employeeType === 'Contractual' || this.employeeType === 'Probation') {
    // Monthly credit for Interns
    const lastResetMonth = this.lastMonthlyReset ? new Date(this.lastMonthlyReset).getMonth() : null;
    const lastResetYear = this.lastMonthlyReset ? new Date(this.lastMonthlyReset).getFullYear() : null;
    if (
      !lastResetMonth ||
      lastResetYear < currentYear ||
      (lastResetYear === currentYear && lastResetMonth < currentMonth)
    ) {
      // Carry forward existing leaves and add 1 for the new month
      this.paidLeaves = (this.paidLeaves || 0) + 1;
      this.lastMonthlyReset = new Date(currentYear, currentMonth, 1); // Set reset date to 1st of current month
    }
  }
  next();
});

// Method to compare passwords
employeeSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

// Method to check for three consecutive paid leaves
employeeSchema.methods.checkConsecutivePaidLeaves = async function(newLeaveStart, newLeaveEnd) {
  const leaves = await Leave.find({
    employeeId: this.employeeId,
    leaveType: 'Paid',
    $or: [
      { 'fullDay.from': { $lte: newLeaveEnd } },
      { 'halfDay.date': { $lte: newLeaveEnd } },
    ],
    'status.hod': 'Approved',
    'status.admin': 'Approved',
    'status.ceo': 'Approved',
  });

  // Convert leave dates to an array of covered dates
  let leaveDates = [];
  for (const leave of leaves) {
    if (leave.halfDay?.date) {
      leaveDates.push(new Date(leave.halfDay.date).toISOString().split('T')[0]);
    } else if (leave.fullDay?.from && leave.fullDay?.to) {
      let currentDate = new Date(leave.fullDay.from);
      const toDate = new Date(leave.fullDay.to);
      while (currentDate <= toDate) {
        leaveDates.push(currentDate.toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }
  }

  // Add the new leave dates
  let newLeaveDates = [];
  if (newLeaveStart && newLeaveEnd) {
    let currentDate = new Date(newLeaveStart);
    const toDate = new Date(newLeaveEnd);
    while (currentDate <= toDate) {
      newLeaveDates.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  // Combine and sort all leave dates
  leaveDates = [...new Set([...leaveDates, ...newLeaveDates])].sort();

  // Check for three consecutive days
  for (let i = 0; i < leaveDates.length - 2; i++) {
    const date1 = new Date(leaveDates[i]);
    const date2 = new Date(leaveDates[i + 1]);
    const date3 = new Date(leaveDates[i + 2]);

    const diff1 = (date2 - date1) / (1000 * 60 * 60 * 24);
    const diff2 = (date3 - date2) / (1000 * 60 * 60 * 24);

    if (diff1 === 1 && diff2 === 1) {
      return false; // Three consecutive days found
    }
  }

  return true; // No three consecutive days
};

// Method to deduct paid leaves after a leave is approved
employeeSchema.methods.deductPaidLeaves = async function(leaveStart, leaveEnd) {
  if (!leaveStart || !leaveEnd) return;

  let days = 0;
  if (leaveStart.toISOString().split('T')[0] === leaveEnd.toISOString().split('T')[0]) {
    days = 0.5; // Half-day leave
  } else {
    const from = new Date(leaveStart);
    const to = new Date(leaveEnd);
    days = ((to - from) / (1000 * 60 * 60 * 24)) + 1;
  }

  this.paidLeaves = Math.max(0, this.paidLeaves - days);
  await this.save();
};

// Method to increment unpaid leaves taken
employeeSchema.methods.incrementUnpaidLeaves = async function(leaveStart, leaveEnd) {
  if (!leaveStart || !leaveEnd) return;

  let days = 0;
  if (leaveStart.toISOString().split('T')[0] === leaveEnd.toISOString().split('T')[0]) {
    days = 0.5; // Half-day leave
  } else {
    const from = new Date(leaveStart);
    const to = new Date(leaveEnd);
    days = ((to - from) / (1000 * 60 * 60 * 24)) + 1;
  }

  this.unpaidLeavesTaken = (this.unpaidLeavesTaken || 0) + days;
  await this.save();
};

module.exports = mongoose.model('Employee', employeeSchema);
