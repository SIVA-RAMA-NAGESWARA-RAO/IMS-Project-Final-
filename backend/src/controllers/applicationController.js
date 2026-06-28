const asyncHandler = require('express-async-handler');
const Application = require('../models/Application');
const Job = require('../models/Job');
const notify = require('../utils/notify');
const { pushEvent } = require('../utils/analyticsClient');
const { logAction } = require('../utils/audit');
const { sendApplicationSubmittedEmail, sendStatusUpdateEmail } = require('../services/emailService');

// @desc Candidate applies to a job (Module 4)
// @route POST /api/applications
const applyToJob = asyncHandler(async (req, res) => {
  const { jobId, resumeSnapshotUrl, resumeText, coverNote } = req.body;

  const job = await Job.findById(jobId);
  if (!job || job.status !== 'open') {
    res.status(400);
    throw new Error('This job is not currently accepting applications');
  }

  const exists = await Application.findOne({ candidate: req.user._id, job: jobId });
  if (exists) {
    res.status(409);
    throw new Error('You have already applied to this job');
  }

  // --- AI Candidate Profiling (Smart Screening) ---
  let aiMatchScore = null;
  let anonymizedResumeText = null;
  
  if (resumeText) {
    try {
      const { getLLM, safeLLMInvoke } = require('../config/aiConfig');
      const { SystemMessage, HumanMessage } = require('@langchain/core/messages');
      const llm = getLLM();
      
      const aiResult = await safeLLMInvoke(async () => {
        const response = await llm.invoke([
          new SystemMessage(`You are an expert HR AI. Extract skills and anonymize this resume (redact name, email, phone, university names). Then compare the candidate's skills with the Job Requirements. Output valid JSON: { "matchScore": <number 0-100>, "anonymizedText": "<string>", "extractedSkills": ["<string>"] }`),
          new HumanMessage(`Job Requirements:\n${job.skillsRequired.join(', ')}\n${job.description}\n\nCandidate Resume:\n${resumeText.substring(0, 8000)}`)
        ]);
        let c = response.content.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
        return JSON.parse(c);
      }, null, 25000);
      
      if (aiResult) {
        aiMatchScore = aiResult.matchScore;
        anonymizedResumeText = aiResult.anonymizedText;
        
        // Update Candidate Profile with extracted skills silently
        const CandidateProfile = require('../models/Candidate');
        await CandidateProfile.findOneAndUpdate(
          { user: req.user._id }, 
          { $addToSet: { skills: { $each: aiResult.extractedSkills || [] } } }
        );
      }
    } catch (e) {
      console.warn('[AI Matcher] Failed to score resume:', e.message);
    }
  }

  const application = await Application.create({
    candidate: req.user._id,
    job: jobId,
    resumeSnapshotUrl,
    anonymizedResumeText,
    aiMatchScore,
    coverNote,
    status: (aiMatchScore && aiMatchScore >= 85) ? 'Shortlisted' : 'Applied',
    statusHistory: [{ status: (aiMatchScore && aiMatchScore >= 85) ? 'Shortlisted' : 'Applied', changedBy: req.user._id }],
  });

  await sendApplicationSubmittedEmail(req.user.email, job.title);
  await logAction({ req, action: 'application_created', entityType: 'Application', entityId: application._id });
  await pushEvent('application_created', { applicationId: application._id, jobId, candidateId: req.user._id, aiMatchScore });

  res.status(201).json(application);
});

// @desc Candidate: view my applications (Module 1 — candidate dashboard)
// @route GET /api/applications/mine
const myApplications = asyncHandler(async (req, res) => {
  const applications = await Application.find({ candidate: req.user._id })
    .populate('job', 'title department location status')
    .sort({ createdAt: -1 });
  res.json(applications);
});

// @desc HR: review/list applications, optionally filtered by job or status (Module 4)
// @route GET /api/applications?jobId=&status=&page=&limit=
const listApplications = asyncHandler(async (req, res) => {
  const { jobId, status } = req.query;
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Number(req.query.limit) || 20, 100);

  const filter = {};
  if (jobId) filter.job = jobId;
  if (status) filter.status = status;

  const [applications, total] = await Promise.all([
    Application.find(filter)
      .populate('candidate', 'name email phone')
      .populate('job', 'title department')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Application.countDocuments(filter),
  ]);

  res.json({ applications, page, limit, total, totalPages: Math.ceil(total / limit) });
});

// @desc Get a single application with full status history
// @route GET /api/applications/:id
const getApplication = asyncHandler(async (req, res) => {
  const application = await Application.findById(req.params.id)
    .populate('candidate', 'name email phone')
    .populate('job', 'title department location')
    .populate('statusHistory.changedBy', 'name role');

  if (!application) {
    res.status(404);
    throw new Error('Application not found');
  }
  res.json(application);
});

// @desc HR: shortlist / reject / update an application's status directly (Module 4 & 8)
// @route PATCH /api/applications/:id/status
const updateStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  const application = await Application.findById(req.params.id).populate('candidate', 'name email').populate('job', 'title');

  if (!application) {
    res.status(404);
    throw new Error('Application not found');
  }

  application.pushStatus(status, req.user._id, note);
  await application.save();

  await notify({
    user: application.candidate._id,
    type: 'status_update',
    title: 'Application status updated',
    message: `Your application status changed to "${status}".`,
    meta: { applicationId: application._id, status },
  });

  await sendStatusUpdateEmail(application.candidate.email, application.job.title, status);
  await logAction({
    req,
    action: 'application_status_changed',
    entityType: 'Application',
    entityId: application._id,
    metadata: { status },
  });

  await pushEvent('application_status_changed', {
    applicationId: application._id,
    status,
    changedBy: req.user._id,
  });

  res.json(application);
});

