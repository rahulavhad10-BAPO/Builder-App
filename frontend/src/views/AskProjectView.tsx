import React, { useState, useEffect, useRef } from 'react';
import { ApiClient } from '../api/client.js';
import {
  Sparkles,
  ArrowUp,
  MessageSquare,
  PlusCircle,
  Trash2,
  Copy,
  Check,
  FileText,
  ArrowRight,
  Key,
  X,
} from 'lucide-react';

interface ConversationTurn {
  id: string;
  query: string;
  response: {
    answer: string;
    sources?: Array<{
      documentName: string;
      score?: number;
      snippet?: string;
    }>;
    drillDownRoute?: string;
  };
  timestamp: Date;
}

// Clean helper component to render Markdown text including Markdown tables, bold, and lists
const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  if (!content) return null;

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inTable = false;
  let tableHeader: string[] = [];
  let tableRows: string[][] = [];
  let tableKey = 0;

  const flushTable = () => {
    if (inTable && tableHeader.length > 0) {
      elements.push(
        <div key={`table-${tableKey++}`} className="my-3 overflow-x-auto rounded-xl border border-slate-700/80 shadow-md">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-800 text-sky-300 font-bold border-b border-slate-700">
              <tr>
                {tableHeader.map((th, idx) => (
                  <th key={idx} className="p-2.5 text-xs">
                    {formatInlineText(th)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900/70">
              {tableRows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-800/40 transition-colors">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="p-2.5 text-slate-200">
                      {formatInlineText(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    inTable = false;
    tableHeader = [];
    tableRows = [];
  };

  const formatInlineText = (text: string) => {
    // Handle bold **text** and code `text`
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, pIdx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={pIdx} className="font-bold text-white">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={pIdx} className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-[11px] text-sky-300 border border-slate-700">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Check if line is a table row
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const cells = trimmed
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim());

      // If separator line like | :--- | :--- |
      if (cells.every((c) => /^:?-+:?$/.test(c))) {
        // Skip separator row
        return;
      }

      if (!inTable) {
        inTable = true;
        tableHeader = cells;
      } else {
        tableRows.push(cells);
      }
      return;
    } else {
      if (inTable) {
        flushTable();
      }
    }

    if (!trimmed) {
      elements.push(<div key={`empty-${idx}`} className="h-2" />);
      return;
    }

    // Headers
    if (trimmed.startsWith('### ')) {
      elements.push(
        <h3 key={`h3-${idx}`} className="text-sm font-bold text-white mt-3 mb-1.5">
          {formatInlineText(trimmed.replace('### ', ''))}
        </h3>
      );
      return;
    }
    if (trimmed.startsWith('## ')) {
      elements.push(
        <h2 key={`h2-${idx}`} className="text-sm font-bold text-sky-400 mt-3 mb-1.5">
          {formatInlineText(trimmed.replace('## ', ''))}
        </h2>
      );
      return;
    }

    // Bullet points
    if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      elements.push(
        <div key={`bullet-${idx}`} className="flex items-start gap-2 pl-2 my-1 text-slate-300 text-xs">
          <span className="text-sky-400 font-bold shrink-0 mt-0.5">&bull;</span>
          <div className="leading-relaxed">{formatInlineText(trimmed.slice(2))}</div>
        </div>
      );
      return;
    }

    // Numbered items
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      elements.push(
        <div key={`num-${idx}`} className="flex items-start gap-2 pl-2 my-1.5 text-slate-300 text-xs">
          <span className="font-bold text-sky-400 font-mono shrink-0">{numMatch[1]}.</span>
          <div className="leading-relaxed">{formatInlineText(numMatch[2])}</div>
        </div>
      );
      return;
    }

    // Normal paragraph
    elements.push(
      <p key={`p-${idx}`} className="text-slate-300 text-xs leading-relaxed my-1">
        {formatInlineText(trimmed)}
      </p>
    );
  });

  if (inTable) {
    flushTable();
  }

  return <div className="space-y-1">{elements}</div>;
};

export const AskProjectView: React.FC<{
  projectId?: string;
  onNavigate?: (tab: string, filter?: any) => void;
}> = ({ onNavigate }) => {
  const [query, setQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [conversationTurns, setConversationTurns] = useState<ConversationTurn[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [keyModalOpen, setKeyModalOpen] = useState<boolean>(false);
  const [geminiApiKey, setGeminiApiKey] = useState<string>(
    localStorage.getItem('BUILDER_GEMINI_API_KEY') || ''
  );
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Suggested prompt pills (Gemini style)
  const SUGGESTED_QUESTIONS = [
    {
      title: 'Contractor Contacts Table',
      prompt: 'Show contractor contact details and phone numbers in a table',
      icon: '📋',
    },
    {
      title: 'Tower A Weekly Progress',
      prompt: 'What is the daily progress report for this week for Tower A?',
      icon: '🏗️',
    },
    {
      title: 'Fire Safety NOC Clearance',
      prompt: 'Show me the fire safety CFO NOC clearance details and checklist',
      icon: '🔥',
    },
    {
      title: 'Overdue Collections',
      prompt: 'What is the total overdue collection amount and pending demands?',
      icon: '💰',
    },
  ];

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationTurns, loading]);

  const handleAsk = async (userPrompt: string) => {
    const q = userPrompt.trim();
    if (!q || loading) return;

    setLoading(true);
    setQuery('');

    try {
      const response = await ApiClient.askProject(q);
      const newTurn: ConversationTurn = {
        id: `turn-${Date.now()}`,
        query: q,
        response: {
          answer: response.answer || 'No answer generated.',
          sources: response.sources || [],
          drillDownRoute: response.drillDownRoute,
        },
        timestamp: new Date(),
      };
      setConversationTurns((prev) => [...prev, newTurn]);
    } catch (err: any) {
      const errorTurn: ConversationTurn = {
        id: `turn-${Date.now()}`,
        query: q,
        response: {
          answer: `Error retrieving response: ${err.message || 'Unable to connect to service.'}`,
        },
        timestamp: new Date(),
      };
      setConversationTurns((prev) => [...prev, errorTurn]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const saveGeminiKey = () => {
    localStorage.setItem('BUILDER_GEMINI_API_KEY', geminiApiKey.trim());
    setKeyModalOpen(false);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-6.5rem)]">
      {/* 1. LEFT SIDEBAR: Conversations & Sessions */}
      <div className="lg:w-64 shrink-0 bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col justify-between shadow-sm">
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-sky-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">Chat History</span>
            </div>
            <button
              onClick={() => setConversationTurns([])}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 text-[11px] font-semibold transition-colors cursor-pointer"
              title="Start a new chat"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
          </div>

          {/* List of Previous Turns in this session */}
          <div className="overflow-y-auto max-h-[calc(100vh-16rem)] space-y-1.5 pr-1">
            {conversationTurns.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs">
                No questions asked yet. Ask a question to begin.
              </div>
            ) : (
              conversationTurns.map((turn) => (
                <div
                  key={turn.id}
                  className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-300 flex items-start gap-2 hover:bg-slate-800/40 transition-colors"
                >
                  <Sparkles className="w-3 h-3 text-sky-400 shrink-0 mt-0.5" />
                  <div className="truncate flex-1 font-medium">{turn.query}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Bottom Sidebar: Clear and LLM Key settings */}
        <div className="pt-2 border-t border-slate-800 space-y-1.5">
          <button
            onClick={() => setKeyModalOpen(true)}
            className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
          >
            <Key className="w-3.5 h-3.5 text-amber-400" />
            <span>{geminiApiKey ? 'Gemini Key Configured' : 'Configure Gemini Key'}</span>
          </button>

          {conversationTurns.length > 0 && (
            <button
              onClick={() => setConversationTurns([])}
              className="w-full flex items-center justify-center gap-1.5 text-[11px] text-slate-500 hover:text-rose-400 py-1 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear Chat</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. MAIN CHAT AREA (Google Gemini Style) */}
      <div className="flex-1 flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {/* Top Header Bar */}
        <div className="p-3.5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-sky-500 via-indigo-500 to-emerald-400 flex items-center justify-center shadow-md">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>Gemini Project Intelligence</span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Natural-language Q&A across live operational database, contractor DPRs & drawings
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/80 text-[10px] font-mono text-emerald-300 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Assistant Online</span>
            </div>
          </div>
        </div>

        {/* Message Stream Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {conversationTurns.length === 0 ? (
            /* Empty State: Google Gemini Greeting & Prompt Cards */
            <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto space-y-6 py-8 animate-in fade-in">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-emerald-400 flex items-center justify-center shadow-xl">
                <Sparkles className="w-6 h-6 text-white" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xl font-bold text-white">How can I help with your project today?</h3>
                <p className="text-xs text-slate-400">
                  Ask any question about contractor contact details, site DPRs, statutory NOCs, or collections.
                </p>
              </div>

              {/* Prompt Suggestion Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full text-left">
                {SUGGESTED_QUESTIONS.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAsk(item.prompt)}
                    className="p-3 rounded-xl bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 hover:border-sky-500/50 transition-all text-xs cursor-pointer flex flex-col gap-1 group shadow-sm"
                  >
                    <div className="flex items-center gap-1.5 font-semibold text-slate-200 group-hover:text-sky-300">
                      <span>{item.icon}</span>
                      <span>{item.title}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      "{item.prompt}"
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Conversational Stream (User -> Gemini) */
            conversationTurns.map((turn) => (
              <div key={turn.id} className="space-y-4 animate-in fade-in">
                {/* User Message (Right Aligned Bubble) */}
                <div className="flex justify-end">
                  <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl bg-sky-600 px-4 py-2.5 text-white text-xs font-medium shadow-md leading-relaxed">
                    {turn.query}
                  </div>
                </div>

                {/* Gemini Response (Left Aligned with Avatar & Markdown) */}
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-sky-500 via-indigo-500 to-emerald-400 flex items-center justify-center shrink-0 shadow-md mt-0.5">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>

                  <div className="flex-1 bg-slate-950 border border-slate-800/90 rounded-2xl p-4 shadow-sm space-y-3">
                    {/* Answer Content */}
                    <div className="text-xs text-slate-200 leading-relaxed font-sans">
                      <MarkdownRenderer content={turn.response.answer} />
                    </div>

                    {/* Sources (if available) */}
                    {turn.response.sources && turn.response.sources.length > 0 && (
                      <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                        <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1">
                          <FileText className="w-3 h-3 text-sky-400" />
                          <span>Referenced Project Records ({turn.response.sources.length}):</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {turn.response.sources.map((s, sIdx) => (
                            <span
                              key={sIdx}
                              className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-sky-300 font-mono"
                              title={s.snippet}
                            >
                              {s.documentName}
                              {s.score !== undefined && ` (${Math.round(s.score * 100)}%)`}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions: Copy & Drill-down button */}
                    <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
                      <button
                        onClick={() => handleCopy(turn.id, turn.response.answer)}
                        className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                      >
                        {copiedId === turn.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>

                      {turn.response.drillDownRoute && onNavigate && (
                        <button
                          onClick={() => {
                            const r = turn.response.drillDownRoute!;
                            if (r.includes('contractors')) onNavigate('contractors');
                            else if (r.includes('compliance')) onNavigate('compliance');
                            else if (r.includes('operations')) onNavigate('operations');
                            else if (r.includes('flats')) onNavigate('flats');
                            else onNavigate('dashboard');
                          }}
                          className="flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300 font-semibold cursor-pointer"
                        >
                          <span>Open in Module</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Loading Indicator */}
          {loading && (
            <div className="flex items-start gap-3 animate-in fade-in">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-sky-500 via-indigo-500 to-emerald-400 flex items-center justify-center shrink-0 shadow-md">
                <Sparkles className="w-4 h-4 text-white animate-spin" />
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-slate-400 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></div>
                <span>Gemini is analyzing project records and synthesizing response...</span>
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Bottom Floating Prompt Input Box (Gemini Style) */}
        <div className="p-3.5 bg-slate-950/80 border-t border-slate-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAsk(query);
            }}
            className="flex items-center gap-2 max-w-4xl mx-auto bg-slate-900 border border-slate-700/80 rounded-2xl px-3 py-1.5 focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500 shadow-lg transition-all"
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask anything about the project (e.g. contractor contacts, Tower A progress, fire safety NOC)..."
              className="flex-1 bg-transparent border-0 px-2 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 disabled:opacity-40 disabled:hover:from-sky-600 disabled:hover:to-indigo-600 text-white flex items-center justify-center cursor-pointer shadow-md transition-all shrink-0"
              title="Send question"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </form>
          <div className="text-center text-[10px] text-slate-500 mt-1.5">
            Gemini Assistant answers with live project records and site operations.
          </div>
        </div>
      </div>

      {/* Optional Gemini API Key Configuration Modal */}
      {keyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-white text-sm">Google Gemini API Key</h3>
              </div>
              <button onClick={() => setKeyModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              To enable Google Gemini 1.5/2.0 generative synthesis, enter your API key below. If left blank, the application uses the built-in natural intelligence engine.
            </p>

            <div>
              <input
                type="password"
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setKeyModalOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveGeminiKey}
                className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold cursor-pointer"
              >
                Save Key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
