const fs = require('fs');
const path = require('path');
const { uploadBuffer, isConfigured } = require('../config/cloudinary');

const uploadFile = async (file, folder = 'ims') => {
  if (isConfigured()) {
    const result = await uploadBuffer(file.buffer, { folder, resource_type: 'auto' });
    return result.secure_url;
  }
  // Local fallback
  const filename = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
  // Save directly to the uploads folder in project root
  const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  const filePath = path.join(uploadsDir, filename);
  fs.writeFileSync(filePath, file.buffer);
  return `/uploads/${filename}`;
};

module.exports = { uploadFile };
