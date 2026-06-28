/**
 * HITL (Human-in-the-Loop) Super-Agent Controller — v2.0
 *
 * The AI Agent is the "autopilot" of the IMS. HR types natural language and
 * the system proposes an action → HR approves → system executes.
 *
 * Supported actions (16 total):
 *
 *  ┌──────────────────────────────────────────────────────────────────┐
 *  │ RECRUITING WORKFLOW                                              │
 *  ├──────────────────────────────────────────────────────────────────┤
 *  │ CREATE_JOB               — Post a new job                       │
 *  │ CLOSE_JOB                — Close an existing job posting         │
 *  │ SHORTLIST_CANDIDATE      — Move application → Shortlisted        │
 *  │ REJECT_CANDIDATE         — Move application → Rejected           │
 *  │ UPDATE_APPLICATION_STATUS— Generic status transition             │
 *  ├──────────────────────────────────────────────────────────────────┤
 *  │ INTERVIEW MANAGEMENT                                             │
 *  ├──────────────────────────────────────────────────────────────────┤
 *  │ SCHEDULE_INTERVIEW       — Schedule a new interview              │
 *  │ RESCHEDULE_INTERVIEW     — Move to a new date/time               │
 *  │ CANCEL_INTERVIEW         — Cancel a scheduled interview          │
 *  │ ASSIGN_INTERVIEWER       — Add interviewers to a panel           │
 *  ├──────────────────────────────────────────────────────────────────┤
 *  │ OFFER MANAGEMENT                                                 │
 *  ├──────────────────────────────────────────────────────────────────┤
 *  │ CREATE_OFFER             — Generate and send an offer            │
 *  ├──────────────────────────────────────────────────────────────────┤
 *  │ AI-POWERED TASKS                                                 │
 *  ├──────────────────────────────────────────────────────────────────┤
 *  │ RANK_CANDIDATES          — AI-rank candidates for a job          │
 *  │ GENERATE_QUESTIONS       — AI-generate interview questions       │
 *  │ PARSE_RESUME             — AI-extract data from resume text      │
 *  │ ANONYMIZE_RESUME         — Strip PII for blind screening         │
 *  │ SEARCH_CANDIDATES        — Search candidate profiles             │
 *  │ GET_ANALYTICS            — Fetch dashboard KPIs/stats            │
 *  └──────────────────────────────────────────────────────────────────┘
 *
 * Designed for Vercel serverless: fully stateless, no session state between calls.
 */

const asyncHandler = require('express-async-handler');
const { HumanMessage, SystemMessage } = require('@langchain/core/messages');
const { getLLM, safeLLMInvoke } = require('../config/aiConfig');
const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');
const Interview = require('../models/Interview');
const Offer = require('../models/Offer');
const CandidateProfile = require('../models/Candidate');
const InterviewTemplate = require('../models/InterviewTemplate');
const notify = require('../utils/notify');
const { logAction } = require('../utils/audit');
const { pushEvent } = require('../utils/analyticsClient');
const { sendInterviewScheduledEmail, sendOfferReleasedEmail } = require('../services/emailService');
const { createZoomMeeting } = require('../services/videoService');

