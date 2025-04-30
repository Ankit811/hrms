const mongoose = require('mongoose');
const bcrypt = require('bcrypt'); // Import bcrypt

const employeeSchema = new mongoose.Schema({
  employeeId: { type: String, required: true, unique: true },
  userId: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  dateOfBirth: { type: Date, required: true },
  mobileNumber: { type: String, required: true },
  address: { type: String, required: true },
  aadharNumber: { type: String, required: true, unique: true },
  dateOfJoining: { type: Date, required: true },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  position: { type: String, required: true },
  role: { type: String, required: true },
  loginType: { type: String, enum: ['Employee', 'HOD', 'Admin', 'CEO'], required: true },
  locked: { type: Boolean, default: true },
  paidLeaves: { type: Number, default: 12 },
  unpaidLeavesTaken: { type: Number, default: 0 },
  profilePicture: { type: mongoose.Schema.Types.ObjectId, default: null },
  documents: [{ type: mongoose.Schema.Types.ObjectId }]
});

// Middleware to hash password before saving
employeeSchema.pre('save', async function(next) {
  try {
    // Only hash the password if it has been modified (or is new)
    if (!this.isModified('password')) {
      return next();
    }

    // Generate a salt and hash the password
    const salt = await bcrypt.genSalt(10); // 10 rounds for salt
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error); // Pass any errors to the next middleware
  }
});

module.exports = mongoose.model('Employee', employeeSchema);