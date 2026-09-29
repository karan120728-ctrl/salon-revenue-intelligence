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

// ── Lightweight markdown renderer (tables, bold, bullets, line breaks) ────────
function renderMarkdown(text: string) {
  const lines = text.split('\n');
  const output: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Detect markdown table (starts with |)
    if (line.trim().startsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      const rows = tableLines.filter(l => !/^\s*\|[\s\-|:]+\|\s*$/.test(l));
      if (rows.length > 0) {
        const parseRow = (row: string) =>
          row.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);

        const headers = parseRow(rows[0]);
        const bodyRows = rows.slice(1);

        output.push(
          <div key={`table-${i}`} className="overflow-x-auto my-3 rounded-lg border border-[var(--line)]">
            <table className="w-full text-xs">
              <thead className="bg-[var(--ink)] text-white">
                <tr>
                  {headers.map((h, hi) => (
                    <th key={hi} className="px-3 py-2 text-left font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bodyRows.map((row, ri) => (
                  <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-[var(--paper)]'}>
                    {parseRow(row).map((cell, ci) => (
                      <td key={ci} className="px-3 py-2 align-top border-t border-[var(--line)]">
                        {renderInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    // Bullet list item
    if (/^[-•]\s/.test(line.trim())) {
      const items: string[] = [];
      while (i < lines.length && /^[-•]\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-•]\s/, ''));
        i++;
      }
      output.push(
        <ul key={`ul-${i}`} className="list-disc list-inside my-1.5 space-y-0.5">
          {items.map((item, ii) => <li key={ii}>{renderInline(item)}</li>)}
        </ul>
      );
      continue;
    }

    // Numbered list
    if (/^\d+\.\s/.test(line.trim())) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s/, ''));
        i++;
      }
      output.push(
        <ol key={`ol-${i}`} className="list-decimal list-inside my-1.5 space-y-0.5">
          {items.map((item, ii) => <li key={ii}>{renderInline(item)}</li>)}
        </ol>
      );
      continue;
    }

    // Empty line → spacer
    if (line.trim() === '') {
      output.push(<div key={`br-${i}`} className="h-1.5" />);
      i++;
      continue;
    }

    // Normal paragraph
    output.push(<p key={`p-${i}`} className="leading-relaxed">{renderInline(line)}</p>);
    i++;
  }

  return <>{output}</>;
}

// Render inline markdown: **bold**, *italic*
function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*'))
      return <em key={i}>{part.slice(1, -1)}</em>;
    return part;
  });
}

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

    if (query.length > 500) {
      setMessages(m => [...m, { role: 'user', text: query }, { role: 'ai', text: 'Your question is too long. Please keep it under 500 characters.' }]);
      setInput('');
      return;
    }

    setMessages(m => [...m, { role: 'user', text: query }]);
    setInput('');
    setLoading(true);

    try {
      const data = await fetchApi('/api/ai/advisor', {
        method: 'POST',
        body: JSON.stringify({ query, history: messages }),
      });
      setMessages(m => [...m, { role: 'ai', text: data.answer }]);
    } catch (err: any) {
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
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${m.role === 'user'
                  ? 'bg-[var(--ink)] text-white rounded-br-sm'
                  : 'bg-[var(--paper)] rounded-bl-sm'
                  }`}
              >
                {m.role === 'ai' ? renderMarkdown(m.text) : m.text}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
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

        {/* Suggestions */}
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
