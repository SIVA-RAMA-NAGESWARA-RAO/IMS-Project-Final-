import React, { useState, useRef, useEffect } from 'react';
import { proposeAction, executeAction } from '../../api/agent';

/**
 * AgentCommandCenter — HITL AI Action Agent chat interface.
 *
 * Users type natural language commands. The AI proposes actions with a
 * summary and structured parameters. Users approve (✅) or deny (❌)
 * before any database mutation occurs.
 */
const AgentCommandCenter = () => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      type: 'text',
      content: 'Welcome to the AI Command Center! Type a command like **"Schedule a tech interview for John tomorrow at 3pm"** and I\'ll propose an action for your approval.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', type: 'text', content: userMsg }]);
    setLoading(true);

    try {
      const proposal = await proposeAction(userMsg);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          type: 'proposal',
          content: proposal.summary,
          proposal,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          type: 'error',
          content: err.response?.data?.message || 'Failed to process your command. Please try again.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async (proposal) => {
    setLoading(true);
    try {
      const result = await executeAction(proposal.action, proposal.params);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          type: 'success',
          content: `✅ **Action Executed Successfully!**\n\n${result.message}`,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          type: 'error',
          content: `❌ Execution failed: ${err.response?.data?.message || err.message}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeny = () => {
    setMessages((prev) => [
      ...prev,
      { role: 'assistant', type: 'text', content: '🚫 Action denied. No changes were made. Feel free to try another command.' },
    ]);
  };

  const getActionBadgeColor = (action) => {
    const colors = {
      SCHEDULE_INTERVIEW: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      UPDATE_APPLICATION_STATUS: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      CREATE_JOB: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      RESCHEDULE_INTERVIEW: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      UNCLEAR: 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    return colors[action] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  return (
    <div className="min-h-screen bg-canvas dark:bg-canvas-dark p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand to-purple-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-ink dark:text-ink-dark">AI Command Center</h1>
              <p className="text-sm text-muted dark:text-muted-dark">Type natural language commands — AI proposes, you decide.</p>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-card shadow-card overflow-hidden">
          {/* Messages */}
          <div className="h-[60vh] overflow-y-auto p-4 space-y-4" id="agent-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.type === 'proposal' && msg.proposal ? (
                  /* ─── Proposal Card ─── */
                  <div className="max-w-lg w-full">
                    <div className="bg-gradient-to-br from-surface dark:from-[#1a1f2e] to-surface dark:to-[#151925] border border-border dark:border-border-dark rounded-2xl p-5 shadow-lg backdrop-blur-sm">
                      {/* Action Badge */}
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`text-xs font-mono px-2.5 py-1 rounded-full border ${getActionBadgeColor(msg.proposal.action)}`}>
                          {msg.proposal.action}
                        </span>
                        {msg.proposal.confidence > 0 && (
                          <span className="text-xs text-muted dark:text-muted-dark">
                            {Math.round(msg.proposal.confidence * 100)}% confidence
                          </span>
                        )}
                      </div>

                      {/* Summary */}
                      <p className="text-ink dark:text-ink-dark text-sm leading-relaxed mb-4">
                        {msg.proposal.summary}
                      </p>

                      {/* Params Preview */}
                      {Object.keys(msg.proposal.params || {}).length > 0 && (
                        <div className="bg-canvas dark:bg-canvas-dark rounded-xl p-3 mb-4 border border-border dark:border-border-dark">
                          <p className="text-xs font-mono text-muted dark:text-muted-dark mb-2 uppercase tracking-wider">Parameters</p>
                          <div className="space-y-1">
                            {Object.entries(msg.proposal.params).map(([key, val]) => (
                              <div key={key} className="flex items-start gap-2 text-xs">
                                <span className="text-muted dark:text-muted-dark font-mono min-w-[120px]">{key}:</span>
                                <span className="text-ink dark:text-ink-dark break-all">
                                  {Array.isArray(val) ? val.join(', ') : String(val)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      {msg.proposal.action !== 'UNCLEAR' ? (
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleExecute(msg.proposal)}
                            disabled={loading}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all duration-200 shadow-md hover:shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                            id="agent-approve-btn"
                          >
                            <span>✅</span> Allow & Execute
                          </button>
                          <button
                            onClick={handleDeny}
                            disabled={loading}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            id="agent-deny-btn"
                          >
                            <span>❌</span> Deny
                          </button>
                        </div>
                      ) : (
                        <div className="text-xs text-muted dark:text-muted-dark italic">
                          Could not determine the intended action. Please rephrase your command.
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* ─── Regular Message Bubble ─── */
                  <div
                    className={`max-w-md px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-brand text-white rounded-br-md'
                        : msg.type === 'error'
                        ? 'bg-red-500/10 text-red-400 border border-red-500/20 rounded-bl-md'
                        : msg.type === 'success'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-bl-md'
                        : 'bg-canvas dark:bg-canvas-dark text-ink dark:text-ink-dark border border-border dark:border-border-dark rounded-bl-md'
                    }`}
                  >
                    {msg.content.split('\n').map((line, j) => (
                      <p key={j} className={j > 0 ? 'mt-1' : ''}>
                        {line.split('**').map((part, k) =>
                          k % 2 === 1 ? <strong key={k}>{part}</strong> : part
                        )}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Loading indicator */}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-canvas dark:bg-canvas-dark border border-border dark:border-border-dark rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 bg-brand rounded-full animate-bounce [animation-delay:0ms]" />
                    <div className="w-2 h-2 bg-brand rounded-full animate-bounce [animation-delay:150ms]" />
                    <div className="w-2 h-2 bg-brand rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSubmit} className="border-t border-border dark:border-border-dark p-4">
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a command… e.g. 'Schedule an interview for John tomorrow at 3pm'"
                className="flex-1 px-4 py-3 rounded-xl bg-canvas dark:bg-canvas-dark border border-border dark:border-border-dark text-ink dark:text-ink-dark placeholder-muted dark:placeholder-muted-dark focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all text-sm"
                disabled={loading}
                id="agent-input"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="px-6 py-3 rounded-xl bg-brand hover:bg-brand-dark text-white font-semibold text-sm transition-all duration-200 shadow-md hover:shadow-brand/25 disabled:opacity-50 disabled:cursor-not-allowed"
                id="agent-send-btn"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2 mt-3">
              {[
                'Schedule an interview for',
                'Shortlist application for',
                'Create a new job posting for',
                'Reschedule interview for',
              ].map((hint) => (
                <button
                  key={hint}
                  type="button"
                  onClick={() => setInput(hint + ' ')}
                  className="text-xs px-3 py-1.5 rounded-lg bg-canvas dark:bg-canvas-dark border border-border dark:border-border-dark text-muted dark:text-muted-dark hover:text-ink dark:hover:text-ink-dark hover:border-brand/50 transition-all"
                >
                  {hint}…
                </button>
              ))}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AgentCommandCenter;
