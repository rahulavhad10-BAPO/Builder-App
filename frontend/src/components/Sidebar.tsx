import React from 'react';
import {
  LayoutDashboard,
  Building2,
  Users,
  Package,
  ShoppingCart,
  Calculator,
  ShieldCheck,
  FileText,
  Compass,
  HardHat,
  ClipboardList,
  MessageSquareText,
  Sliders,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  openExceptionsCount?: number;
  overdueDemandsCount?: number;
  openIssuesCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  openExceptionsCount = 0,
  overdueDemandsCount = 0,
  openIssuesCount = 0,
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'Command Center', icon: LayoutDashboard },
    { id: 'flats', label: 'Flat Inventory', icon: Building2, badge: 'Real Estate' },
    { id: 'crm', label: 'CRM & Collections', icon: Users, badge: overdueDemandsCount > 0 ? `${overdueDemandsCount} Due` : undefined, badgeColor: 'bg-amber-500/20 text-amber-300' },
    { id: 'material-inventory', label: 'Material Inventory', icon: Package },
    { id: 'procurement', label: 'Procurement & PO', icon: ShoppingCart, badge: openExceptionsCount > 0 ? `${openExceptionsCount} Alert` : undefined, badgeColor: 'bg-rose-500/20 text-rose-300' },
    { id: 'boq', label: 'BOQ Management', icon: Calculator },
    { id: 'compliance', label: 'Statutory Compliance', icon: ShieldCheck },
    { id: 'documents', label: 'Document Storage', icon: FileText },
    { id: 'drawings', label: 'Drawings Registry', icon: Compass },
    { id: 'contractors', label: 'Contractors Master', icon: HardHat },
    { id: 'operations', label: 'Site Operations', icon: ClipboardList, badge: openIssuesCount > 0 ? `${openIssuesCount} Open` : undefined, badgeColor: 'bg-blue-500/20 text-blue-300' },
    { id: 'ask-project', label: 'Ask Project', icon: MessageSquareText, highlight: true },
    { id: 'admin', label: 'System & Admin', icon: Sliders },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen shrink-0">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-sky-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20">
          <Building2 className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xs font-semibold tracking-wider text-sky-400 uppercase">Enterprise ERP</div>
          <h1 className="text-sm font-bold text-white tracking-tight leading-tight">BUILDER OPS</h1>
          <div className="text-[10px] text-slate-400 font-medium tracking-wide">COMMAND CENTER</div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-sky-600 text-white font-semibold shadow-md shadow-sky-600/30'
                  : item.highlight
                  ? 'bg-indigo-950/50 text-indigo-300 hover:bg-indigo-900/60 border border-indigo-800/40'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.highlight ? 'text-indigo-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${item.badgeColor || 'bg-slate-800 text-slate-300'}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Operational Mode Badge */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60">
        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
          <span>AI / RAG Mode</span>
          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono">
            RAG_ENABLED=false
          </span>
        </div>
        <div className="text-[10px] text-slate-500 leading-tight">
          Pure Operational Database Engine active. Vector retrieval deferred.
        </div>
      </div>
    </aside>
  );
};
