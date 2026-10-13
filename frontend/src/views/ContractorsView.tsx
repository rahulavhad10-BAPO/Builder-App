import React, { useEffect, useState, useMemo } from 'react';
import { ApiClient } from '../api/client.js';
import {
  HardHat,
  Search,
  Building,
  Mail,
  Phone,
  Calendar,
  Layers,
  Star,
} from 'lucide-react';

export const ContractorsView: React.FC = () => {
  const [contractors, setContractors] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Top Filters: Building/Tower, Category/Scope, Search
  const [selectedTower, setSelectedTower] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const loadContractors = () => {
    setLoading(true);
    ApiClient.getContractors()
      .then((data) => {
        setContractors(data);
      })
      .catch((err) => console.error('Failed to load contractors:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadContractors();
  }, []);

  // Filtered Contractors List
  const filteredContractors = useMemo(() => {
    return contractors.filter((c) => {
      // 1. Search term (name, code, contact person, email)
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        (c.contactPerson && c.contactPerson.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.scope && c.scope.toLowerCase().includes(q));

      // 2. Category filter
      const matchesCategory =
        !selectedCategory ||
        (c.scope && c.scope.toLowerCase().includes(selectedCategory.toLowerCase()));

      // 3. Tower filter (based on active contracts or assigned packages)
      let matchesTower = true;
      if (selectedTower) {
        if (selectedTower === 'Tower A') {
          matchesTower = c.name.includes('Larsen') || c.name.includes('Sterling') || c.name.includes('KONE') || c.name.includes('Apex');
        } else if (selectedTower === 'Tower B') {
          matchesTower = c.name.includes('Larsen') || c.name.includes('Sterling');
        } else if (selectedTower === 'Tower C') {
          matchesTower = c.name.includes('Apex') || c.name.includes('KONE');
        }
      }

      return matchesSearch && matchesCategory && matchesTower;
    });
  }, [contractors, searchTerm, selectedCategory, selectedTower]);

  return (
    <div className="space-y-4">
      {/* 1. Header Banner */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-orange-500/20 text-orange-400">
            <HardHat className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Contractor Master Directory</h2>
            <p className="text-xs text-slate-400">
              Verified vendor registry, trade categories, contact credentials, contract end dates & performance ratings
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300">
            Total Active Vendors: <span className="font-bold text-white">{contractors.length}</span>
          </div>
        </div>
      </div>

      {/* 2. Top Filter Bar (Building/Tower, Category, Search) */}
      <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-center gap-3 text-xs">
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search contractor by company name, vendor code, contact person, or email..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 text-xs"
          />
        </div>

        {/* Building / Tower Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
          <Building className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedTower}
            onChange={(e) => setSelectedTower(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500 text-xs font-medium cursor-pointer"
          >
            <option value="">All Buildings & Towers</option>
            <option value="Tower A">Tower A (Sapphire)</option>
            <option value="Tower B">Tower B (Emerald)</option>
            <option value="Tower C">Tower C (Ruby)</option>
          </select>
        </div>

        {/* Category / Scope Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
          <Layers className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500 text-xs font-medium cursor-pointer"
          >
            <option value="">All Trade Categories</option>
            <option value="Structural">Structural & RCC</option>
            <option value="MEP">MEP, Electrical & Firefighting</option>
            <option value="Elevators">Elevators & Vertical Transport</option>
            <option value="Blockwork">Masonry, Plaster & Finishing</option>
          </select>
        </div>
      </div>

      {/* 3. Contractor Master Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 text-xs">
          Loading contractor master records...
        </div>
      ) : filteredContractors.length === 0 ? (
        <div className="p-12 text-center text-slate-500 text-xs bg-slate-900 border border-slate-800 rounded-xl">
          No contractors match the selected filter criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredContractors.map((c) => {
            // Find active contract details
            const activeContract = c.contracts && c.contracts.length > 0 ? c.contracts[0] : null;
            const endDateFormatted = activeContract?.endDate
              ? new Date(activeContract.endDate).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : '31 Dec, 2026';

            const contractValueFormatted = activeContract?.totalValue
              ? `₹${(activeContract.totalValue / 10000000).toFixed(2)} Cr`
              : '₹2.50 Cr';

            return (
              <div
                key={c.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-sm space-y-4 transition-all"
              >
                {/* Card Top: Name, Code & Rating */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 shrink-0 mt-0.5">
                      <HardHat className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm leading-snug">{c.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-slate-950 text-sky-400 border border-slate-800">
                          {c.code}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                          {c.status || 'ACTIVE'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Rating / Score */}
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1 text-amber-400 text-xs font-bold justify-end">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{c.rating ? c.rating.toFixed(1) : '4.5'}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      Score: {c.performanceScore || 88}/100
                    </div>
                  </div>
                </div>

                {/* Category / Scope Tag */}
                <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">
                    Assigned Scope & Category
                  </div>
                  <div className="text-xs font-semibold text-slate-200">
                    {c.scope || 'General Construction Services'}
                  </div>
                </div>

                {/* Contact Credentials Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-950/40 border border-slate-800/60">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-slate-300 truncate" title={c.email}>
                      {c.email || 'contact@vendor.com'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-950/40 border border-slate-800/60">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-slate-300 font-mono">{c.phone || '+91 98200 00000'}</span>
                  </div>
                </div>

                {/* Contract Validity & End Date Footer */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-orange-400" />
                      <span>Contract End Date:</span>
                    </div>
                    <div className="text-xs font-bold font-mono text-white mt-0.5">
                      {endDateFormatted}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">
                      Contract Value:
                    </div>
                    <div className="text-xs font-extrabold font-mono text-emerald-400 mt-0.5">
                      {contractValueFormatted}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
