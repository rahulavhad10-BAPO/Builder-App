import React, { useState } from 'react';
import { ApiClient } from '../api/client.js';
import {
  Sparkles,
  Search,
  Database,
  ArrowRight,
  Info,
} from 'lucide-react';

interface AskProjectViewProps {
  projectId: string;
  onNavigate: (tab: string, filter?: any) => void;
}

export const AskProjectView: React.FC<AskProjectViewProps> = ({ projectId, onNavigate }) => {
  const [query, setQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [conversation, setConversation] = useState<Array<{
    query: string;
    response: any;
    timestamp: Date;
  }>>([
    {
      query: 'What is the current status of the project?',
      response: {
        queryType: 'STRUCTURED_RELATIONAL',
        success: true,
        answer: 'Skyline Solitaire Towers is currently IN PROGRESS. 10 of 24 units sold. Statutory compliance is at 77.8% (Fire CFO approval granted). 1 overdue cement demand flagged.',
        drillDownRoute: '/dashboard',
        sources: [{ type: 'RELATIONAL_DATABASE', table: 'Live PostgreSQL / SQLite Entities', timestamp: new Date() }],
      },
      timestamp: new Date(),
    },
  ]);

  const presetQueries = [
    'Which material demands are overdue?',
    'What is the next demand for Flat A-1204?',
    'Which POs have quantity mismatches?',
    'How many flats are available?',
    'What is the compliance status of Tower A?',
    'How much has customer Vivek Saxena paid?',
    'What does the contractor agreement specify about penalties?',
    'Show me the latest fire safety approval.',
  ];

  const handleAsk = async (promptText: string) => {
    if (!promptText.trim()) return;
    setLoading(true);
    try {
      const result = await ApiClient.askProject(promptText, projectId);
      setConversation((prev) => [
        ...prev,
        {
          query: promptText,
          response: result,
          timestamp: new Date(),
        },
      ]);
      setQuery('');
    } catch (err: any) {
      setConversation((prev) => [
        ...prev,
        {
          query: promptText,
          response: {
            success: false,
            answer: err.message || 'Error processing query',
          },
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 border border-indigo-800/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>Hybrid Query Interface</span>
            </span>
            <span className="text-xs text-slate-400">Structured DB + RAG Ready</span>
          </div>
          <h2 className="text-xl font-extrabold text-white mt-1">Ask Project Assistant</h2>
          <p className="text-xs text-slate-300">
            Query operational metrics, overdue demands, unit payments, and compliance status in real-time.
          </p>
        </div>

        {/* State Badge */}
        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-right">
          <div className="text-[10px] text-slate-400">Vector Mode</div>
          <div className="text-xs font-bold font-mono text-amber-400">RAG_ENABLED=false</div>
          <div className="text-[10px] text-slate-500">Live DB Active • RAG Deferred</div>
        </div>
      </div>

      {/* Preset Questions Chips */}
      <div>
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
          Recommended Operational Queries:
        </div>
        <div className="flex flex-wrap gap-2">
          {presetQueries.map((pq, idx) => (
            <button
              key={idx}
              onClick={() => handleAsk(pq)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-sky-300 transition-colors text-left flex items-center gap-1.5 cursor-pointer"
            >
              <Search className="w-3 h-3 text-sky-400" />
              <span>{pq}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Conversation Thread */}
      <div className="space-y-4">
        {conversation.map((entry, idx) => {
          const resp = entry.response;
          const isStructured = resp?.queryType === 'STRUCTURED_RELATIONAL';
          const isRagDisabled = !resp?.ragConfigured && resp?.queryType === 'UNSTRUCTURED_DOCUMENT';

          return (
            <div key={idx} className="space-y-2">
              {/* User Question Bubble */}
              <div className="flex justify-end">
                <div className="max-w-xl p-3.5 rounded-2xl rounded-tr-sm bg-sky-600 text-white text-xs font-medium shadow-md">
                  {entry.query}
                </div>
              </div>

              {/* System Answer Card */}
              <div className="flex justify-start">
                <div className="max-w-2xl w-full p-4 rounded-2xl rounded-tl-sm bg-slate-900 border border-slate-800 space-y-3 shadow-md">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${isStructured ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                        {isStructured ? <Database className="w-3.5 h-3.5" /> : <Info className="w-3.5 h-3.5" />}
                      </div>
                      <span className="text-xs font-bold text-white">
                        {isStructured ? 'Operational Database Answer' : 'RAG Contract Response'}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">
                      {new Date(entry.timestamp).toLocaleTimeString('en-IN')}
                    </span>
                  </div>

                  {/* Body text */}
                  <div className="text-xs text-slate-200 leading-relaxed">
                    {resp.answer}
                  </div>

                  {/* Note for RAG disabled queries */}
                  {isRagDisabled && (
                    <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-amber-300 space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5" />
                        <span>AI/RAG Architecture Status</span>
                      </div>
                      <p className="text-slate-400">{resp.note}</p>
                    </div>
                  )}

                  {/* Structured Data Preview if present */}
                  {resp.data && Array.isArray(resp.data) && (
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                      <div className="text-[10px] text-slate-400 font-bold uppercase mb-2">Result Records:</div>
                      <div className="space-y-1 font-mono text-[11px] text-sky-300">
                        {resp.data.slice(0, 3).map((item: any, i: number) => (
                          <div key={i} className="truncate">
                            • {JSON.stringify(item)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Drilldown button */}
                  {resp.drillDownRoute && (
                    <div className="pt-2 border-t border-slate-800 flex justify-end">
                      <button
                        onClick={() => {
                          const route = resp.drillDownRoute;
                          if (route.includes('flats')) onNavigate('flats');
                          else if (route.includes('procurement')) onNavigate('procurement');
                          else if (route.includes('compliance')) onNavigate('compliance');
                          else if (route.includes('issues')) onNavigate('operations');
                          else if (route.includes('crm')) onNavigate('crm');
                          else onNavigate('dashboard');
                        }}
                        className="flex items-center gap-1 text-xs font-bold text-sky-400 hover:text-sky-300 cursor-pointer"
                      >
                        <span>Navigate to Module Records</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Query Input Bar */}
      <div className="sticky bottom-4 pt-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk(query);
          }}
          className="relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-1.5 flex items-center gap-2"
        >
          <Search className="w-4 h-4 ml-3 text-slate-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask a question (e.g. Which material demands are overdue?)..."
            className="w-full bg-transparent border-0 px-2 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shrink-0 transition-all shadow-md"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{loading ? 'Thinking...' : 'Ask Assistant'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
