'use client';

import React, { useState } from 'react';
import Icon from '@/components/ui/Icon';

interface AdvisorMessageProps {
  role: 'user' | 'ai';
  text: string;
}

// Helper to format inline bold, currency, and percentages
function renderInlineFormatted(text: string) {
  // Split on bold markdown **...**
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const boldText = part.slice(2, -2);
      return (
        <strong key={idx} className="font-semibold text-[var(--ink)]">
          {boldText}
        </strong>
      );
    }

    // Highlight metrics: e.g. £1,234 or 95% or 122 days
    const subParts = part.split(/(\b\d{1,3}\s*%|£[\d,]+(?:\.\d{2})?|\b\d+\s*days\s*overdue\b)/gi);
    return (
      <React.Fragment key={idx}>
        {subParts.map((sub, sIdx) => {
          if (/^\d{1,3}\s*%$/.test(sub.trim())) {
            const num = parseInt(sub);
            const badgeClass =
              num >= 70
                ? 'bg-rose-50 text-[var(--rosewood)] border-rose-200'
                : num >= 40
                ? 'bg-amber-50 text-[var(--gold)] border-amber-200'
                : 'bg-emerald-50 text-[var(--sage)] border-emerald-200';
            return (
              <span
                key={sIdx}
                className={`inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded text-xs font-semibold border ${badgeClass}`}
              >
                {sub.trim()}
              </span>
            );
          }
          if (/^£[\d,]+(?:\.\d{2})?$/.test(sub.trim())) {
            return (
              <span key={sIdx} className="font-semibold text-[var(--ink)]">
                {sub}
              </span>
            );
          }
          return sub;
        })}
      </React.Fragment>
    );
  });
}

// Check if a line is a table row: pipe-delimited or tab-delimited
function isTableRow(line: string) {
  const trimmed = line.trim();
  if (line.split('\t').length >= 3) return true;
  if ((trimmed.match(/\|/g) || []).length >= 2) return true;
  return false;
}

// Check if line is table divider: e.g. |---|---|
function isTableDivider(line: string) {
  return /^\|?[-:\s|]+\|?$/.test(line.trim());
}

