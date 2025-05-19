const sql = require('mssql');
const RawPunchlog = require('../models/RawPunchlog');
const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');

const syncAttendance = async () => {
  try {
    const fromDate = new Date('2025-04-29');
    fromDate.setHours(0, 1, 0, 0);
    const toDate = new Date('2025-04-29');
    toDate.setHours(23, 59, 0, 0);

    const formatDateTime = date =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

    const fromDateTime = formatDateTime(fromDate);
    const toDateTime = formatDateTime(toDate);

    console.log(`Syncing attendance from ${fromDateTime} to ${toDateTime}`);

    // Database connection configuration
    const dbConfig = {
      user: 'essl',
      password: 'essl',
      server: 'DESKTOP-S41L8IE\\SQLEXPRESS',
      database: 'etimetracklite1old',
      options: {
        trustServerCertificate: true, // For local development
      },
      driver: 'ODBC Driver 17 for SQL Server',
    };

    // Connect to the database
    const pool = await sql.connect(dbConfig);
    console.log('Connected to SQL Server database');

    // Query to fetch punch logs
    const query = `
      SELECT UserID, LogDate, LogTime, Direction
      FROM Punchlogs
      WHERE LogDate BETWEEN @fromDate AND @toDate
    `;
    const request = pool.request();
    request.input('fromDate', sql.DateTime, fromDate);
    request.input('toDate', sql.DateTime, toDate);

    const result = await request.query(query);
    const rawData = result.recordset;

    console.log('Raw database response:', rawData);

    await pool.close();

    if (!rawData || rawData.length === 0) {
      console.log('No transaction logs found.');
      return;
    }

    // Map database results to punchLogs format
    let punchLogs = rawData.map(log => ({
      UserID: log.UserID,
      LogDate: new Date(log.LogDate),
      LogTime: log.LogTime,
      Direction: log.Direction || 'out',
    }));

    console.log('Raw punch logs to store:', punchLogs);

    if (punchLogs.length === 0) {
      console.log('No punch logs parsed from response.');
      return;
    }

    await RawPunchlog.insertMany(punchLogs);
    console.log('Raw punch logs stored in MongoDB');

    if (!Employee || typeof Employee.find !== 'function') {
      console.error('❌ Employee model is undefined or broken');
      return;
    }

    const employees = await Employee.find();
    console.log('Fetched employees:', employees);

    const rawLogs = await RawPunchlog.find({ processed: false });
    const logsByUser = {};

    rawLogs.forEach(log => {
      const key = `${log.UserID.trim()}_${log.LogDate.toISOString().split('T')[0]}`;
      if (!logsByUser[key]) logsByUser[key] = [];
      logsByUser[key].push(log);
    });

    for (const key in logsByUser) {
      const logs = logsByUser[key].sort((a, b) => {
        const timeA = new Date(`1970-01-01T${a.LogTime}Z`);
        const timeB = new Date(`1970-01-01T${b.LogTime}Z`);
        return timeA - timeB;
      });

      const userId = logs[0].UserID.trim();
      const employee = employees.find(emp => emp.userId.toString() === userId);

      if (!employee) {
        console.log(`No matching employee for UserID: ${userId}`);
        continue;
      }

      const firstLog = logs[0];
      await Attendance.create({
        employeeId: employee.employeeId,
        userId: employee.userId,
        name: employee.name,
        logDate: firstLog.LogDate,
        logTime: firstLog.LogTime,
        direction: 'IN',
        status: 'Present',
      });
      console.log(`Synced IN for ${employee.name} at ${firstLog.LogTime}`);

      const lastLog = logs[logs.length - 1];
      await Attendance.create({
        employeeId: employee.employeeId,
        userId: employee.userId,
        name: employee.name,
        logDate: lastLog.LogDate,
        logTime: lastLog.LogTime,
        direction: 'OUT',
        status: 'Present',
      });
      console.log(`Synced OUT for ${employee.name} at ${lastLog.LogTime}`);

      for (const log of logs) {
        log.processed = true;
        await log.save();
      }
    }

    await RawPunchlog.deleteMany({ processed: true });
    console.log('Attendance synced successfully and processed logs cleared');
  } catch (err) {
    console.error('Attendance sync error:', err.message);
  }
};

module.exports = { syncAttendance };