// ─── Expanded System Prompt ─────────────────────────────────────────────────
const SUPER_AGENT_PROMPT = `You are the IMS Super-Agent — an AI autopilot for an Interview Management System.
You parse HR natural language commands and extract structured action proposals.
You NEVER execute actions — only propose them.

Available actions (use the EXACT action name):

RECRUITING:
- CREATE_JOB: params { title, department, location, employmentType (full-time|part-time|contract|internship), skillsRequired[], description }
- CLOSE_JOB: params { jobTitle }
- SHORTLIST_CANDIDATE: params { candidateName, jobTitle, note? }
- REJECT_CANDIDATE: params { candidateName, jobTitle, reason? }
- UPDATE_APPLICATION_STATUS: params { candidateName, jobTitle, newStatus (Applied|Shortlisted|Interview Scheduled|Selected|Rejected|Offer Released) }
- CHECK_STATUS: params { candidateName, jobTitle? }

INTERVIEWS:
- SCHEDULE_INTERVIEW: params { candidateName, jobTitle, scheduledAt (ISO 8601), durationMinutes?, mode? (video|onsite|phone), interviewerNames?[] }
- RESCHEDULE_INTERVIEW: params { candidateName, newScheduledAt (ISO 8601) }
- CANCEL_INTERVIEW: params { candidateName, jobTitle?, reason? }
- ASSIGN_INTERVIEWER: params { candidateName, jobTitle?, interviewerNames[] }

OFFERS:
- CREATE_OFFER: params { candidateName, jobTitle, salary, designation, joiningDate (ISO 8601) }

AI-POWERED:
- RANK_CANDIDATES: params { jobTitle }
- GENERATE_QUESTIONS: params { jobTitle, round?, focusAreas?[] }
- PARSE_RESUME: params { resumeText }
- ANONYMIZE_RESUME: params { resumeText }
- SEARCH_CANDIDATES: params { skill?, location?, keyword? }
- GET_ANALYTICS: params { metric? (kpi|pipeline|funnel|workload|offers|time-to-hire) }

RULES:
1. Extract the action type and ALL relevant parameters from the user's message.
2. If a date/time is mentioned relatively (e.g., "tomorrow at 3pm"), convert to absolute ISO 8601 UTC using the current time provided.
3. If multiple actions are needed (e.g., "shortlist and schedule interview"), return the FIRST logical action. The user can chain commands.
4. If you cannot determine the action or required parameters, set action to "UNCLEAR" and explain what is missing in the summary.
5. Return ONLY valid JSON — no markdown fences, no explanation outside JSON.

Output format:
{
  "action": "ACTION_TYPE",
  "params": { ... },
  "summary": "Human-readable description of what will happen",
  "confidence": 0.0-1.0,
  "nextSuggestion": "optional — suggest a follow-up command if applicable"
}`;

// ─── Static fallback ────────────────────────────────────────────────────────
const FALLBACK_PROPOSAL = {
  action: 'UNCLEAR',
  params: {},
  summary: 'I\'m currently unable to process your request. Please try again in a moment, or use the dedicated forms in the sidebar.',
  confidence: 0,
  fallback: true,
};

// ═══════════════════════════════════════════════════════════════════════════
// PROPOSE — Parse natural language → structured action proposal
// ═══════════════════════════════════════════════════════════════════════════

const proposeAction = asyncHandler(async (req, res) => {
  const { message } = req.body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    res.status(400);
    throw new Error('message is required');
  }

  const llm = getLLM();

  const result = await safeLLMInvoke(
    async () => {
      const now = new Date().toISOString();
      const response = await llm.invoke([
        new SystemMessage(SUPER_AGENT_PROMPT),
        new HumanMessage(`Current UTC time: ${now}\n\nUser command: "${message.trim()}"`),
      ]);

      let content = response.content || '';
      content = content.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(content);

      if (!parsed.action || !parsed.summary) {
        throw new Error('Invalid LLM response structure');
      }

      return {
        action: parsed.action,
        params: parsed.params || {},
        summary: parsed.summary,
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
        nextSuggestion: parsed.nextSuggestion || null,
        fallback: false,
      };
    },
    FALLBACK_PROPOSAL,
    15000
  );

  await logAction({
    req, action: 'agent_propose', entityType: 'Agent', entityId: null,
    metadata: { userMessage: message, proposedAction: result.action },
  });

  res.json(result);
});

// ═══════════════════════════════════════════════════════════════════════════
// EXECUTE — Perform the approved action
// ═══════════════════════════════════════════════════════════════════════════

