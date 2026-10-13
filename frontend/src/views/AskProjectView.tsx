import React, { useState, useEffect } from 'react';
import { ApiClient } from '../api/client.js';
import {
  Sparkles,
  Search,
  ArrowRight,
  FileText,
  PlusCircle,
  MessageSquare,
  Trash2,
} from 'lucide-react';

interface AskProjectViewProps {
  projectId: string;
  onNavigate: (tab: string, filter?: any) => void;
}

interface ConversationItem {
  id: string;
  query: string;
  response: any;
  timestamp: Date;
}

export const AskProjectView: React.FC<AskProjectViewProps> = ({ projectId, onNavigate }) => {
  const [query, setQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [activeConversationId, setActiveConversationId] = useState<string>('init-1');
  const [ragInfo, setRagInfo] = useState<{
    enabled: boolean;
    provider?: string;
    totalChunks?: number;
    indexedDocuments?: number;
    indexedDrawings?: number;
  }>({
    enabled: true,
    totalChunks: 8,
    indexedDocuments: 2,
    indexedDrawings: 2,
  });

  const [conversationHistory, setConversationHistory] = useState<ConversationItem[]>([
    {
      id: 'init-1',
      query: 'What is the daily progress report for this week for Tower A?',
      response: {
        queryType: 'STRUCTURED_RELATIONAL',
        success: true,
        answer: `Executive Weekly Site Progress Summary: Tower A (Skyline Solitaire)
Reporting Period: 7 Oct - 13 Oct, 2026 | Total Site Workforce: 178 Pax across 4 Active Contractors

Executive Synopsis:
Multi-trade execution in Tower A is proceeding across structural concrete pours, MEP riser shafts, and interior masonry. All contractor daily logs for this week have been retrieved and consolidated:

Contractor Execution Breakdown:
1. Larsen & Toubro Civil Infra Ltd (Structural RCC, Concrete Pours & Core Infrastructure):
   • Planned Work: "Slab reinforcement binding for 15th floor slab and shear wall shuttering"
   • Achieved EoD: "Completed 14th floor shear wall core shuttering and 85% 15th floor bottom mesh rebar binding. Cube test compressive strength achieved 42.5 MPa."
   • Manpower & Equipment: 84 Pax deployed (2 Potain Tower Cranes, 1 Concrete Placer Boom)
   • Blocker Status: ✅ Zero blockers; work is progressing on schedule.

2. Sterling & Wilson MEP Solutions (HVAC, Electrical Substation, Firefighting & Plumbing):
   • Planned Work: "Install 150mm MS firefighting central wet riser pipeline from 8th to 12th floor shaft"
   • Achieved EoD: "Wet riser pipeline pulled up to 10th floor. Hydrostatic pressure testing passed up to 6th floor at 12 kg/cm² with zero leakage."
   • Manpower & Equipment: 34 Pax deployed (4 TIG welding stations, 2 pipe-threading rigs)
   • ⚠️ Active Blocker: Awaiting architectural clearance for basement 2 HVAC chiller pump room piping layout (Escalated to: Vikram Mehta (Chief Architect))

3. KONE Elevators India Pvt Ltd (High-speed Passenger & Service Elevators):
   • Planned Work: "Align vertical traction guide rails for Passenger Elevator Car 1 & 2"
   • Achieved EoD: "Completed 90% guide rails vertical alignment and laser plumb verification up to 14th floor."
   • Manpower & Equipment: 18 Pax deployed (Laser plumb aligner, electric chain hoist)
   • Blocker Status: ✅ Zero blockers; work is progressing on schedule.

4. Apex Civil Works & Masonry Ltd (Internal Blockwork, External Plastering & Waterproofing):
   • Planned Work: "AAC blockwork masonry on 6th & 7th floor internal partitions"
   • Achieved EoD: "Constructed 1,450 sq.ft AAC block masonry walls with copings and wire mesh reinforcements."
   • Manpower & Equipment: 42 Pax deployed (Scaffolding, mechanical mortar mixer)
   • Blocker Status: ✅ Zero blockers; work is progressing on schedule.

Site Blockers & Delay Escalations:
⚠️ [Sterling & Wilson MEP Solutions]: Awaiting architectural clearance for basement 2 HVAC chiller pump room piping layout
  - Escalated To: Vikram Mehta (Chief Architect)
  - Delay Impact: 3-day potential hold on chiller manifold fabrication if drawing revision is delayed

Safety Adherence: Zero lost-time incidents; 100% PPE adherence certified across all shifts.`,
        drillDownRoute: '/operations?tab=daily',
        sources: [
          {
            documentName: 'Tower A Contractor Daily Progress Reports (Consolidated DPRs)',
            version: 1,
            score: 0.98,
            snippet: 'Multi-contractor daily reports for Tower A: L&T, Sterling & Wilson, KONE, and Apex Civil Works.',
          },
        ],
      },
      timestamp: new Date(),
    },
  ]);

  useEffect(() => {
    ApiClient.getRAGStatus()
      .then((data) => {
        if (data) setRagInfo(data);
      })
      .catch(() => {});
  }, []);

  const placeholderQueries = [
    'What is the daily progress report for this week for Tower A?',
    'What is the current project status and blockers for Sterling & Wilson?',
    'Show me the fire safety CFO NOC clearance details and checklist.',
    'What are the structural rebar details for Tower A?',
    'Which material demands are currently overdue?',
    'What does the contractor agreement specify about delay penalties?',
    'How many flats are currently available?',
    'What is the compliance percentage of the project?',
  ];

  const handleAsk = async (promptText: string) => {
    const textToSubmit = promptText.trim() || query.trim();
    if (!textToSubmit) return;

    setQuery(textToSubmit);
    setLoading(true);

    try {
      const result = await ApiClient.askProject(textToSubmit, projectId);
      const newEntry: ConversationItem = {
        id: `conv-${Date.now()}`,
        query: textToSubmit,
        response: result,
        timestamp: new Date(),
      };
      setConversationHistory((prev) => [newEntry, ...prev]);
      setActiveConversationId(newEntry.id);
    } catch (err: any) {
      const errorEntry: ConversationItem = {
        id: `conv-${Date.now()}`,
        query: textToSubmit,
        response: {
          success: false,
          answer: err.message || 'Error executing query against project vector database.',
          sources: [],
        },
        timestamp: new Date(),
      };
      setConversationHistory((prev) => [errorEntry, ...prev]);
      setActiveConversationId(errorEntry.id);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceholderClick = (pq: string) => {
    setQuery(pq);
    handleAsk(pq);
  };

  const activeEntry =
    conversationHistory.find((c) => c.id === activeConversationId) || conversationHistory[0];

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-140px)] min-h-[620px]">
      {/* 1. SIDEBAR: Conversations & Query History */}
      <div className="lg:w-72 shrink-0 bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex flex-col shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">Conversations</span>
          </div>
          <button
            onClick={() => {
              setQuery('');
              setActiveConversationId('');
            }}
            className="flex items-center gap-1 px-2 py-1 rounded bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 text-[11px] font-semibold transition-colors cursor-pointer"
            title="Start new question"
          >
            <PlusCircle className="w-3 h-3" />
            <span>New</span>
          </button>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
          {conversationHistory.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              No questions asked yet. Enter a question or select a placeholder below!
            </div>
          ) : (
            conversationHistory.map((item) => {
              const isActive = item.id === activeConversationId;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveConversationId(item.id);
                    setQuery(item.query);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all flex flex-col gap-1 cursor-pointer ${
                    isActive
                      ? 'bg-sky-950/40 border-sky-600/50 text-white shadow-sm'
                      : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-start gap-1.5 line-clamp-2 font-medium leading-snug">
                    <Sparkles className={`w-3 h-3 shrink-0 mt-0.5 ${isActive ? 'text-sky-400' : 'text-slate-500'}`} />
                    <span className="break-words">{item.query}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between mt-0.5">
                    <span>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {item.response?.sources?.length > 0 && (
                      <span className="text-emerald-400">RAG Verified</span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {conversationHistory.length > 0 && (
          <div className="pt-2 border-t border-slate-800 mt-2">
            <button
              onClick={() => {
                setConversationHistory([]);
                setActiveConversationId('');
                setQuery('');
              }}
              className="w-full flex items-center justify-center gap-1.5 text-[11px] text-slate-500 hover:text-rose-400 py-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear History</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. MAIN WORKSPACE */}
      <div className="flex-1 flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {/* Header Status Bar */}
        <div className="p-3.5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-white">Ask Project Assistant & Executive Intelligence</h2>
              <p className="text-[11px] text-slate-400">
                Natural-language Q&A across live project database, contractor DPRs, signed contracts & CAD drawings
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-right">
            <div className="px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-800/80 text-[10px] font-mono text-emerald-300 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Dense Vector Engine Online ({ragInfo.totalChunks ?? 8} chunks)</span>
            </div>
          </div>
        </div>

        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* A) PROMPT BOX ALWAYS ON TOP */}
          <div className="bg-slate-950 border border-slate-700/80 rounded-2xl p-2 shadow-lg focus-within:border-sky-500 transition-colors">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAsk(query);
              }}
              className="flex items-center gap-2"
            >
              <Search className="w-4 h-4 ml-2.5 text-slate-400 shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask any question (e.g. What is the daily progress report for this week for Tower A?)..."
                className="w-full bg-transparent border-0 px-2 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shrink-0 transition-all shadow-md"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{loading ? 'Retrieving Chunks...' : 'Ask Project'}</span>
              </button>
            </form>
          </div>

          {/* B) PLACEHOLDER QUESTIONS DIRECTLY BELOW PROMPT BOX */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <span>Suggested & Recommended Questions (Click to Ask):</span>
              <span className="text-[10px] lowercase font-normal text-slate-500">auto-submits on click</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {placeholderQueries.map((pq, idx) => (
                <button
                  key={idx}
                  onClick={() => handlePlaceholderClick(pq)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-950/80 hover:bg-slate-800 hover:border-sky-500/50 text-slate-300 hover:text-sky-300 text-xs transition-all text-left flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Search className="w-3 h-3 text-sky-400 shrink-0" />
                  <span>{pq}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Loading Indicator */}
          {loading && (
            <div className="p-8 rounded-2xl bg-slate-950/50 border border-slate-800/80 text-center space-y-3 animate-in fade-in">
              <div className="w-8 h-8 rounded-full border-2 border-sky-400 border-t-transparent animate-spin mx-auto"></div>
              <div className="text-xs font-semibold text-white">Synthesizing Answer from Grounded Project Records...</div>
              <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                Scanning dense vector embeddings across contractor DPRs, signed agreements, statutory approvals and live databases.
              </p>
            </div>
          )}

          {/* C) ANSWER DISPLAY CARD */}
          {!loading && activeEntry && (
            <div className="space-y-3 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3.5 shadow-md">
                {/* Answer Card Top Header */}
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-300">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Synthesized Executive Response</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Query: <span className="text-slate-300">"{activeEntry.query}"</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] font-mono text-slate-500">
                    {new Date(activeEntry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </div>
                </div>

                {/* Natural Language Body Text */}
                <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-line font-sans">
                  {activeEntry.response?.answer || 'No answer generated.'}
                </div>

                {/* Retrieved Vector Chunks / Source Evidence */}
                {activeEntry.response?.sources && activeEntry.response.sources.length > 0 && (
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/90 space-y-2">
                    <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider text-slate-400">
                      <span className="flex items-center gap-1 text-amber-300">
                        <Sparkles className="w-3 h-3" />
                        <span>Retrieved Grounding Sources ({activeEntry.response.sources.length} Verified References)</span>
                      </span>
                      <span className="text-emerald-400 font-mono">Cosine Similarity Ranked</span>
                    </div>

                    <div className="space-y-1.5">
                      {activeEntry.response.sources.map((src: any, sIdx: number) => (
                        <div
                          key={sIdx}
                          className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] flex flex-col gap-1"
                        >
                          <div className="flex items-center justify-between font-semibold">
                            <span className="text-sky-300 flex items-center gap-1.5 truncate">
                              <FileText className="w-3 h-3 text-sky-400 shrink-0" />
                              {src.documentName}
                            </span>
                            {src.score !== undefined && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800/80 shrink-0">
                                {Math.round(src.score * 100)}% Match
                              </span>
                            )}
                          </div>
                          {src.snippet && (
                            <div className="text-[10px] text-slate-400 italic line-clamp-2">
                              "{src.snippet}"
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Direct Module Drilldown Route */}
                {activeEntry.response?.drillDownRoute && (
                  <div className="pt-2 border-t border-slate-800 flex justify-end">
                    <button
                      onClick={() => {
                        const route = activeEntry.response.drillDownRoute;
                        if (route.includes('operations')) onNavigate('operations');
                        else if (route.includes('contractors')) onNavigate('contractors');
                        else if (route.includes('compliance')) onNavigate('compliance');
                        else if (route.includes('flats')) onNavigate('flats');
                        else if (route.includes('procurement')) onNavigate('procurement');
                        else onNavigate('dashboard');
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 text-xs font-bold border border-sky-500/30 transition-colors cursor-pointer"
                    >
                      <span>View Live Operational Records in Module</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
