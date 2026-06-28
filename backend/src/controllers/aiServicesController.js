/**
 * AI-Powered Services Controller — Professional IMS AI Use Cases.
 *
 * 1. Resume Parser         — Extract structured data from raw resume text
 * 2. Resume Anonymizer      — Strip PII/bias markers for blind screening
 * 3. Scorecard Draft        — Auto-generate a scorecard from interview notes
 * 4. Interview Questions    — Generate tailored questions per job + round
 * 5. Candidate Ranking      — AI-score candidates against job requirements
 *
 * All powered by Groq Llama-3 (free tier) via the shared aiConfig module.
 */

const asyncHandler = require('express-async-handler');
const { HumanMessage, SystemMessage } = require('@langchain/core/messages');
const { getLLM, safeLLMInvoke, RESUME_PARSER_SYSTEM_PROMPT } = require('../config/aiConfig');
const CandidateProfile = require('../models/Candidate');
const Job = require('../models/Job');
const Application = require('../models/Application');
const InterviewTemplate = require('../models/InterviewTemplate');
const { logAction } = require('../utils/audit');

// ═══════════════════════════════════════════════════════════════════════════
// 1. AI RESUME PARSER
// ═══════════════════════════════════════════════════════════════════════════

const RESUME_FALLBACK = {
  name: null, email: null, phone: null, skills: [], experienceYears: null,
  education: [], headline: null, location: null, fallback: true,
};

/**
 * @desc  Parse raw resume text → structured JSON using AI.
 * @route POST /api/ai/services/parse-resume
 * @body  { resumeText: string }
 */
