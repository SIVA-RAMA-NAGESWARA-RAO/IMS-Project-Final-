/**
 * Context-Aware Navigation Copilot Controller.
 *
 * Accepts the user's message and their current route, injects route-specific
 * context into the system prompt so the AI knows exactly what the user is
 * looking at, and returns a Markdown-formatted response with navigation links.
 */
const asyncHandler = require('express-async-handler');
const { HumanMessage, SystemMessage } = require('@langchain/core/messages');
const { getLLM, safeLLMInvoke, COPILOT_SYSTEM_PROMPT } = require('../config/aiConfig');

// ─── Route → Context mapping ─────────────────────────────────────────────────
const ROUTE_CONTEXT = {
  '/hr': 'The user is viewing the HR Dashboard — an overview of recruitment metrics, pending tasks, and quick-action widgets.',
  '/hr/jobs': 'The user is on the Job Management page — they can create, edit, and close job postings here.',
  '/hr/candidates': 'The user is browsing the Candidates List — searchable profiles of all applicants.',
  '/hr/applications': 'The user is on the Application Review page — they can shortlist, reject, or advance applications.',
  '/hr/interviews': 'The user is on the Interview Scheduling page — they can schedule, reschedule, or cancel interviews.',
  '/hr/interviewers': 'The user is on the Interviewer Assignment page — they can assign panel members to interviews.',
  '/hr/offers': 'The user is on the Offer Management page — they can create, send, and track offer letters.',
  '/hr/analytics': 'The user is viewing the AI Analytics Dashboard — recruitment funnel, skill charts, and time-to-hire trends.',
  '/hr/agent': 'The user is in the AI Agent Command Center — they can type natural language commands to perform actions.',
  '/hr/reports': 'The user is viewing historical Reports — aggregate data and trends.',
  '/hr/audit': 'The user is viewing the Audit Log — a chronological record of all system actions.',
  '/candidate': 'The user is on their Candidate Dashboard — an overview of their application status.',
  '/candidate/jobs': 'The user is browsing the Job Board — open positions they can apply to.',
  '/candidate/applications': 'The user is viewing My Applications — the status of jobs they\'ve applied to.',
  '/candidate/interviews': 'The user is viewing My Interviews — upcoming interview schedules.',
  '/candidate/profile': 'The user is on their Profile page — they can edit personal info and upload resumes.',
  '/interviewer': 'The user is on the Interviewer Dashboard — an overview of assigned interviews.',
  '/interviewer/assignments': 'The user is viewing their interview Assignments — details of panels they\'re on.',
};

// ─── Fallback response when LLM is unavailable ──────────────────────────────
const FALLBACK_REPLY = `I'm currently unable to connect to my AI backend. Here are some helpful links:

- [HR Dashboard](/hr)
- [Job Management](/hr/jobs)
- [Applications](/hr/applications)
- [Interviews](/hr/interviews)
- [Analytics](/hr/analytics)

Please try again in a moment!`;

/**
 * @desc  Chat with the context-aware navigation copilot.
 * @route POST /api/ai/copilot
 * @body  { userMessage: string, currentRoute: string, conversationHistory?: array }
 */
const chat = asyncHandler(async (req, res) => {
  const { userMessage, currentRoute, conversationHistory } = req.body;

  if (!userMessage || typeof userMessage !== 'string') {
    res.status(400);
    throw new Error('userMessage is required');
  }

  const llm = getLLM();

  // Build context-enriched system prompt.
  const routeContext = ROUTE_CONTEXT[currentRoute] || `The user is on page: ${currentRoute}`;
  const userRole = req.user?.role || 'unknown';
  const userName = req.user?.name || 'User';

  const contextualSystemPrompt = `${COPILOT_SYSTEM_PROMPT}

CURRENT CONTEXT:
- User: ${userName} (role: ${userRole})
- Current page: ${currentRoute}
- Page description: ${routeContext}

Tailor your response to the user's role and current page. Use markdown links for navigation suggestions.`;

  const result = await safeLLMInvoke(
    async () => {
      const messages = [new SystemMessage(contextualSystemPrompt)];

      // Include recent conversation history for continuity (up to 6 messages).
      if (Array.isArray(conversationHistory)) {
        const recent = conversationHistory.slice(-6);
        for (const msg of recent) {
          if (msg.role === 'user') {
            messages.push(new HumanMessage(msg.content));
          } else if (msg.role === 'assistant') {
            // Use SystemMessage for assistant history since we're stateless.
            messages.push(new SystemMessage(`[Your previous response]: ${msg.content}`));
          }
        }
      }

      messages.push(new HumanMessage(userMessage.trim()));

      const response = await llm.invoke(messages);
      return response.content || FALLBACK_REPLY;
    },
    FALLBACK_REPLY,
    12000 // 12s timeout
  );

  res.json({ reply: result });
});

module.exports = { chat };
