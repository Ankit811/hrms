const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const employeeSchema = new mongoose.Schema({
  employeeId: { type: String, required: true, unique: true },
  userId: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  dateOfBirth: { type: Date, required: true },
  fatherName: { type: String, required: true },
  motherName: { type: String, required: true },
  mobileNumber: { type: String, required: true, match: /^\d{10}$/ },
  permanentAddress: { type: String, required: true },
  currentAddress: { type: String, required: true },
  aadharNumber: { type: String, required: true, match: /^\d{12}$/ },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
  maritalStatus: { type: String, enum: ['Single', 'Married'], required: true },
  spouseName: { type: String, required: function() { return this.maritalStatus === 'Married'; } },
  emergencyContactName: { type: String, required: true },
  emergencyContactNumber: { type: String, required: true },
  dateOfJoining: { type: Date, required: true },
  reportingManager: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  status: { type: String, enum: ['Confirmed', 'Probation'], required: true },
  probationPeriod: { type: Number, required: function() { return this.status === 'Probation'; } },
  confirmationDate: { type: Date, required: function() { return this.status === 'Probation'; } },
  referredBy: { type: String },
  loginType: { type: String, enum: ['Employee', 'HOD', 'Admin', 'CEO'], required: true },
  designation: { type: String, required: true },
  location: { type: String, required: true },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  employeeType: { type: String, enum: ['Intern', 'Staff'], required: true },
  panNumber: { type: String, required: true },
  pfNumber: { type: String, match: /^\d{18}$/, sparse: true },
  uanNumber: { type: String, match: /^\d{12}$/, sparse: true },
  esiNumber: { type: String, match: /^\d{12}$/, sparse: true },
  profilePicture: { type: mongoose.Schema.Types.ObjectId, ref: 'Uploads.files' },
  documents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Uploads.files' }],
  paymentType: { type: String, enum: ['Cash', 'Bank Transfer'], required: true },
  bankDetails: {
    bankName: { type: String, required: function() { return this.paymentType === 'Bank Transfer'; } },
    bankBranch: { type: String, required: function() { return this.paymentType === 'Bank Transfer'; } },
    accountNumber: { type: String, required: function() { return this.paymentType === 'Bank Transfer'; } },
    ifscCode: { type: String, required: function() { return this.paymentType === 'Bank Transfer'; } },
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

employeeSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

employeeSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('Employee', employeeSchema);