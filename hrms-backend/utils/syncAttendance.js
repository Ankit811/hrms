// utils/syncAttendance.js

const { connectSQL, sql } = require('../config/sql');
const RawPunchlog = require('../models/RawPunchlog');
const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const SyncMetadata = require('../models/SyncMetadata');

const syncAttendance = async () => {
  try {
    // Step 1: Fetch or initialize lastSyncedAt
    let syncMeta = await SyncMetadata.findOne({ name: 'attendanceSync' });

    if (!syncMeta) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      syncMeta = await SyncMetadata.create({ name: 'attendanceSync', lastSyncedAt: yesterday });
    }

    const fromDate = new Date(syncMeta.lastSyncedAt);
    const toDate = new Date();

    const formatDateTime = (date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

    console.log(`🔄 Syncing attendance from ${formatDateTime(fromDate)} to ${formatDateTime(toDate)}`);

    // Step 2: Fetch punch logs from SQL
    const pool = await connectSQL();
    const query = `
      SELECT UserID, LogDate, LogTime, Direction
      FROM Punchlogs
      WHERE LogDate >= '${fromDate.toISOString().split('T')[0]}'
    `;
    const result = await pool.request().query(query);
    const records = result.recordset;

    if (!records || records.length === 0) {
      console.log('⚠️ No new punch logs found.');
      return;
    }

    // Step 3: Normalize and deduplicate logs
    let punchLogs = records.map((log) => {
      let logTime = log.LogTime;

      if (typeof logTime === 'number') {
        const h = Math.floor(logTime / 3600);
        const m = Math.floor((logTime % 3600) / 60);
        const s = logTime % 60;
        logTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      } else if (logTime instanceof Date) {
        logTime = logTime.toISOString().split('T')[1].substring(0, 8);
      } else if (typeof logTime === 'string' && !/^\d{2}:\d{2}:\d{2}$/.test(logTime)) {
        return null;
      }

      return {
        UserID: log.UserID?.toString().trim(),
        LogDate: new Date(log.LogDate),
        LogTime: logTime,
        Direction: (log.Direction || 'out').toLowerCase(),
        processed: false,
      };
    }).filter((log) => log && log.UserID && log.LogTime && !isNaN(log.LogDate));

    // Step 4: Deduplicate in-memory
    punchLogs = [...new Map(punchLogs.map((log) =>
      [`${log.UserID}_${log.LogDate.toISOString()}_${log.LogTime}`, log]
    )).values()];

    // Step 5: Insert only new logs in RawPunchlog
    const newLogs = [];
    for (const log of punchLogs) {
      const exists = await RawPunchlog.exists({
        UserID: log.UserID,
        LogDate: log.LogDate,
        LogTime: log.LogTime
      });
      if (!exists) newLogs.push(log);
    }

    if (newLogs.length > 0) {
      await RawPunchlog.insertMany(newLogs);
      console.log(`✅ ${newLogs.length} new punch logs inserted.`);
    } else {
      console.log('⚠️ No new punch logs to insert.');
    }

    // Step 6: Process logs and sync attendance
    const employees = await Employee.find();
    const rawLogs = await RawPunchlog.find({ processed: false });
    const logsByUser = {};

    rawLogs.forEach(log => {
      const key = `${log.UserID}_${log.LogDate.toISOString().split('T')[0]}`;
      if (!logsByUser[key]) logsByUser[key] = [];
      logsByUser[key].push(log);
    });

    for (const key in logsByUser) {
      const logs = logsByUser[key].sort((a, b) =>
        new Date(`1970-01-01T${a.LogTime}Z`) - new Date(`1970-01-01T${b.LogTime}Z`)
      );

      const userId = logs[0].UserID.trim();
      const employee = employees.find(emp => emp.userId.toString() === userId);

      if (!employee) {
        console.log(`⚠️ No employee found for UserID: ${userId}`);
        continue;
      }

      // First log as IN
      await Attendance.create({
        employeeId: employee.employeeId,
        userId: employee.userId,
        name: employee.name,
        logDate: logs[0].LogDate,
        logTime: logs[0].LogTime,
        direction: 'IN',
        status: 'Present',
      });

      // Last log as OUT
      await Attendance.create({
        employeeId: employee.employeeId,
        userId: employee.userId,
        name: employee.name,
        logDate: logs[logs.length - 1].LogDate,
        logTime: logs[logs.length - 1].LogTime,
        direction: 'OUT',
        status: 'Present',
      });

      // Mark logs as processed
      for (const log of logs) {
        log.processed = true;
        await log.save();
      }
    }

    await RawPunchlog.deleteMany({ processed: true });

    // ✅ Update sync time
    await SyncMetadata.findOneAndUpdate(
      { name: 'attendanceSync' },
      { lastSyncedAt: new Date() }
    );

    console.log('✅ Attendance sync complete and metadata updated.');

  } catch (err) {
    console.error('❌ Attendance sync error:', err.message, err.stack);
  }
};

module.exports = { syncAttendance };

