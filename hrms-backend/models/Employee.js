const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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
  status: { type: String, enum: ['Confirmed', 'Probation', 'Contractual'] },
  probationPeriod: { 
    type: Number,
    required: function() { return this.status === 'Probation'; } 
  },
  confirmationDate: { 
    type: Date,
    required: function() { return this.status === 'Probation'; } 
  },
  referredBy: String,
  loginType: { type: String, enum: ['Employee', 'HOD', 'Admin', 'CEO'] },
  designation: String,
  location: String,
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  employeeType: { type: String, enum: ['Intern', 'Staff'] },
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
}, { timestamps: true });

// Existing pre-save hook and methods remain unchanged
employeeSchema.pre('save', async function(next) {
  if (this.isModified('password') && this.password) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

employeeSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('Employee', employeeSchema);