const executeAction = asyncHandler(async (req, res) => {
  const { action, params } = req.body;

  if (!action || !params) {
    res.status(400);
    throw new Error('action and params are required');
  }

  // ─── Role Gating for Agent Actions ───
  const userRole = req.user.role;
  const staffActions = [
    'CREATE_JOB', 'CLOSE_JOB', 'SHORTLIST_CANDIDATE', 'REJECT_CANDIDATE', 
    'UPDATE_APPLICATION_STATUS', 'SCHEDULE_INTERVIEW', 'RESCHEDULE_INTERVIEW', 
    'CANCEL_INTERVIEW', 'ASSIGN_INTERVIEWER', 'CREATE_OFFER', 
    'RANK_CANDIDATES', 'GENERATE_QUESTIONS'
  ];

  if (staffActions.includes(action) && userRole === 'candidate') {
    res.status(403);
    throw new Error('Forbidden: Candidates cannot execute recruitment or interview operations');
  }

  if (['CREATE_JOB', 'CLOSE_JOB', 'CREATE_OFFER'].includes(action) && userRole === 'interviewer') {
    res.status(403);
    throw new Error('Forbidden: Interviewers cannot execute job postings or offer generation');
  }

  let result;

  switch (action) {

    case 'CHECK_STATUS': {
      const { candidateName, jobTitle } = params;
      let targetName = candidateName;

      // If the caller is a candidate, they can only view their own status
      if (userRole === 'candidate') {
        targetName = req.user.name;
      }

      const userQuery = { 
        name: { $regex: new RegExp(targetName, 'i') }, 
        role: 'candidate' 
      };
      const users = await User.find(userQuery);

      if (users.length === 0) {
        result = {
          success: false,
          message: `❌ Candidate profile for "${targetName}" not found in the database.`,
        };
        break;
      }

      const userIds = users.map(u => u._id);
      const appQuery = { candidateUser: { $in: userIds } };
      if (jobTitle) {
        // Query matching job too
        const jobsMatched = await Job.find({ title: { $regex: new RegExp(jobTitle, 'i') } });
        if (jobsMatched.length > 0) {
          appQuery.job = { $in: jobsMatched.map(j => j._id) };
        }
      }

      const apps = await Application.find(appQuery)
        .populate('candidateUser', 'name email')
        .populate('job', 'title department');

      if (apps.length === 0) {
        result = {
          success: true,
          message: `ℹ️ Candidate "${targetName}" has registered, but has no applications submitted yet.`,
        };
        break;
      }

      const listStr = apps.map(a => `• **${a.candidateUser?.name}** applied for **${a.job?.title}** - Status: \`${a.status}\``).join('\n');
      result = {
        success: true,
        message: `✅ Candidate status details retrieved:\n\n${listStr}`,
        data: apps
      };
      break;
    }

    // ─────────────────────────────────────────────────────────────────────
    // RECRUITING ACTIONS
    // ─────────────────────────────────────────────────────────────────────

    case 'CREATE_JOB': {
      const { title, department, location, employmentType, skillsRequired, description } = params;
      const job = await Job.create({
        title,
        description: description || `${title} position`,
        department: department || 'General',
        location: location || 'Remote',
        employmentType: employmentType || 'full-time',
        skillsRequired: skillsRequired || [],
        status: 'open',
        postedBy: req.user._id,
      });
      await pushEvent('job_created', { jobId: job._id });
      result = {
        success: true,
        message: `✅ Job "${job.title}" created in ${job.department}`,
        data: { jobId: job._id },
        nextSuggestion: `Try: "Rank candidates for ${job.title}"`,
      };
      break;
    }

    case 'CLOSE_JOB': {
      const { jobTitle } = params;
      const job = await Job.findOne({ title: { $regex: new RegExp(jobTitle, 'i') }, status: 'open' });
      if (!job) { res.status(404); throw new Error(`Open job "${jobTitle}" not found`); }
      job.status = 'closed';
      job.closedAt = new Date();
      await job.save();
      await pushEvent('job_closed', { jobId: job._id });
      result = {
        success: true,
        message: `✅ Job "${job.title}" has been closed`,
        data: { jobId: job._id },
      };
      break;
    }

    case 'SHORTLIST_CANDIDATE': {
      const { candidateName, jobTitle, note } = params;
      const { application, candidate, job } = await resolveApplication(candidateName, jobTitle, res);
      application.pushStatus('Shortlisted', req.user._id, note || 'Shortlisted via AI Agent');
      await application.save();
      await notify({
        user: candidate._id, type: 'status_update', title: 'You\'ve been shortlisted!',
        message: `Great news! Your application for "${job.title}" has been shortlisted.`,
        meta: { applicationId: application._id },
      });
      await pushEvent('candidate_shortlisted', { applicationId: application._id });
      result = {
        success: true,
        message: `✅ ${candidate.name} shortlisted for ${job.title}`,
        data: { applicationId: application._id },
        nextSuggestion: `Try: "Schedule interview for ${candidate.name} for ${job.title} tomorrow at 2pm"`,
      };
      break;
    }

    case 'REJECT_CANDIDATE': {
      const { candidateName, jobTitle, reason } = params;
      const { application, candidate, job } = await resolveApplication(candidateName, jobTitle, res);
      application.pushStatus('Rejected', req.user._id, reason || 'Rejected via AI Agent');
      await application.save();
      await notify({
        user: candidate._id, type: 'status_update', title: 'Application update',
        message: `Your application for "${job.title}" has been updated.`,
        meta: { applicationId: application._id },
      });
      await pushEvent('candidate_rejected', { applicationId: application._id });
      result = {
        success: true,
        message: `✅ ${candidate.name}'s application for ${job.title} marked as Rejected`,
        data: { applicationId: application._id },
      };
      break;
    }

    case 'UPDATE_APPLICATION_STATUS': {
      const { candidateName, jobTitle, newStatus } = params;
      const { application, candidate, job } = await resolveApplication(candidateName, jobTitle, res);
      application.pushStatus(newStatus, req.user._id, 'Updated via AI Agent');
      await application.save();
      await notify({
        user: candidate._id, type: 'status_update', title: 'Application status updated',
        message: `Your application for "${job.title}" is now "${newStatus}".`,
        meta: { applicationId: application._id, status: newStatus },
      });
      result = {
        success: true,
        message: `✅ ${candidate.name} → ${job.title} status updated to "${newStatus}"`,
        data: { applicationId: application._id },
      };
      break;
    }

    // ─────────────────────────────────────────────────────────────────────
    // INTERVIEW ACTIONS
    // ─────────────────────────────────────────────────────────────────────

    case 'SCHEDULE_INTERVIEW': {
      const { candidateName, jobTitle, scheduledAt, durationMinutes, mode, interviewerNames } = params;
      const { application, candidate, job } = await resolveApplication(candidateName, jobTitle, res);

      // Resolve interviewer IDs from names
      let interviewerIds = [];
      if (Array.isArray(interviewerNames) && interviewerNames.length) {
        for (const name of interviewerNames) {
          const interviewer = await User.findOne({
            name: { $regex: new RegExp(name, 'i') },
            role: { $in: ['interviewer', 'hr', 'admin'] },
          });
          if (interviewer) interviewerIds.push(interviewer._id);
        }
      }

      // Auto-generate Zoom meeting link
      let meetingLink = null;
      try {
        meetingLink = await createZoomMeeting({
          topic: `${job.title} – Interview with ${candidate.name}`,
          startTime: scheduledAt,
          duration: durationMinutes || 45,
          hostId: req.user._id,
        });
      } catch (e) {
        console.warn('[Agent] Zoom link generation failed:', e.message);
      }

      const interview = await Interview.create({
        application: application._id,
        round: (application.currentRound || 0) + 1,
        scheduledAt: new Date(scheduledAt),
        durationMinutes: durationMinutes || 45,
        mode: mode || 'video',
        meetingLink,
        scheduledBy: req.user._id,
        interviewers: interviewerIds,
      });

      application.pushStatus('Interview Scheduled', req.user._id, 'Scheduled via AI Agent');
      application.currentRound = interview.round;
      await application.save();

      await notify({
        user: candidate._id, type: 'interview_reminder', title: 'Interview scheduled',
        message: `Your interview for "${job.title}" (Round ${interview.round}) is on ${new Date(scheduledAt).toLocaleString()}.`,
        meta: { interviewId: interview._id },
      });
      await sendInterviewScheduledEmail(candidate.email, job.title, scheduledAt);

      for (const ivId of interviewerIds) {
        await notify({
          user: ivId, type: 'interview_reminder', title: 'Interview assigned',
          message: `You've been assigned to interview ${candidate.name} for ${job.title}.`,
          meta: { interviewId: interview._id },
        });
      }

      await pushEvent('interview_scheduled', { interviewId: interview._id });

      result = {
        success: true,
        message: `✅ Interview scheduled: ${candidate.name} for ${job.title} on ${new Date(scheduledAt).toLocaleString()}${meetingLink ? `\n🔗 Zoom: ${meetingLink}` : ''}${interviewerIds.length ? `\n👥 ${interviewerIds.length} interviewer(s) assigned` : ''}`,
        data: { interviewId: interview._id, meetingLink },
        nextSuggestion: `Try: "Generate interview questions for ${job.title}"`,
      };
      break;
    }

    case 'RESCHEDULE_INTERVIEW': {
      const { candidateName, newScheduledAt } = params;
      const candidate = await findCandidate(candidateName, res);
      const applications = await Application.find({ candidate: candidate._id });
      const appIds = applications.map((a) => a._id);
      const interview = await Interview.findOne({
        application: { $in: appIds },
        status: { $in: ['scheduled', 'rescheduled'] },
      }).sort({ scheduledAt: -1 });
      if (!interview) { res.status(404); throw new Error(`No upcoming interview found for "${candidateName}"`); }

      interview.rescheduledFrom = interview.scheduledAt;
      interview.scheduledAt = new Date(newScheduledAt);
      interview.status = 'rescheduled';
      await interview.save();

      await notify({
        user: candidate._id, type: 'interview_reminder', title: 'Interview rescheduled',
        message: `Your interview has been moved to ${new Date(newScheduledAt).toLocaleString()}.`,
        meta: { interviewId: interview._id },
      });
      await sendInterviewScheduledEmail(candidate.email, 'Interview', newScheduledAt, true);
      await pushEvent('interview_rescheduled', { interviewId: interview._id });

      result = {
        success: true,
        message: `✅ Interview for ${candidate.name} rescheduled to ${new Date(newScheduledAt).toLocaleString()}`,
        data: { interviewId: interview._id },
      };
      break;
    }

    case 'CANCEL_INTERVIEW': {
      const { candidateName, jobTitle, reason } = params;
      const candidate = await findCandidate(candidateName, res);
      const filter = { status: { $in: ['scheduled', 'rescheduled'] } };

      if (jobTitle) {
        const job = await Job.findOne({ title: { $regex: new RegExp(jobTitle, 'i') } });
        if (job) {
          const apps = await Application.find({ candidate: candidate._id, job: job._id });
          filter.application = { $in: apps.map((a) => a._id) };
        }
      } else {
        const apps = await Application.find({ candidate: candidate._id });
        filter.application = { $in: apps.map((a) => a._id) };
      }

      const interview = await Interview.findOne(filter).sort({ scheduledAt: -1 });
      if (!interview) { res.status(404); throw new Error(`No upcoming interview found for "${candidateName}"`); }

      interview.status = 'cancelled';
      await interview.save();

      await notify({
        user: candidate._id, type: 'interview_reminder', title: 'Interview cancelled',
        message: `Your upcoming interview has been cancelled.${reason ? ` Reason: ${reason}` : ''}`,
        meta: { interviewId: interview._id },
      });
      await pushEvent('interview_cancelled', { interviewId: interview._id });

      result = {
        success: true,
        message: `✅ Interview for ${candidate.name} has been cancelled${reason ? ` (${reason})` : ''}`,
        data: { interviewId: interview._id },
      };
      break;
    }

    case 'ASSIGN_INTERVIEWER': {
      const { candidateName, jobTitle, interviewerNames } = params;
      if (!Array.isArray(interviewerNames) || !interviewerNames.length) {
        res.status(400); throw new Error('interviewerNames[] is required');
      }

      const candidate = await findCandidate(candidateName, res);
      const filter = { status: { $in: ['scheduled', 'rescheduled'] } };
      const apps = await Application.find({ candidate: candidate._id });
      filter.application = { $in: apps.map((a) => a._id) };

      const interview = await Interview.findOne(filter).sort({ scheduledAt: -1 });
      if (!interview) { res.status(404); throw new Error(`No upcoming interview found for "${candidateName}"`); }

      const assignedNames = [];
      for (const name of interviewerNames) {
        const interviewer = await User.findOne({
          name: { $regex: new RegExp(name, 'i') },
          role: { $in: ['interviewer', 'hr', 'admin'] },
        });
        if (interviewer && !interview.interviewers.some((id) => id.toString() === interviewer._id.toString())) {
          interview.interviewers.push(interviewer._id);
          assignedNames.push(interviewer.name);
          await notify({
            user: interviewer._id, type: 'interview_reminder', title: 'Panel assignment',
            message: `You've been added to the interview panel for ${candidate.name}.`,
            meta: { interviewId: interview._id },
          });
        }
      }
      await interview.save();
      await pushEvent('interviewer_assigned', { interviewId: interview._id, count: assignedNames.length });

      result = {
        success: true,
        message: `✅ Assigned ${assignedNames.length} interviewer(s) to ${candidate.name}'s interview: ${assignedNames.join(', ')}`,
        data: { interviewId: interview._id, assignedNames },
      };
      break;
    }

    // ─────────────────────────────────────────────────────────────────────
    // OFFER ACTIONS
    // ─────────────────────────────────────────────────────────────────────

    case 'CREATE_OFFER': {
      const { candidateName, jobTitle, salary, designation, joiningDate } = params;
      const { application, candidate, job } = await resolveApplication(candidateName, jobTitle, res);

      const offer = await Offer.create({
        application: application._id,
        salary: salary || 'As discussed',
        designation: designation || job.title,
        joiningDate: new Date(joiningDate || Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      application.pushStatus('Offer Released', req.user._id, 'Offer created via AI Agent');
      await application.save();

      await notify({
        user: candidate._id, type: 'offer', title: 'Offer letter released 🎉',
        message: `Congratulations! You've been offered the position of ${designation || job.title}.`,
        meta: { offerId: offer._id },
      });
      await sendOfferReleasedEmail(candidate.email, job.title, designation || job.title);
      await pushEvent('offer_released', { offerId: offer._id });

      result = {
        success: true,
        message: `✅ Offer created for ${candidate.name}: ${designation || job.title} at ${salary || 'TBD'}, joining ${new Date(joiningDate || Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}`,
        data: { offerId: offer._id },
      };
      break;
    }

    // ─────────────────────────────────────────────────────────────────────
    // AI-POWERED ACTIONS
    // ─────────────────────────────────────────────────────────────────────

    case 'RANK_CANDIDATES': {
      const { jobTitle } = params;
      const job = await Job.findOne({ title: { $regex: new RegExp(jobTitle, 'i') } });
      if (!job) { res.status(404); throw new Error(`Job "${jobTitle}" not found`); }

      const applications = await Application.find({ job: job._id }).select('candidate');
      const candidateIds = applications.map((a) => a.candidate);
      const profiles = await CandidateProfile.find({ user: { $in: candidateIds } }).populate('user', 'name email');

      if (!profiles.length) {
        result = { success: true, message: `No candidate profiles found for ${job.title}`, data: { rankings: [] } };
        break;
      }

      const llm = getLLM();
      const candidateSummaries = profiles.slice(0, 15).map((p) => ({
        id: p.user?._id?.toString(), name: p.user?.name, skills: p.skills || [],
        experienceYears: p.experienceYears || 0, headline: p.headline || '',
      }));

      const rankResult = await safeLLMInvoke(async () => {
        const response = await llm.invoke([
          new SystemMessage('You are a candidate ranking engine. Rank these candidates by job fit. Output JSON: { "rankings": [{ "candidateName": "string", "matchScore": 0-100, "rationale": "string" }], "summary": "string" }'),
          new HumanMessage(`Job: ${job.title}\nSkills Required: ${(job.skillsRequired || []).join(', ')}\nDescription: ${(job.description || '').substring(0, 2000)}\n\nCandidates:\n${JSON.stringify(candidateSummaries)}`),
        ]);
        let c = response.content.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
        return JSON.parse(c);
      }, { rankings: [], summary: 'Unable to rank at this time.' }, 25000);

      result = {
        success: true,
        message: `✅ Ranked ${profiles.length} candidates for ${job.title}:\n${(rankResult.rankings || []).slice(0, 5).map((r, i) => `  ${i + 1}. ${r.candidateName} — ${r.matchScore}% match`).join('\n')}`,
        data: rankResult,
        nextSuggestion: `Try: "Shortlist the top candidate for ${job.title}"`,
      };
      break;
    }

    case 'GENERATE_QUESTIONS': {
      const { jobTitle, round, focusAreas } = params;
      const job = await Job.findOne({ title: { $regex: new RegExp(jobTitle, 'i') } });
      if (!job) { res.status(404); throw new Error(`Job "${jobTitle}" not found`); }

      const llm = getLLM();
      const questionsResult = await safeLLMInvoke(async () => {
        const response = await llm.invoke([
          new SystemMessage('Generate 8-10 interview questions. Output JSON array: [{ "question": "string", "category": "technical|behavioral|situational|culture-fit", "difficulty": "easy|medium|hard" }]'),
          new HumanMessage(`Job: ${job.title}\nSkills: ${(job.skillsRequired || []).join(', ')}\nRound: ${round || 'General'}\nFocus: ${(focusAreas || []).join(', ') || 'all-around'}\nDescription: ${(job.description || '').substring(0, 2000)}`),
        ]);
        let c = response.content.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
        return JSON.parse(c);
      }, [], 20000);

      const questions = Array.isArray(questionsResult) ? questionsResult : [];
      result = {
        success: true,
        message: `✅ Generated ${questions.length} interview questions for ${job.title}:\n${questions.slice(0, 3).map((q, i) => `  ${i + 1}. [${q.category}] ${q.question}`).join('\n')}${questions.length > 3 ? `\n  ... and ${questions.length - 3} more` : ''}`,
        data: { questions, jobTitle: job.title },
      };
      break;
    }

    case 'PARSE_RESUME': {
      const { resumeText } = params;
      if (!resumeText) { res.status(400); throw new Error('resumeText is required'); }

      const { RESUME_PARSER_SYSTEM_PROMPT } = require('../config/aiConfig');
      const llm = getLLM();
      const parsed = await safeLLMInvoke(async () => {
        const response = await llm.invoke([
          new SystemMessage(RESUME_PARSER_SYSTEM_PROMPT),
          new HumanMessage(resumeText.substring(0, 8000)),
        ]);
        let c = response.content.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
        return JSON.parse(c);
      }, { name: null, skills: [], fallback: true }, 20000);

      result = {
        success: true,
        message: `✅ Resume parsed: ${parsed.name || 'Unknown'}\n  Skills: ${(parsed.skills || []).join(', ')}\n  Experience: ${parsed.experienceYears || 'N/A'} years`,
        data: parsed,
      };
      break;
    }

    case 'ANONYMIZE_RESUME': {
      const { resumeText } = params;
      if (!resumeText) { res.status(400); throw new Error('resumeText is required'); }

      const llm = getLLM();
      const anonResult = await safeLLMInvoke(async () => {
        const response = await llm.invoke([
          new SystemMessage('Anonymize this resume: remove names, emails, phones, university names (replace with [University]), company names (replace with [Company A], [Company B]). Keep skills, experience, and achievements.'),
          new HumanMessage(resumeText.substring(0, 8000)),
        ]);
        return { anonymizedText: response.content };
      }, { anonymizedText: 'Unable to anonymize.' }, 20000);

      result = {
        success: true,
        message: `✅ Resume anonymized for blind screening (${anonResult.anonymizedText.length} characters)`,
        data: anonResult,
      };
      break;
    }

    case 'SEARCH_CANDIDATES': {
      const { skill, location, keyword } = params;
      const filter = {};
      if (skill) filter.skills = { $regex: skill, $options: 'i' };
      if (location) filter.location = { $regex: location, $options: 'i' };

      const profiles = await CandidateProfile.find(filter)
        .populate('user', 'name email')
        .limit(20);

      result = {
        success: true,
        message: `✅ Found ${profiles.length} candidate(s)${skill ? ` with skill "${skill}"` : ''}${location ? ` in "${location}"` : ''}:\n${profiles.slice(0, 5).map((p) => `  • ${p.user?.name || 'Unknown'} — ${(p.skills || []).slice(0, 5).join(', ')}`).join('\n')}${profiles.length > 5 ? `\n  ... and ${profiles.length - 5} more` : ''}`,
        data: { candidates: profiles, total: profiles.length },
      };
      break;
    }

    case 'GET_ANALYTICS': {
      const { metric } = params;
      const Application = require('../models/Application');
      const Interview = require('../models/Interview');
      const Offer = require('../models/Offer');

      const [totalApps, activeInterviews, pendingOffers, openJobs] = await Promise.all([
        Application.countDocuments(),
        Interview.countDocuments({ status: 'scheduled' }),
        Offer.countDocuments({ status: 'pending' }),
        Job.countDocuments({ status: 'open' }),
      ]);

      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
      const newThisWeek = await Application.countDocuments({ createdAt: { $gte: weekAgo } });

      result = {
        success: true,
        message: `📊 IMS Dashboard KPIs:\n  📋 Total Applications: ${totalApps}\n  🎯 Active Interviews: ${activeInterviews}\n  📨 Pending Offers: ${pendingOffers}\n  💼 Open Positions: ${openJobs}\n  📈 New This Week: ${newThisWeek}`,
        data: { totalApps, activeInterviews, pendingOffers, openJobs, newThisWeek },
      };
      break;
    }

    default:
      res.status(400);
      throw new Error(`Unknown action: "${action}". Type any natural language command and I'll figure out what to do!`);
  }

  await logAction({
    req, action: 'agent_execute', entityType: 'Agent', entityId: null,
    metadata: { executedAction: action, params, result: result.message },
  });

  res.json(result);
});

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

async function findCandidate(name, res) {
  const candidate = await User.findOne({
    name: { $regex: new RegExp(name, 'i') },
    role: 'candidate',
  });
  if (!candidate) { res.status(404); throw new Error(`Candidate "${name}" not found`); }
  return candidate;
}

async function resolveApplication(candidateName, jobTitle, res) {
  const candidate = await findCandidate(candidateName, res);

  const job = await Job.findOne({ title: { $regex: new RegExp(jobTitle, 'i') } });
  if (!job) { res.status(404); throw new Error(`Job "${jobTitle}" not found`); }

  let application = await Application.findOne({ candidate: candidate._id, job: job._id });
  if (!application) {
    // Auto-create application if it doesn't exist (agent convenience)
    application = await Application.create({
      candidate: candidate._id,
      job: job._id,
      status: 'Applied',
      statusHistory: [{ status: 'Applied', changedBy: candidate._id }],
    });
  }

  return { application, candidate, job };
}

// ═══════════════════════════════════════════════════════════════════════════
// CHAT — Conversational agent (multi-turn)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @desc  Chat with the agent — processes natural language in multi-turn context.
 * @route POST /api/agent/chat
 * @body  { message: string, history?: [{ role, content }] }
 */
const chatWithAgent = asyncHandler(async (req, res) => {
  const { message, history } = req.body;

  if (!message || typeof message !== 'string') {
    res.status(400);
    throw new Error('message is required');
  }

  const llm = getLLM();

  const chatSystemPrompt = `You are IMS Assistant — a friendly, professional AI assistant for the Interview Management System.
You help HR managers, recruiters, and admins with their daily recruitment tasks.

You can:
- Answer questions about how to use the system
- Explain recruitment best practices
- Help interpret analytics data
- Suggest next steps in the hiring workflow
- Provide tips for interviewing and evaluation

If the user wants to PERFORM an action (schedule, create, update, etc.), tell them to use the Agent Command Center or suggest the exact command they should type.

Current user: ${req.user.name} (${req.user.role})
Current time: ${new Date().toISOString()}

Keep responses concise, helpful, and professional. Use emojis sparingly for warmth.`;

  const chatResult = await safeLLMInvoke(
    async () => {
      const messages = [new SystemMessage(chatSystemPrompt)];

      if (Array.isArray(history)) {
        for (const msg of history.slice(-8)) {
          if (msg.role === 'user') messages.push(new HumanMessage(msg.content));
          else if (msg.role === 'assistant') messages.push(new SystemMessage(`[Previous reply]: ${msg.content}`));
        }
      }

      messages.push(new HumanMessage(message.trim()));
      const response = await llm.invoke(messages);
      return response.content || "I'm here to help! What would you like to know?";
    },
    "I'm temporarily unable to connect. Please try again in a moment!",
    12000
  );

  res.json({ reply: chatResult });
});

module.exports = { proposeAction, executeAction, chatWithAgent };
