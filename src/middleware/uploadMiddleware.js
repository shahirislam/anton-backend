const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const uploadDirs = {
  competitions: path.join(__dirname, '../../public/uploads/competitions'),
  categories: path.join(__dirname, '../../public/uploads/categories'),
  profiles: path.join(__dirname, '../../public/uploads/profiles'),
};

// Create directories if they don't exist
Object.values(uploadDirs).forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadType = req.uploadType || 'competitions';
    cb(null, uploadDirs[uploadType] || uploadDirs.competitions);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-random-uuid-originalname
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '-');
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  },
});

// File filter - only allow images
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed.'), false);
  }
};

// Multer configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
});

// Middleware factory for different upload types
const createUploadMiddleware = (uploadType = 'competitions', fieldName = 'image') => {
  return (req, res, next) => {
    req.uploadType = uploadType;
    const uploadSingle = upload.single(fieldName);
    uploadSingle(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.error('File size too large. Maximum size is 5MB', 400);
          }
          return res.error('File upload error: ' + err.message, 400);
        }
        return res.error(err.message || 'File upload failed', 400);
      }
      next();
    });
  };
};

module.exports = {
  upload,
  createUploadMiddleware,
  uploadDirs,
};

