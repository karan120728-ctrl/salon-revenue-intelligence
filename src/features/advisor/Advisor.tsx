'use client';

import { useState, useEffect, useRef } from 'react';
import Icon from '@/components/ui/Icon';
import { fetchApi } from '@/lib/api';
import type { Message } from '@/types';

const suggestions = [
  'Why is revenue lower this month?',
  'Who should I contact today?',
  'Which customers may never return?',
  'How can I increase profits?',
];

export default function Advisor() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'ai',
      text: "Good morning. Ask me anything about your salon — revenue, staff, customers or stock — and I'll answer from your live data.",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (text?: string) => {
    const query = (text ?? input).trim();
    if (!query || loading) return;

    // Validation — mirror backend constraints on the client for instant feedback
    if (query.length > 500) {
      setMessages(m => [...m, { role: 'user', text: query }, { role: 'ai', text: 'Your question is too long. Please keep it under 500 characters.' }]);
      setInput('');
      return;
    }

    setMessages(m => [...m, { role: 'user', text: query }]);
    setInput('');
    setLoading(true);

    try {
      // POST to /api/ai/advisor — pass previous messages for conversation thread context
      const data = await fetchApi('/api/ai/advisor', {
        method: 'POST',
        body: JSON.stringify({ query, history: messages }),
      });

      // Backend always returns { success, answer }
      setMessages(m => [...m, { role: 'ai', text: data.answer }]);
    } catch (err: any) {
      // Show a graceful error in the chat rather than crashing
      const friendlyError = err?.message?.includes('API request failed')
        ? "I couldn't connect to the advisor right now. Please check your connection and try again."
        : err?.message || "Something went wrong. Please try again.";

      setMessages(m => [...m, { role: 'ai', text: friendlyError }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-5 lg:p-8">
      <div className="card flex flex-col h-[calc(100vh-140px)] max-h-[720px]">
        {/* Header */}
        <div className="flex items-center gap-2.5 px-6 py-5 border-b border-[var(--line)]">
          <div className="w-9 h-9 rounded-full bg-[var(--ink)] flex items-center justify-center">
            <Icon name="sparkle" size={16} className="text-white" />
          </div>
          <div>
            <p className="font-display text-lg leading-tight">AI Business Advisor</p>
            <p className="text-xs text-[var(--slate)]">Grounded in your live salon data</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-[var(--ink)] text-white rounded-br-sm'
                    : 'bg-[var(--paper)] rounded-bl-sm'
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}

          {/* Typing / loading indicator */}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-[var(--paper)] rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5 items-center">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-[var(--slate)] pulse-dot"
                    style={{ animationDelay: `${i * 0.2}s` }}
                  />
                ))}
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Suggestions — shown only at the start */}
        {messages.length < 2 && (
          <div className="px-6 pb-3 flex flex-wrap gap-2">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => send(s)}
                disabled={loading}
                className="text-xs font-medium border border-[var(--line)] rounded-full px-3 py-1.5 hover:bg-[var(--paper)] disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <form
          onSubmit={(e) => { e.preventDefault(); send(); }}
          className="flex items-center gap-2 px-5 py-4 border-t border-[var(--line)]"
        >
          <input
            id="advisor-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about revenue, staff, customers or stock…"
            className="flex-1 outline-none text-sm bg-[var(--paper)] rounded-full px-4 py-3"
            disabled={loading}
            maxLength={500}
          />
          <button
            id="advisor-send"
            type="submit"
            disabled={loading || !input.trim()}
            className="w-11 h-11 rounded-full bg-[var(--ink)] text-white flex items-center justify-center flex-shrink-0 disabled:opacity-40"
          >
            <Icon name="send" size={15} />
          </button>
        </form>
      </div>
    </div>
  );
}
