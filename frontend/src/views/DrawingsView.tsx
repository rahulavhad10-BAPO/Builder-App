import React, { useEffect, useState } from 'react';
import { ApiClient } from '../api/client.js';
import { Compass, ExternalLink } from 'lucide-react';

interface DrawingsViewProps {
  projectId: string;
}

export const DrawingsView: React.FC<DrawingsViewProps> = ({ projectId }) => {
  const [drawings, setDrawings] = useState<any[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  const loadDrawings = async () => {
    setLoading(true);
    try {
      const data = await ApiClient.getDrawings({
        projectId: projectId || undefined,
        category: categoryFilter || undefined,
      });
      setDrawings(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDrawings();
  }, [projectId, categoryFilter]);

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Engineering Drawings Registry</h2>
            <p className="text-xs text-slate-400">Architectural, Structural RCC, MEP & Fire Safety schematics</p>
          </div>
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-sky-500 text-xs"
        >
          <option value="">All Disciplines</option>
          <option value="STRUCTURAL">Structural RCC</option>
          <option value="ARCHITECTURAL">Architectural</option>
          <option value="MEP">MEP Packages</option>
          <option value="FIRE_SAFETY">Fire & Safety</option>
          <option value="PLUMBING">Plumbing Schematics</option>
        </select>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3">Drawing Number</th>
                <th className="p-3">Title / Discipline</th>
                <th className="p-3">Revision</th>
                <th className="p-3">Discipline</th>
                <th className="p-3">Status</th>
                <th className="p-3">Uploaded By</th>
                <th className="p-3">Revision Date</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">Loading drawings...</td>
                </tr>
              ) : drawings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">No drawings registered.</td>
                </tr>
              ) : (
                drawings.map((dwg) => (
                  <tr key={dwg.id} className="hover:bg-slate-800/40">
                    <td className="p-3 font-mono font-bold text-sky-400">{dwg.drawingNumber}</td>
                    <td className="p-3 font-semibold text-white">{dwg.name}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-amber-300 border border-slate-700">
                        {dwg.revision}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300">
                        {dwg.category.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300">
                        {dwg.status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-300">{dwg.uploadedBy}</td>
                    <td className="p-3 text-slate-400">{new Date(dwg.date).toLocaleDateString('en-IN')}</td>
                    <td className="p-3 text-right">
                      <a
                        href={dwg.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 font-semibold text-xs"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>View CAD</span>
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
