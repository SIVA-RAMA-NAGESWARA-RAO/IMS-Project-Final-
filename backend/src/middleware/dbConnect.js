// src/middleware/dbConnect.js
// Guarantees a Mongoose connection for every request (Vercel serverless friendly).

const connectDB = require('../config/db');

module.exports = async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('[dbConnect] connection error:', err);
    res.status(500).json({ message: 'Database connection failed' });
  }
};
