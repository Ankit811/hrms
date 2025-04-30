const soap = require('soap');
const xml2js = require('xml2js');
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

    const url = 'http://www.iseorg.com:342/accelor/WebAPIService.asmx?WSDL';
    const client = await soap.createClientAsync(url);

    const args = {
      FromDateTime: fromDateTime,
      ToDateTime: toDateTime,
      SerialNumber: 'QJT3243900243',
      UserName: 'admin',
      UserPassword: 'Admin@123',
      strDataList: 'DetailedLogs',
    };

    console.log('SOAP request args:', args);

    client.on('request', (xml) => console.log('Raw SOAP request:', xml));
    client.on('response', (xml) => console.log('Raw SOAP response:', xml));

    const result = await client.GetTransactionsLogAsync(args);
    const rawData = result[0]?.GetTransactionsLogResult;
    const strDataList = result[0]?.strDataList;

    console.log('Raw SOAP response (GetTransactionsLogResult):', rawData);
    console.log('strDataList:', strDataList);

    if (!rawData && !strDataList) {
      console.log('No transaction logs found.');
      return;
    }

    if (rawData && rawData.includes('not valid date format')) {
      console.log('Date format error in response:', rawData);
      return;
    }

    let dataToParse = strDataList || rawData;
    if (rawData && rawData.startsWith('Logs Count:')) {
      dataToParse = strDataList;
    }

    if (!dataToParse) {
      console.log('No data to parse.');
      return;
    }

    let punchLogs = [];
    if (!dataToParse.includes('<') && !dataToParse.includes(',')) {
      const lines = dataToParse.split('\n').filter(line => line.trim() && !line.trim().startsWith('Logs Count:'));
      console.log('Lines to parse:', lines);

      punchLogs = lines.map((line, index) => {
        const cleanedLine = line.replace(/[\t\r]/g, ' ').replace(/\s+/g, ' ').trim();
        const parts = cleanedLine.match(/^(\S+)\s(.+)$/)?.slice(1);
        console.log(`Line ${index}:`, parts);
        if (!parts || parts.length !== 2) return null;
        const userID = parts[0];
        const timestamp = parts[1];
        if (!timestamp || !/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}$/.test(timestamp)) return null;
        const logDate = new Date(timestamp);
        const logTime = timestamp.split(' ')[1];
        return { UserID: userID, LogDate: logDate, LogTime: logTime, Direction: 'out' };
      }).filter(log => log && log.UserID && log.LogTime && !isNaN(log.LogDate.getTime()));

      punchLogs = [...new Map(punchLogs.map(log => [`${log.UserID}_${log.LogDate.toISOString()}`, log])).values()];
    } else if (dataToParse.includes('<')) {
      const parser = new xml2js.Parser();
      const parsedResult = await parser.parseStringPromise(dataToParse);
      console.log('Parsed XML result:', JSON.stringify(parsedResult, null, 2));
      punchLogs = parsedResult['TransactionLog']?.map(log => ({
        UserID: log.UserID[0],
        LogDate: new Date(log.LogDate[0]),
        LogTime: log.LogTime[0],
        Direction: log.Direction[0] || 'out',
      })) || [];
    } else if (dataToParse.includes(',')) {
      punchLogs = dataToParse.split('\n').map(line => {
        const [UserID, LogDate, LogTime, Direction] = line.split(',');
        return { UserID, LogDate: new Date(LogDate), LogTime, Direction: Direction || 'out' };
      }).filter(log => log.UserID);
    } else {
      console.log('Unsupported or unparsed response format:', dataToParse);
      return;
    }

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