// @desc Public candidate application submission (Module 4)
// @route POST /api/applications/apply
const applyToJobPublic = asyncHandler(async (req, res) => {
  const { jobId, candidate, resumeSnapshotUrl, resumeText, coverNote } = req.body;

  if (!jobId || !candidate || !candidate.email || !candidate.name) {
    res.status(400);
    throw new Error('jobId, candidate name, and candidate email are required');
  }

  const job = await Job.findById(jobId);
  if (!job || job.status !== 'open') {
    res.status(400);
    throw new Error('This job is not currently accepting applications');
  }

  const User = require('../models/User');
  const CandidateProfile = require('../models/Candidate');
  const crypto = require('crypto');

  let user = await User.findOne({ email: candidate.email.toLowerCase() });
  if (user) {
    if (user.role !== 'candidate') {
      res.status(403);
      throw new Error('This email is associated with a staff account and cannot be used to apply');
    }
  } else {
    // Auto-create Candidate User account
    const tempPassword = crypto.randomBytes(16).toString('hex');
    user = await User.create({
      name: candidate.name,
      email: candidate.email.toLowerCase(),
      password: tempPassword,
      phone: candidate.phone,
      role: 'candidate',
      isVerified: true, // Auto-verify email upon applying
      isActive: true,
    });
  }

  // Ensure Candidate Profile exists
  let profile = await CandidateProfile.findOne({ user: user._id });
  if (!profile) {
    profile = await CandidateProfile.create({
      user: user._id,
      resumeUrl: resumeSnapshotUrl,
      headline: `${job.title} applicant`,
      location: job.location,
    });
  } else if (resumeSnapshotUrl) {
    profile.resumeUrl = resumeSnapshotUrl;
    await profile.save();
  }

  const exists = await Application.findOne({ candidate: user._id, job: jobId });
  if (exists) {
    res.status(409);
    throw new Error('You have already applied to this job');
  }

  // --- AI Candidate Profiling (Smart Screening) ---
  let aiMatchScore = null;
  let anonymizedResumeText = null;
  
  if (resumeText) {
    try {
      const { getLLM, safeLLMInvoke } = require('../config/aiConfig');
      const { SystemMessage, HumanMessage } = require('@langchain/core/messages');
      const llm = getLLM();
      
      const aiResult = await safeLLMInvoke(async () => {
        const response = await llm.invoke([
          new SystemMessage(`You are an expert HR AI. Extract skills and anonymize this resume (redact name, email, phone, university names). Then compare the candidate's skills with the Job Requirements. Output valid JSON: { "matchScore": <number 0-100>, "anonymizedText": "<string>", "extractedSkills": ["<string>"] }`),
          new HumanMessage(`Job Requirements:\n${job.skillsRequired.join(', ')}\n${job.description}\n\nCandidate Resume:\n${resumeText.substring(0, 8000)}`)
        ]);
        let c = response.content.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
        return JSON.parse(c);
      }, null, 25000);
      
      if (aiResult) {
        aiMatchScore = aiResult.matchScore;
        anonymizedResumeText = aiResult.anonymizedText;
        
        // Update Candidate Profile with extracted skills silently
        await CandidateProfile.findOneAndUpdate(
          { user: user._id }, 
          { $addToSet: { skills: { $each: aiResult.extractedSkills || [] } } }
        );
      }
    } catch (e) {
      console.warn('[AI Matcher] Failed to score resume:', e.message);
    }
  }

  const application = await Application.create({
    candidate: user._id,
    job: jobId,
    resumeSnapshotUrl,
    anonymizedResumeText,
    aiMatchScore,
    coverNote,
  });

  // Notify + Email
  const hrUsers = await User.find({ role: 'hr' });
  for (const hr of hrUsers) {
    try {
      await notify({
        user: hr._id,
        type: 'system_alert',
        title: 'New Job Application',
        message: `New application for "${job.title}" by ${user.name}`,
        meta: { applicationId: application._id },
      });
    } catch (err) {
      console.error(`Failed to notify HR user ${hr._id}:`, err.message);
    }
  }

  await sendApplicationSubmittedEmail(user.email, job.title);

  await logAction({
    req,
    user: user._id,
    action: 'application_submitted_public',
    entityType: 'Application',
    entityId: application._id,
  });

  await pushEvent('application_submitted', {
    applicationId: application._id,
    jobId,
    candidateId: user._id,
  });

  res.status(201).json(application);
});

// @desc Public resume upload helper (Module 4)
// @route POST /api/applications/upload-resume
const uploadResumePublic = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('No file uploaded');
  }
  const { uploadFile } = require('../utils/fileUpload');
  const fileUrl = await uploadFile(req.file, 'ims/resumes');
  res.status(201).json({ url: fileUrl });
});

module.exports = {
  applyToJob,
  myApplications,
  listApplications,
  getApplication,
  updateStatus,
  applyToJobPublic,
  uploadResumePublic
};
