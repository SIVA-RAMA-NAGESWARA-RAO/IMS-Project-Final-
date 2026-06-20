const asyncHandler = require('express-async-handler');
const CandidateProfile = require('../models/Candidate');
const { uploadBuffer, isConfigured } = require('../config/cloudinary');

// @desc Upload a resume PDF directly to Cloudinary (Module 2)
// @route POST /api/candidates/me/resume/upload  (multipart/form-data, field: "resume")
const uploadResumeFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('No file uploaded — attach a PDF under the "resume" field');
  }
  if (!isConfigured()) {
    res.status(503);
    throw new Error('File storage is not configured (missing Cloudinary credentials)');
  }

  const result = await uploadBuffer(req.file.buffer, { folder: 'ims/resumes', resource_type: 'raw' });

  const profile = await CandidateProfile.findOneAndUpdate(
    { user: req.user._id },
    { resumeUrl: result.secure_url },
    { new: true, upsert: true }
  );

  res.status(201).json(profile);
});

// @desc Upload a supporting document (certificate, ID, etc.) to Cloudinary (Module 2)
// @route POST /api/candidates/me/documents/upload  (multipart/form-data, field: "document")
const uploadDocumentFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('No file uploaded — attach a file under the "document" field');
  }
  if (!isConfigured()) {
    res.status(503);
    throw new Error('File storage is not configured (missing Cloudinary credentials)');
  }

  const result = await uploadBuffer(req.file.buffer, { folder: 'ims/documents' });

  const profile = await CandidateProfile.findOneAndUpdate(
    { user: req.user._id },
    { $push: { documents: { name: req.file.originalname, url: result.secure_url, uploadedAt: new Date() } } },
    { new: true, upsert: true }
  );

  res.status(201).json(profile);
});

// @desc Get my candidate profile
// @route GET /api/candidates/me
const getMyProfile = asyncHandler(async (req, res) => {
  const profile = await CandidateProfile.findOne({ user: req.user._id }).populate('user', 'name email phone');
  if (!profile) {
    res.status(404);
    throw new Error('Candidate profile not found');
  }
  res.json(profile);
});

// @desc Create or update my candidate profile
// @route PUT /api/candidates/me
const upsertMyProfile = asyncHandler(async (req, res) => {
  const { headline, skills, experienceYears, education, location } = req.body;

  const profile = await CandidateProfile.findOneAndUpdate(
    { user: req.user._id },
    { headline, skills, experienceYears, education, location },
    { new: true, upsert: true, runValidators: true }
  );

  res.json(profile);
});

// @desc Upload / attach a resume URL (file storage handled client-side or via a signed URL upstream)
// @route POST /api/candidates/me/resume
const uploadResume = asyncHandler(async (req, res) => {
  const { resumeUrl } = req.body;
  if (!resumeUrl) {
    res.status(400);
    throw new Error('resumeUrl is required');
  }

  const profile = await CandidateProfile.findOneAndUpdate(
    { user: req.user._id },
    { resumeUrl },
    { new: true, upsert: true }
  );

  res.json(profile);
});

// @desc Add a document (certificate, ID proof, etc.)
// @route POST /api/candidates/me/documents
const addDocument = asyncHandler(async (req, res) => {
  const { name, url } = req.body;
  if (!name || !url) {
    res.status(400);
    throw new Error('Document name and url are required');
  }

  const profile = await CandidateProfile.findOneAndUpdate(
    { user: req.user._id },
    { $push: { documents: { name, url, uploadedAt: new Date() } } },
    { new: true, upsert: true }
  );

  res.status(201).json(profile);
});

// @desc HR: list / search candidate profiles
// @route GET /api/candidates?skill=&location=&page=&limit=
const listCandidates = asyncHandler(async (req, res) => {
  const { skill, location } = req.query;
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Number(req.query.limit) || 20, 100);

  const filter = {};
  if (skill) filter.skills = { $regex: skill, $options: 'i' };
  if (location) filter.location = { $regex: location, $options: 'i' };

  const [candidates, total] = await Promise.all([
    CandidateProfile.find(filter)
      .populate('user', 'name email phone createdAt')
      .skip((page - 1) * limit)
      .limit(limit),
    CandidateProfile.countDocuments(filter),
  ]);

  res.json({ candidates, page, limit, total, totalPages: Math.ceil(total / limit) });
});

module.exports = {
  getMyProfile,
  upsertMyProfile,
  uploadResume,
  addDocument,
  uploadResumeFile,
  uploadDocumentFile,
  listCandidates,
};
