const PDFDocument = require('pdfkit');
const fs = require('fs');

const generatePDF = (data, type) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const buffers = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(buffers);
      resolve(pdfBuffer);
    });

    doc.fontSize(20).text(`Attendance Report - ${type}`, { align: 'center' });
    doc.moveDown();

    data.forEach((entry, index) => {
      doc.fontSize(12).text(
        `${index + 1}. ${entry.name} (${entry.employeeId}) - ${entry.logDate.toDateString()} ${entry.logTime} - ${entry.direction} - ${entry.status}`
      );
    });

    doc.end();
  });
};

module.exports = { generatePDF };