// Parse markdown or tab-separated table rows
function parseTable(lines: string[]) {
  if (lines.length === 0) return null;

  // 1. Tab-delimited table
  if (lines[0].includes('\t')) {
    const rawHeader = lines[0];
    const headers = rawHeader
      .split('\t')
      .map(h => h.trim().replace(/^#+/, '#').replace(/\*\*/g, ''))
      .filter(Boolean);

    const rows = lines.slice(1).map(line => {
      if (line.includes('\t')) {
        return line.split('\t').map(c => c.trim());
      }
      return line.split('|').map(c => c.trim()).filter(Boolean);
    });

    return { headers, rows };
  }

  // 2. Standard pipe table
  const rawHeader = lines[0];
  const headers = rawHeader
    .split('|')
    .map(h => h.trim().replace(/\*\*/g, ''))
    .filter(Boolean);

  const dataLines = lines.slice(1).filter(l => !isTableDivider(l));
  const rows = dataLines.map(line =>
    line
      .split('|')
      .map(c => c.trim())
      .filter(Boolean)
  );

  return { headers, rows };
}

export default function AdvisorMessage({ role, text }: AdvisorMessageProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] md:max-w-[75%] rounded-2xl rounded-br-sm px-4 py-3 bg-[var(--ink)] text-white text-sm leading-relaxed shadow-xs">
          {text}
        </div>
      </div>
    );
  }

  // Pre-process text to separate table lines or lists that might have been condensed
  let cleanText = text
    // Separate table rows separated by spaces: '| |' -> '|\n|'
    .replace(/\|\s+(\|)/g, '|\n$1')
    // Separate inline lists: ' 1. **' -> '\n1. **'
    .replace(/([^\n])\s+(\d+\.\s+\*\*)/g, '$1\n\n$2')
    .replace(/([^\n])\s+(\d+\.\s+[A-Z])/g, '$1\n\n$2');

  const rawParagraphs = cleanText.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);

  return (
    <div className="flex justify-start w-full">
      <div className="max-w-[95%] md:max-w-[88%] lg:max-w-[85%] rounded-2xl rounded-bl-sm p-4 sm:p-5 bg-white border border-[var(--line)] shadow-xs transition-all">
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--line)]/70">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-[var(--ink)] flex items-center justify-center">
              <Icon name="sparkle" size={11} className="text-white" />
            </div>
            <span className="text-xs font-semibold tracking-wide text-[var(--ink)]">
              Marlowe & Rose Intelligence
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-[var(--sage)] border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Data Verified
            </span>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-[11px] font-medium text-[var(--slate)] hover:text-[var(--ink)] transition-colors px-2 py-1 rounded hover:bg-[var(--paper)]"
            title="Copy response"
          >
            {copied ? (
              <>
                <Icon name="check" size={12} className="text-emerald-600" />
                <span className="text-emerald-600 font-semibold">Copied</span>
              </>
            ) : (
              <>
                <Icon name="box" size={12} />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Content Body */}
        <div className="space-y-3.5 text-sm leading-relaxed text-[var(--ink-soft)]">
          {rawParagraphs.map((para, pIdx) => {
            const lines = para.split('\n').map(l => l.trim()).filter(Boolean);

            // 1. Table Detection
            const tableLines = lines.filter(isTableRow);
            if (tableLines.length >= 2) {
              const table = parseTable(tableLines);
              // Non-table lines before/after
              const nonTableBefore = lines.filter(l => !isTableRow(l) && lines.indexOf(l) < lines.indexOf(tableLines[0]));
              const nonTableAfter = lines.filter(l => !isTableRow(l) && lines.indexOf(l) > lines.indexOf(tableLines[tableLines.length - 1]));

              return (
                <div key={pIdx} className="space-y-2.5 my-2">
                  {nonTableBefore.length > 0 && (
                    <p>{renderInlineFormatted(nonTableBefore.join(' '))}</p>
                  )}

                  {table && (
                    <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--porcelain)]/50 shadow-xs">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-[var(--paper)] border-b border-[var(--line)]">
                            {table.headers.map((h, hIdx) => (
                              <th
                                key={hIdx}
                                className="px-3.5 py-2.5 font-semibold text-[var(--slate)] tracking-wider uppercase text-[10px]"
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--line)]/60 bg-white">
                          {table.rows.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-[var(--paper)]/40 transition-colors">
                              {row.map((cell, cIdx) => (
                                <td key={cIdx} className="px-3.5 py-2.5 text-[var(--ink)]">
                                  {renderInlineFormatted(cell)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {nonTableAfter.length > 0 && (
                    <p>{renderInlineFormatted(nonTableAfter.join(' '))}</p>
                  )}
                </div>
              );
            }

            // 2. Numbered / Bulleted List Detection
            const isList = lines.every(l => /^(\d+\.|\*|-|•)\s+/.test(l));
            if (isList && lines.length > 0) {
              return (
                <div key={pIdx} className="space-y-2 my-2">
                  {lines.map((item, iIdx) => {
                    const match = item.match(/^(\d+\.|\*|-|•)\s+(.*)$/);
                    const prefix = match ? match[1] : '';
                    const content = match ? match[2] : item;

                    return (
                      <div
                        key={iIdx}
                        className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[var(--paper)]/50 border border-[var(--line)]/60 hover:border-[var(--line)] transition-colors"
                      >
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--paper)] border border-[var(--line)] text-[10px] font-bold text-[var(--slate)] flex items-center justify-center mt-0.5">
                          {prefix.replace('.', '')}
                        </span>
                        <div className="flex-1 text-xs sm:text-sm leading-snug">
                          {renderInlineFormatted(content)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            }

            // 3. Highlighted Callout / Recommendation Box
            const isRecommendation = /^(focus on|recommended|action|tip|key takeaway|strategy|next steps?):?/i.test(para);
            if (isRecommendation) {
              return (
                <div
                  key={pIdx}
                  className="p-3.5 rounded-xl bg-[var(--paper)]/70 border-l-4 border-l-[var(--rosewood)] border border-[var(--line)] shadow-2xs my-2.5"
                >
                  <div className="flex items-center gap-1.5 mb-1.5 text-xs font-bold uppercase tracking-wider text-[var(--rosewood)]">
                    <Icon name="sparkle" size={13} />
                    <span>Recommended Executive Action</span>
                  </div>
                  <div className="text-xs sm:text-sm leading-relaxed text-[var(--ink)] font-normal">
                    {renderInlineFormatted(para)}
                  </div>
                </div>
              );
            }

            // 4. Standard Paragraph
            return (
              <p key={pIdx} className="leading-relaxed">
                {renderInlineFormatted(para)}
              </p>
            );
          })}
        </div>
      </div>
    </div>
  );
}
