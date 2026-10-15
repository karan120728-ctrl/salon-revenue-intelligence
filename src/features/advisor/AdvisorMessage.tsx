'use client';

import React, { useState } from 'react';
import Icon from '@/components/ui/Icon';

interface AdvisorMessageProps {
  role: 'user' | 'ai';
  text: string;
}

// Helper to format inline bold, currency, phone numbers, and percentages
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

    // Highlight metrics: e.g. £1,234 or 95% or 122 days or +447700000003
    const subParts = part.split(/(\b\d{1,3}\s*%|£[\d,]+(?:\.\d{2})?|\b\d+\s*days\s*overdue\b|\+44\d{10}|\b07\d{9}\b)/gi);
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
          if (/^(\+44\d{10}|07\d{9})$/.test(sub.trim())) {
            return (
              <span key={sIdx} className="font-semibold font-mono text-xs px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200/80">
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

// Sub-component for client message / outreach drafts (SMS, WhatsApp, email)
function OutreachDraftCard({ title, body }: { title: string; body: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopyDraft = () => {
    navigator.clipboard.writeText(body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const paragraphs = body.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);

  return (
    <div className="my-3.5 rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50/60 via-[var(--porcelain)] to-white p-4 sm:p-5 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-amber-200/70">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[var(--rosewood)] flex items-center justify-center text-white shadow-2xs">
            <Icon name="chat" size={14} className="text-white" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-[var(--ink)] tracking-tight">
              {title}
            </h4>
            <span className="text-[11px] text-[var(--slate)] font-normal flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Client Outreach Draft · Ready to Send (SMS / WhatsApp)
            </span>
          </div>
        </div>

        <button
          onClick={handleCopyDraft}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-amber-300 text-[var(--ink)] hover:bg-amber-50 hover:border-amber-400 active:scale-95 transition-all shadow-2xs"
          title="Copy exact message to clipboard"
        >
          {copied ? (
            <>
              <Icon name="check" size={13} className="text-emerald-600" />
              <span className="text-emerald-700 font-bold">Copied Message</span>
            </>
          ) : (
            <>
              <Icon name="box" size={13} />
              <span>Copy Message</span>
            </>
          )}
        </button>
      </div>

      {/* Message Bubble Container */}
      <div className="bg-white/95 rounded-xl p-4 sm:p-4.5 border border-amber-100/80 shadow-2xs space-y-3 text-xs sm:text-sm leading-relaxed text-[var(--ink)]">
        {paragraphs.map((p, idx) => {
          const lines = p.split('\n').map(l => l.trim()).filter(Boolean);
          const isNumList = lines.length >= 1 && lines.every(l => /^\d+\.\s+/.test(l));

          if (isNumList) {
            return (
              <div key={idx} className="space-y-1.5 my-2 pl-0.5">
                {lines.map((l, lIdx) => (
                  <div key={lIdx} className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-amber-100/90 text-[10px] font-bold text-amber-900 flex items-center justify-center flex-shrink-0 mt-0.5">
                      {lIdx + 1}
                    </span>
                    <span className="text-[var(--ink-soft)] font-medium flex-1">
                      {renderInlineFormatted(l.replace(/^\d+\.\s*/, ''))}
                    </span>
                  </div>
                ))}
              </div>
            );
          }

          return (
            <p key={idx} className="leading-relaxed">
              {renderInlineFormatted(p)}
            </p>
          );
        })}
      </div>
    </div>
  );
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

  // 1. Clean up blockquote markers and condensed lines
  let cleanText = text
    // Replace markdown blockquote paragraph breaks like '> >' or '> \n >'
    .replace(/\s*>\s*>\s*/g, '\n\n')
    // Strip leading '>' on any line
    .replace(/^[ \t]*>[ \t]*/gm, '')
    // Strip trailing '>' on any line
    .replace(/[ \t]*>[ \t]*$/gm, '')
    // Clean up any remaining stray '>' surrounded by spaces
    .replace(/\s+>\s+/g, ' ')
    .replace(/\s+>\s*$/gm, '');

  // 2. Separate condensed table rows: '| |' -> '|\n|'
  cleanText = cleanText.replace(/\|\s+(\|)/g, '|\n$1');

  // 3. Pre-process inline dash bullet lists: 'Revenue Snapshot (Current Month) - Total Revenue: £644 - Appointments Booked: 13'
  cleanText = cleanText.replace(/([^\n])\s+-\s+([A-Z£\d])/g, '$1\n- $2');

  // 4. Separate inline numbered lists only if preceded by sentence punctuation
  cleanText = cleanText
    .replace(/([.:;!?])\s+(\d+\.\s+\*\*)/g, '$1\n\n$2')
    .replace(/([.:;!?])\s+(\d+\.\s+[A-Z])/g, '$1\n\n$2');

  const rawParagraphs = cleanText.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);

  // 5. Detect Outreach / Message Draft
  const greetingIdx = rawParagraphs.findIndex(p => /^(Hi|Dear|Hey|Hello)\s+[A-Z]/i.test(p));
  let draftTitle = 'Personalised Client Outreach';
  let draftBody = '';
  let draftBeforeParas: string[] = [];
  let draftAfterParas: string[] = [];
  let hasDraft = false;

  if (greetingIdx !== -1) {
    hasDraft = true;
    if (greetingIdx > 0) {
      const prev = rawParagraphs[greetingIdx - 1];
      if (/(outreach|draft|sms|whatsapp|email|message|script)/i.test(prev) && prev.length < 80) {
        draftTitle = prev.replace(/^#+\s*/, '').replace(/\*\*/g, '').trim();
        draftBeforeParas = rawParagraphs.slice(0, greetingIdx - 1);
      } else {
        draftBeforeParas = rawParagraphs.slice(0, greetingIdx);
      }
    }

    let endIdx = rawParagraphs.findIndex(
      (p, idx) => idx > greetingIdx && /^(focus on|recommended action|recommended|action|tip|key takeaway):?/i.test(p)
    );
    if (endIdx === -1) endIdx = rawParagraphs.length;

    draftBody = rawParagraphs.slice(greetingIdx, endIdx).join('\n\n');
    draftAfterParas = rawParagraphs.slice(endIdx);
  }

  // Render a standard paragraph or block
  const renderParagraphBlock = (para: string, pIdx: number) => {
    const trimmed = para.trim();

    // 0a. Horizontal Rule: --- or ***
    if (/^[-*_]{3,}$/.test(trimmed)) {
      return <hr key={pIdx} className="border-t border-[var(--line)]/70 my-3" />;
    }

    // 0b. Markdown Headings: ### Why the dip?
    if (/^#{1,4}\s+/.test(trimmed)) {
      const headerText = trimmed.replace(/^#{1,4}\s+/, '').replace(/\*\*/g, '').trim();
      return (
        <div key={pIdx} className="pt-2 pb-1 border-b border-[var(--line)]/40">
          <h3 className="text-xs sm:text-sm font-bold text-[var(--ink)] tracking-tight flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--rosewood)]" />
            {headerText}
          </h3>
        </div>
      );
    }

    const lines = trimmed.split('\n').map(l => l.trim()).filter(Boolean);

    // 1. Table Detection
    const tableLines = lines.filter(isTableRow);
    if (tableLines.length >= 2) {
      const table = parseTable(tableLines);
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

    // 2. Numbered / Bulleted List Detection (handles hierarchical numbered items with sub-bullets)
    const isList = lines.every(l => /^(\d+\.|\*|-|•)\s+/.test(l));
    if (isList && lines.length > 0) {
      const hasNumberedAndBullets = lines.some(l => /^\d+\.\s+/.test(l)) && lines.some(l => /^[-*•]\s+/.test(l));

      if (hasNumberedAndBullets) {
        // Group numbered items with their sub-bullets
        const groups: Array<{ number: string; title: string; items: string[] }> = [];
        let currentGroup: { number: string; title: string; items: string[] } | null = null;

        for (const line of lines) {
          const numMatch = line.match(/^(\d+)\.\s+(.*)$/);
          if (numMatch) {
            currentGroup = { number: numMatch[1], title: numMatch[2], items: [] };
            groups.push(currentGroup);
          } else {
            const itemMatch = line.match(/^[-*•]\s+(.*)$/);
            const content = itemMatch ? itemMatch[1] : line;
            if (currentGroup) {
              currentGroup.items.push(content);
            } else {
              groups.push({ number: '', title: content, items: [] });
            }
          }
        }

        return (
          <div key={pIdx} className="space-y-2.5 my-2.5">
            {groups.map((group, gIdx) => (
              <div
                key={gIdx}
                className="p-3 sm:p-3.5 rounded-xl bg-[var(--paper)]/60 border border-[var(--line)]/80 shadow-2xs hover:border-[var(--line)] transition-colors space-y-1.5"
              >
                <div className="flex items-center gap-2">
                  {group.number && (
                    <span className="w-5 h-5 rounded-full bg-[var(--ink)] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                      {group.number}
                    </span>
                  )}
                  <h4 className="text-xs sm:text-sm font-bold text-[var(--ink)]">
                    {renderInlineFormatted(group.title)}
                  </h4>
                </div>

                {group.items.length > 0 && (
                  <div className="pl-7 space-y-1 pt-0.5">
                    {group.items.map((sub, sIdx) => (
                      <div key={sIdx} className="flex items-start gap-2 text-xs sm:text-[13px] text-[var(--ink-soft)] leading-relaxed">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--rosewood)]/70 flex-shrink-0 mt-1.5" />
                        <span className="flex-1">{renderInlineFormatted(sub)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      }

      // Standard flat list
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
    const isRecommendation = /^(focus on|recommended action|recommended|action|tip|key takeaway|strategy|next steps?):?/i.test(para);
    if (isRecommendation) {
      const rawContent = para
        .replace(/^(focus on|recommended action|recommended|action|tip|key takeaway|strategy|next steps?):?\s*/i, '')
        .trim();

      const actionItems = rawContent
        .split(/(?:^|\n|\s+)-\s+/)
        .map(a => a.trim())
        .filter(Boolean);

      return (
        <div
          key={pIdx}
          className="p-3.5 sm:p-4 rounded-xl bg-[var(--paper)]/80 border-l-4 border-l-[var(--rosewood)] border border-[var(--line)] shadow-2xs my-3 space-y-2"
        >
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--rosewood)]">
            <Icon name="sparkle" size={13} />
            <span>Recommended Executive Action</span>
          </div>

          {actionItems.length > 1 ? (
            <div className="space-y-1.5 pt-0.5">
              {actionItems.map((act, aIdx) => (
                <div key={aIdx} className="flex items-start gap-2 text-xs sm:text-sm text-[var(--ink)] font-normal leading-relaxed">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--rosewood)] flex-shrink-0 mt-1.5" />
                  <span className="flex-1">{renderInlineFormatted(act)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs sm:text-sm leading-relaxed text-[var(--ink)] font-normal">
              {renderInlineFormatted(rawContent.replace(/^-\s*/, ''))}
            </div>
          )}
        </div>
      );
    }

    // 4. Standard Paragraph
    return (
      <p key={pIdx} className="leading-relaxed">
        {renderInlineFormatted(para)}
      </p>
    );
  };

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
            title="Copy full response"
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
          {hasDraft ? (
            <>
              {draftBeforeParas.map((para, idx) => renderParagraphBlock(para, idx))}
              <OutreachDraftCard title={draftTitle} body={draftBody} />
              {draftAfterParas.map((para, idx) => renderParagraphBlock(para, idx + 100))}
            </>
          ) : (
            rawParagraphs.map((para, pIdx) => renderParagraphBlock(para, pIdx))
          )}
        </div>
      </div>
    </div>
  );
}
