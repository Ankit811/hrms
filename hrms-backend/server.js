// ===== server.js =====
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { gfsReady } = require('./utils/gridfs');

const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employees');
const departmentRoutes = require('./routes/departments');
const attendanceRoutes = require('./routes/attendance');
const leaveRoutes = require('./routes/leaves');
const notificationRoutes = require('./routes/notifications');
const { syncAttendance } = require('./utils/syncAttendance');

dotenv.config();

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  'http://localhost:5174',
  'http://localhost:3000',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

global._io = io;

app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/notifications', notificationRoutes);

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    // Wait for GridFS to be ready with a timeout
    const checkGridFS = setInterval(() => {
      if (gfsReady()) {
        clearInterval(checkGridFS);
        console.log('GridFS initialized successfully');
        syncAttendance();
        setInterval(syncAttendance, 24 * 60 * 60 * 1000);

        const PORT = process.env.PORT || 5000;
        server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
      }
    }, 100); // Check every 100ms
    // Timeout after 10 seconds if GridFS isn't ready
    setTimeout(() => {
      if (!gfsReady()) {
        console.error('GridFS failed to initialize within 10 seconds');
        process.exit(1);
      }
    }, 10000);
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Socket.io events
io.on('connection', socket => {
  console.log('User connected:', socket.id);

  socket.on('join', userId => {
    socket.join(userId);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});