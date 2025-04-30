const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Employee = require('../models/Employee');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiter: Max 5 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests
  message: {
    message: 'Too many login attempts from this IP, please try again after 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  console.log(email, password);
  try {
    const user = await Employee.findOne({ email });
    console.log('Found user:', user);
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user._id, loginType: user.loginType, employeeId: user.employeeId,department: user.department },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({
      token,
      user: { id: user._id, loginType: user.loginType, name: user.name, employeeId: user.employeeId },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/register', async (req, res)=> {
  try {
    const data =req.body;
    const newEmp = await Employee.create(data);
    console.log(newEmp);
    res.status(201).json({ message: 'Employee registered successfully', employee: newEmp });
  } catch (error) {
    console.log(error);
  }
})

module.exports = router;