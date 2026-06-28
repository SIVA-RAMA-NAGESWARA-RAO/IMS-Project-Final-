import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { chatWithCopilot } from '../../api/copilot';
import { useAuth } from '../../context/AuthContext';

/**
 * FloatingCopilot — Persistent context-aware AI assistant widget.
 *
 * Pinned to the bottom-right corner. Automatically reads the current route
 * and sends it with every message so the AI can provide page-specific guidance.
 * Renders Markdown links as clickable in-app navigation.
 */
const FloatingCopilot = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm your IMS Navigation Copilot 🧭\n\nI can help you find features, explain what's on your current page, or guide you to the right section. Ask me anything!",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Don't render for unauthenticated users.
  if (!user) return null;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // ─── Parse Markdown-style links and render as clickable navigation ────────
  const renderContent = useCallback((text) => {
    if (!text) return null;

    // Split by markdown link pattern: [text](url)
    const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);

    return parts.map((part, i) => {
      const linkMatch = part.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        const [, linkText, href] = linkMatch;
        // Internal links — use React Router navigation.
        if (href.startsWith('/')) {
          return (
            <button
              key={i}
              onClick={() => {
                navigate(href);
                setIsOpen(false);
              }}
              className="text-brand dark:text-blue-400 underline underline-offset-2 hover:text-brand-dark transition-colors"
            >
              {linkText}
            </button>
          );
        }
        return (
          <a key={i} href={href} target="_blank" rel="noreferrer" className="text-brand underline">
            {linkText}
          </a>
        );
      }

      // Handle bold text (**text**)
      const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
      return boldParts.map((bp, j) => {
        const boldMatch = bp.match(/\*\*([^*]+)\*\*/);
        if (boldMatch) {
          return <strong key={`${i}-${j}`}>{boldMatch[1]}</strong>;
        }
        return <span key={`${i}-${j}`}>{bp}</span>;
      });
    });
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');

    const newMessages = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMessages);
    setLoading(true);

    try {
      // Build conversation history for context (last 6 messages).
      const history = newMessages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const { reply } = await chatWithCopilot({
        userMessage: userMsg,
        currentRoute: location.pathname,
        conversationHistory: history,
      });

      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I couldn\'t connect to the AI service right now. Try these helpful links:\n\n- [Dashboard](/hr)\n- [Jobs](/hr/jobs)\n- [Applications](/hr/applications)',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50" id="floating-copilot">
      {/* ─── Chat Panel ─── */}
      {isOpen && (
        <div
          className="mb-4 w-[380px] max-h-[520px] bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{
            animation: 'copilotSlideIn 0.25s ease-out',
          }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-brand to-purple-600 px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-sm">
                🧭
              </div>
              <div>
                <p className="text-white font-semibold text-sm">IMS Copilot</p>
                <p className="text-white/60 text-[10px]">
                  Viewing: {location.pathname}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/60 hover:text-white transition-colors p-1"
              aria-label="Close copilot"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0" style={{ maxHeight: '340px' }}>
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-brand text-white rounded-br-md'
                      : 'bg-canvas dark:bg-canvas-dark text-ink dark:text-ink-dark border border-border dark:border-border-dark rounded-bl-md'
                  }`}
                >
                  {msg.content.split('\n').map((line, j) => (
                    <p key={j} className={j > 0 ? 'mt-1.5' : ''}>
                      {msg.role === 'assistant' ? renderContent(line) : line}
                    </p>
                  ))}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-canvas dark:bg-canvas-dark border border-border dark:border-border-dark rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce [animation-delay:0ms]" />
                    <div className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce [animation-delay:150ms]" />
                    <div className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="border-t border-border dark:border-border-dark p-3">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything…"
                className="flex-1 px-3 py-2 rounded-xl bg-canvas dark:bg-canvas-dark border border-border dark:border-border-dark text-ink dark:text-ink-dark placeholder-muted text-sm focus:outline-none focus:ring-2 focus:ring-brand/50"
                disabled={loading}
                id="copilot-input"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="p-2 rounded-xl bg-brand hover:bg-brand-dark text-white transition-all disabled:opacity-50"
                id="copilot-send-btn"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─── Toggle Button ─── */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 hover:scale-110 ${
          isOpen
            ? 'bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-ink dark:text-ink-dark rotate-0'
            : 'bg-gradient-to-br from-brand to-purple-600 text-white'
        }`}
        aria-label={isOpen ? 'Close copilot' : 'Open copilot'}
        id="copilot-toggle"
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        ) : (
          <span className="text-2xl">🧭</span>
        )}
      </button>

      {/* Inline keyframes for slide-in animation */}
      <style>{`
        @keyframes copilotSlideIn {
          from { opacity: 0; transform: translateY(12px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};

export default FloatingCopilot;