const parseResume = asyncHandler(async (req, res) => {
  const { resumeText } = req.body;
  if (!resumeText || typeof resumeText !== 'string') {
    res.status(400);
    throw new Error('resumeText is required');
  }

  const llm = getLLM();

  const result = await safeLLMInvoke(
    async () => {
      const response = await llm.invoke([
        new SystemMessage(RESUME_PARSER_SYSTEM_PROMPT),
        new HumanMessage(resumeText.substring(0, 8000)),  // Cap input to avoid token overflow
      ]);

      let content = response.content || '';
      content = content.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(content);

      return { ...parsed, fallback: false };
    },
    RESUME_FALLBACK,
    20000
  );

  // Optionally auto-update the candidate profile if the user is a candidate
  if (req.user.role === 'candidate' && !result.fallback && req.query.autoSave === 'true') {
    const updateData = {};
    if (result.skills?.length) updateData.skills = result.skills;
    if (result.experienceYears) updateData.experienceYears = result.experienceYears;
    if (result.headline) updateData.headline = result.headline;
    if (result.location) updateData.location = result.location;
    if (result.education?.length) updateData.education = result.education;

    if (Object.keys(updateData).length) {
      await CandidateProfile.findOneAndUpdate(
        { user: req.user._id },
        updateData,
        { upsert: true, new: true }
      );
    }
  }

  await logAction({ req, action: 'ai_resume_parsed', entityType: 'AI', entityId: null });
  res.json(result);
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. AI RESUME ANONYMIZER (Blind Screening)
// ═══════════════════════════════════════════════════════════════════════════

const ANONYMIZER_PROMPT = `You are a resume anonymizer for bias-free recruitment.

TASK: Remove ALL personally identifiable information (PII) and bias indicators from the resume text below, then return the cleaned version.

REMOVE or REPLACE:
- Full name → "Candidate"
- Email addresses → "[email redacted]"
- Phone numbers → "[phone redacted]"
- Physical addresses → "[location redacted]"
- Gender indicators (he/she/him/her, Mr./Mrs./Ms.) → gender-neutral
- Age / date of birth → remove
- University names → "[University]" (to prevent prestige bias)
- Company names → "[Company A]", "[Company B]", etc. (sequential)
- Photos / links to social media → remove
- Nationality / ethnicity / religion references → remove
- Marital status → remove

KEEP INTACT:
- Skills and technologies
- Years of experience (number only, not dates)
- Job titles and responsibilities
- Certifications (name only, not institution)
- Project descriptions

Return ONLY the anonymized resume text. No JSON, no explanation.`;

const ANONYMIZER_FALLBACK = { anonymizedText: 'Unable to anonymize resume. Please try again.', fallback: true };

/**
 * @desc  Strip PII/bias from resume for blind screening.
 * @route POST /api/ai/services/anonymize-resume
 * @body  { resumeText: string }
 */
const anonymizeResume = asyncHandler(async (req, res) => {
  const { resumeText } = req.body;
  if (!resumeText || typeof resumeText !== 'string') {
    res.status(400);
    throw new Error('resumeText is required');
  }

  const llm = getLLM();

  const result = await safeLLMInvoke(
    async () => {
      const response = await llm.invoke([
        new SystemMessage(ANONYMIZER_PROMPT),
        new HumanMessage(resumeText.substring(0, 8000)),
      ]);
      return { anonymizedText: response.content || '', fallback: false };
    },
    ANONYMIZER_FALLBACK,
    20000
  );

  await logAction({ req, action: 'ai_resume_anonymized', entityType: 'AI', entityId: null });
  res.json(result);
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. AI SCORECARD DRAFT GENERATOR
// ═══════════════════════════════════════════════════════════════════════════

const SCORECARD_DRAFT_PROMPT = `You are an interview evaluation assistant. Based on the interviewer's raw notes and the evaluation competencies, generate a structured scorecard draft.

For each competency, assign a rating (1-5) and a brief justification based on the notes.
Also provide:
- overallRating (1-5)
- recommendation (select | reject | hold)
- strengths (summary)
- concerns (summary)

Output ONLY valid JSON:
{
  "competencies": [
    { "name": "string", "rating": 1-5, "notes": "justification" }
  ],
  "overallRating": 1-5,
  "recommendation": "select|reject|hold",
  "strengths": "string",
  "concerns": "string",
  "cultureFitRating": 1-5,
  "communicationRating": 1-5
}`;

const SCORECARD_FALLBACK = {
  competencies: [], overallRating: 3, recommendation: 'hold',
  strengths: '', concerns: '', fallback: true,
};

/**
 * @desc  Generate a scorecard draft from interview notes + competencies.
 * @route POST /api/ai/services/draft-scorecard
 * @body  { interviewNotes: string, competencies: string[], jobTitle?: string }
 */
const draftScorecard = asyncHandler(async (req, res) => {
  const { interviewNotes, competencies, jobTitle } = req.body;
  if (!interviewNotes || typeof interviewNotes !== 'string') {
    res.status(400);
    throw new Error('interviewNotes is required');
  }

  const compList = Array.isArray(competencies) && competencies.length
    ? competencies
    : ['Problem Solving', 'Technical Skills', 'Communication', 'Culture Fit', 'Leadership'];

  const llm = getLLM();

  const result = await safeLLMInvoke(
    async () => {
      const response = await llm.invoke([
        new SystemMessage(SCORECARD_DRAFT_PROMPT),
        new HumanMessage(
          `Job: ${jobTitle || 'Not specified'}
Competencies to evaluate: ${compList.join(', ')}

Interviewer's raw notes:
${interviewNotes.substring(0, 6000)}`
        ),
      ]);

      let content = response.content || '';
      content = content.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
      return { ...JSON.parse(content), fallback: false };
    },
    SCORECARD_FALLBACK,
    20000
  );

  await logAction({ req, action: 'ai_scorecard_drafted', entityType: 'AI', entityId: null });
  res.json(result);
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. AI INTERVIEW QUESTION GENERATOR
// ═══════════════════════════════════════════════════════════════════════════

const QUESTION_GEN_PROMPT = `You are an expert interview coach. Generate tailored interview questions based on the job description and round type.

OUTPUT ONLY valid JSON array:
[
  {
    "question": "string",
    "category": "technical|behavioral|situational|culture-fit",
    "difficulty": "easy|medium|hard",
    "evaluates": "string (which competency this tests)",
    "followUp": "string (optional follow-up question)"
  }
]

Generate 8-12 high-quality questions. Mix categories for a well-rounded assessment.`;

const QUESTIONS_FALLBACK = { questions: [], fallback: true };

/**
 * @desc  Generate interview questions for a job + round.
 * @route POST /api/ai/services/generate-questions
 * @body  { jobId: string, round?: number, focusAreas?: string[] }
 */
const generateQuestions = asyncHandler(async (req, res) => {
  const { jobId, round, focusAreas } = req.body;

  const job = await Job.findById(jobId);
  if (!job) {
    res.status(404);
    throw new Error('Job not found');
  }

  // Check for an existing template
  let templateHint = '';
  const template = await InterviewTemplate.findOne({ job: jobId, round: round || null, isActive: true });
  if (template) {
    templateHint = `\nExisting evaluation competencies: ${template.competencies.join(', ')}`;
  }

  const llm = getLLM();

  const result = await safeLLMInvoke(
    async () => {
      const response = await llm.invoke([
        new SystemMessage(QUESTION_GEN_PROMPT),
        new HumanMessage(
          `Job Title: ${job.title}
Department: ${job.department || 'General'}
Required Skills: ${(job.skillsRequired || []).join(', ')}
Job Description: ${(job.description || '').substring(0, 3000)}
Interview Round: ${round || 'General'}
Focus Areas: ${(focusAreas || []).join(', ') || 'All-around assessment'}${templateHint}`
        ),
      ]);

      let content = response.content || '';
      content = content.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
      const questions = JSON.parse(content);
      return { questions: Array.isArray(questions) ? questions : [], fallback: false };
    },
    QUESTIONS_FALLBACK,
    20000
  );

  await logAction({ req, action: 'ai_questions_generated', entityType: 'AI', entityId: null, metadata: { jobId, round } });
  res.json({ ...result, jobTitle: job.title, round });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. AI CANDIDATE RANKING
// ═══════════════════════════════════════════════════════════════════════════

const RANKING_PROMPT = `You are a candidate ranking engine for an ATS. Given a job description and a list of candidate profiles, rank them by fit.

For each candidate, provide:
- A match score (0-100)
- Key matching skills
- Missing skills
- A brief rationale

Output ONLY valid JSON:
{
  "rankings": [
    {
      "candidateId": "string",
      "candidateName": "string",
      "matchScore": 0-100,
      "matchingSkills": ["string"],
      "missingSkills": ["string"],
      "rationale": "string"
    }
  ],
  "summary": "Overall analysis"
}

Rank from highest to lowest match score.`;

const RANKING_FALLBACK = { rankings: [], summary: 'Unable to rank candidates. Please try again.', fallback: true };

/**
 * @desc  AI-rank candidates for a specific job.
 * @route POST /api/ai/services/rank-candidates
 * @body  { jobId: string, candidateIds?: string[] }
 */
const rankCandidates = asyncHandler(async (req, res) => {
  const { jobId, candidateIds } = req.body;

  const job = await Job.findById(jobId);
  if (!job) {
    res.status(404);
    throw new Error('Job not found');
  }

  // Get candidates — either specific ones or all applicants for this job
  let profiles;
  if (Array.isArray(candidateIds) && candidateIds.length) {
    profiles = await CandidateProfile.find({ user: { $in: candidateIds } })
      .populate('user', 'name email');
  } else {
    // Get all candidates who applied for this job
    const applications = await Application.find({ job: jobId }).select('candidate');
    const appCandidateIds = applications.map((a) => a.candidate);
    profiles = await CandidateProfile.find({ user: { $in: appCandidateIds } })
      .populate('user', 'name email');
  }

  if (!profiles.length) {
    return res.json({ rankings: [], summary: 'No candidate profiles found.', fallback: false });
  }

  // Build candidate summaries for the LLM (cap at 20 to stay within token limits)
  const candidateSummaries = profiles.slice(0, 20).map((p) => ({
    id: p.user?._id?.toString() || p._id.toString(),
    name: p.user?.name || 'Unknown',
    skills: p.skills || [],
    experienceYears: p.experienceYears || 0,
    headline: p.headline || '',
    location: p.location || '',
  }));

  const llm = getLLM();

  const result = await safeLLMInvoke(
    async () => {
      const response = await llm.invoke([
        new SystemMessage(RANKING_PROMPT),
        new HumanMessage(
          `JOB REQUIREMENTS:
Title: ${job.title}
Department: ${job.department || 'General'}
Required Skills: ${(job.skillsRequired || []).join(', ')}
Experience: ${job.experienceRequired || 'Not specified'}
Description: ${(job.description || '').substring(0, 2000)}

CANDIDATES:
${JSON.stringify(candidateSummaries, null, 2)}`
        ),
      ]);

      let content = response.content || '';
      content = content.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
      return { ...JSON.parse(content), fallback: false };
    },
    RANKING_FALLBACK,
    25000  // Longer timeout for ranking multiple candidates
  );

  await logAction({ req, action: 'ai_candidates_ranked', entityType: 'AI', entityId: null, metadata: { jobId, candidateCount: profiles.length } });
  res.json({ ...result, jobTitle: job.title });
});

module.exports = {
  parseResume,
  anonymizeResume,
  draftScorecard,
  generateQuestions,
  rankCandidates,
};
