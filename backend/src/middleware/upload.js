const multer = require('multer');

const MAX_SIZE_BYTES = (Number(process.env.MAX_UPLOAD_SIZE_MB) || 5) * 1024 * 1024;

const ALLOWED_MIME = {
  resume: ['application/pdf'],
  document: ['application/pdf', 'image/png', 'image/jpeg'],
};

const fileFilterFor = (kind) => (req, file, cb) => {
  if (!ALLOWED_MIME[kind].includes(file.mimetype)) {
    return cb(new Error(`Only ${ALLOWED_MIME[kind].join(', ')} files are allowed`));
  }
  cb(null, true);
};

// Memory storage — files are streamed straight to Cloudinary, never
// written to local disk (required for serverless deployments).
const uploadResume = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE_BYTES },
  fileFilter: fileFilterFor('resume'),
}).single('resume');

const uploadDocument = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE_BYTES },
  fileFilter: fileFilterFor('document'),
}).single('document');

module.exports = { uploadResume, uploadDocument };
