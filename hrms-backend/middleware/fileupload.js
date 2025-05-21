// File: middleware/fileupload.js
const multer = require('multer');
const { Readable } = require('stream');
const mongoose = require('mongoose');
require('dotenv').config();

const conn = mongoose.createConnection(process.env.MONGO_URI);
let gfs;

conn.once('open', () => {
  gfs = new mongoose.mongo.GridFSBucket(conn.db, { bucketName: 'Uploads' });
  console.log('GridFS initialized manually');
});

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    try {
      const isProfilePicture = file.fieldname === 'profilePicture';
      const isJpeg = isProfilePicture && (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg');
      const isPdf = !isProfilePicture && file.mimetype === 'application/pdf';
      if (!isJpeg && !isPdf) {
        return cb(new Error(`Invalid file type for ${file.fieldname}. Only ${isProfilePicture ? 'JPEG/JPG images' : 'PDF files'} are allowed.`));
      }
      cb(null, true);
    } catch (err) {
      console.error('File filter error:', err);
      cb(new Error('Unexpected error in file validation'));
    }
  },
});

const uploadToGridFS = (file, metadata = {}) => {
  return new Promise((resolve, reject) => {
    const readableStream = Readable.from(file.buffer);
    const uploadStream = gfs.openUploadStream(file.originalname, {
      contentType: file.mimetype,
      metadata,
    });

    readableStream.pipe(uploadStream)
      .on('error', (err) => {
        console.error('Upload stream error:', err);
        reject(err);
      })
      .on('finish', () => {
        console.log('Upload stream finished:', uploadStream.id);
        resolve({ _id: uploadStream.id, filename: file.originalname });
      });
  });
};

module.exports = {
  upload,
  uploadToGridFS,
  gfsReady: () => !!gfs,
};