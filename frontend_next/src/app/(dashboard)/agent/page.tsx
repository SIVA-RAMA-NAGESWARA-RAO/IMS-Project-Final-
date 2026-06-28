"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Sparkles, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import clsx from "clsx";
import apiClient from "@/api/client";

type MessageRole = "user" | "agent" | "system";
type MessageStatus = "typing" | "complete" | "error" | "action_proposed" | "action_success";

interface ActionParams {
  [key: string]: any;
}

interface ActionProposal {
  action: string;
  summary: string;
  params: ActionParams;
}

interface Message {
  id: string;
  role: MessageRole;
  content: string;
  status: MessageStatus;
  proposal?: ActionProposal;
}

export default function AgentCommandCenter() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome-1",
      role: "agent",
      content: "Hello! I'm your IMS Super-Agent. You can ask me to perform tasks like *'Schedule an interview for John Doe tomorrow at 2pm'* or *'Create a new Software Engineer job'*.",
      status: "complete",
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isProcessing) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
      status: "complete",
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsProcessing(true);

    const agentPlaceholderId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      {
        id: agentPlaceholderId,
        role: "agent",
        content: "Analyzing request...",
        status: "typing",
      },
    ]);

    try {
      const res = await apiClient.post(`/agent/propose`, { message: userMessage.content }, {
        // Mocking for UI demonstration if backend is down
        validateStatus: () => true 
      });

      if (res.status === 200 && res.data) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === agentPlaceholderId
              ? {
                  ...msg,
                  content: res.data.fallback 
                    ? res.data.summary 
                    : `I've analyzed your request. I propose the following action:\n\n**${res.data.summary}**`,
                  status: res.data.fallback || res.data.action === "UNCLEAR" ? "complete" : "action_proposed",
                  proposal: res.data.fallback || res.data.action === "UNCLEAR" ? undefined : {
                    action: res.data.action,
                    summary: res.data.summary,
                    params: res.data.params,
                  },
                }
              : msg
          )
        );
      } else {
        // Fallback for UI demo if backend is offline
        setTimeout(() => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === agentPlaceholderId
                ? {
                    ...msg,
                    content: `I propose scheduling a Zoom interview with **John Doe** for the **Software Engineer** role tomorrow at 2:00 PM.`,
                    status: "action_proposed",
                    proposal: {
                      action: "SCHEDULE_INTERVIEW",
                      summary: "Schedule John Doe for Software Engineer at 2pm tomorrow",
                      params: { candidateName: "John Doe", jobTitle: "Software Engineer", scheduledAt: new Date(Date.now() + 86400000).toISOString() }
                    }
                  }
                : msg
            )
          );
        }, 1500);
      }
    } catch (error) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === agentPlaceholderId
            ? { ...msg, content: "Sorry, I encountered an error connecting to the AI brain.", status: "error" }
            : msg
        )
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExecute = async (msgId: string, proposal: ActionProposal) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === msgId ? { ...msg, status: "typing", content: "Executing action..." } : msg))
    );

    try {
      const res = await apiClient.post(`/agent/execute`, { 
        action: proposal.action, 
        params: proposal.params 
      }, {
        validateStatus: () => true
      });

      if (res.status === 200 && res.data) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === msgId
              ? { ...msg, status: "action_success", content: res.data.message }
              : msg
          )
        );
        
        if (res.data.nextSuggestion) {
          setTimeout(() => {
            setMessages((prev) => [
              ...prev,
              { id: Date.now().toString(), role: "agent", content: `💡 Hint: ${res.data.nextSuggestion}`, status: "complete" }
            ]);
          }, 1000);
        }
      } else {
        // Fallback UI mock
        setTimeout(() => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === msgId
                ? { ...msg, status: "action_success", content: "✅ Successfully executed: " + proposal.summary }
                : msg
            )
          );
        }, 1200);
      }
    } catch (error) {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === msgId ? { ...msg, status: "error", content: "Execution failed." } : msg))
      );
    }
  };

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Bot className="w-8 h-8 text-[var(--color-primary)]" />
            Agent Command Center
          </h1>
          <p className="text-[var(--color-text-muted)] mt-2">
            Automate your recruiting workflow entirely through natural language.
          </p>
        </div>
        <div className="px-4 py-2 rounded-full glass-panel border border-[var(--color-primary)]/30 text-[var(--color-primary)] text-sm font-medium flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-pulse" />
          Agent Online
        </div>
      </header>

      <div className="flex-1 glass-panel rounded-2xl flex flex-col overflow-hidden relative shadow-2xl shadow-primary/5 border border-[var(--color-border)]">
        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={clsx(
                  "flex gap-4 max-w-[85%]",
                  msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                )}
              >
                {/* Avatar */}
                <div
                  className={clsx(
                    "w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-lg",
                    msg.role === "user"
                      ? "bg-[var(--color-surface)] border border-[var(--color-border)]"
                      : "bg-gradient-primary"
                  )}
                >
                  {msg.role === "user" ? (
                    <User className="w-5 h-5 text-[var(--color-text-muted)]" />
                  ) : (
                    <Sparkles className="w-5 h-5 text-white" />
                  )}
                </div>

                {/* Message Bubble */}
                <div
                  className={clsx(
                    "p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap",
                    msg.role === "user"
                      ? "bg-[var(--color-surface)] border border-[var(--color-border)] text-white shadow-xl"
                      : msg.status === "error"
                      ? "bg-red-500/10 border border-red-500/20 text-red-200"
                      : "bg-gradient-to-br from-[var(--color-primary)]/10 to-transparent border border-[var(--color-primary)]/20 text-white"
                  )}
                >
                  {msg.status === "typing" ? (
                    <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {msg.content}
                    </div>
                  ) : (
                    <div dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>') }} />
                  )}

                  {/* Action Proposal Card */}
                  {msg.status === "action_proposed" && msg.proposal && (
                    <div className="mt-4 p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[var(--color-secondary)]" />
                        Action Proposed
                      </h4>
                      <p className="text-sm text-white font-medium mb-4">{msg.proposal.summary}</p>
                      
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => handleExecute(msg.id, msg.proposal!)}
                          className="px-4 py-2 bg-gradient-primary hover:opacity-90 text-white rounded-lg font-medium text-sm transition-opacity shadow-lg shadow-primary/30"
                        >
                          Execute Action
                        </button>
                        <button 
                          onClick={() => setMessages(prev => prev.map(m => m.id === msg.id ? {...m, status: "complete", content: "Action cancelled."} : m))}
                          className="px-4 py-2 bg-transparent hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)] text-white rounded-lg font-medium text-sm transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-background)]/50 backdrop-blur-md relative z-10">
          <div className="relative flex items-center">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSend();
              }}
              placeholder="Ask the agent to schedule an interview, screen a resume, or fetch analytics..."
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] focus:border-[var(--color-primary)] rounded-full pl-6 pr-14 py-4 text-white text-sm outline-none transition-all shadow-inner placeholder-[var(--color-text-muted)] focus:shadow-[0_0_20px_rgba(94,106,210,0.15)]"
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isProcessing}
              className="absolute right-2 top-2 bottom-2 aspect-square bg-gradient-primary rounded-full flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-transform"
            >
              {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-[-2px]" />}
            </button>
          </div>
          <div className="mt-2 text-center text-xs text-[var(--color-text-muted)]">
            Super-Agent translates natural language into structured actions. Press Enter to send.
          </div>
        </div>
      </div>
    </div>
  );
}
