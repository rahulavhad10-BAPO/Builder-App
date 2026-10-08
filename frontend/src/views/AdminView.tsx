import React, { useEffect, useState } from 'react';
import { ApiClient } from '../api/client.js';
import { Sliders, CheckCircle2, Upload, FileSpreadsheet, AlertCircle } from 'lucide-react';

export const AdminView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'audit' | 'emails' | 'settings' | 'users' | 'import-csv'>('audit');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [settings, setSettings] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  // CSV Import State
  const [csvContent, setCsvContent] = useState<string>('');
  const [importing, setImporting] = useState<boolean>(false);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [aLogs, eLogs, sets, usrs, status] = await Promise.all([
        ApiClient.getAuditLogs(),
        ApiClient.getEmailLogs(),
        ApiClient.getSystemSettings(),
        ApiClient.getUsers(),
        ApiClient.getSystemStatus(),
      ]);
      setAuditLogs(aLogs);
      setEmailLogs(eLogs);
      setSettings(sets);
      setUsers(usrs);
      setSystemStatus(status);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateSetting = async (key: string, value: string) => {
    setSavingKey(key);
    try {
      await ApiClient.updateSystemSetting(key, value);
      await loadData();
    } catch (e: any) {
      alert(e.message || 'Failed to update setting');
    } finally {
      setSavingKey(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCsvContent(event.target?.result as string || '');
      };
      reader.readAsText(file);
    }
  };

  const loadSampleCSV = () => {
    const sample = `unitNumber,tower,floorNumber,configuration,carpetArea,saleableArea,basePrice,agreementValue,status,customerName,customerEmail,customerPhone\n` +
      `C-101,Tower C,1,2BHK,780,1100,9000000,9800000,SOLD,Aditya Rao,aditya.rao@example.com,+91 99881 22334\n` +
      `C-102,Tower C,1,3BHK,1150,1620,13200000,14200000,BOOKED,Meera Nair,meera.nair@example.com,+91 99882 33445\n` +
      `C-103,Tower C,1,2BHK,780,1100,9000000,9000000,AVAILABLE,,,`;
    setCsvContent(sample);
  };

  const handleImportCSV = async () => {
    if (!csvContent.trim()) {
      setImportError('Please provide CSV content or upload a CSV file.');
      return;
    }
    setImporting(true);
    setImportError(null);
    setImportSuccess(null);
    try {
      const res = await ApiClient.importFlatCSV(csvContent);
      setImportSuccess(`Successfully imported ${res.importedCount} units into Flat Inventory Master!`);
      setCsvContent('');
    } catch (e: any) {
      setImportError(e.message || 'Failed to import CSV. Check format and try again.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">System Administration & Audit Governance</h2>
            <p className="text-xs text-slate-400">RBAC security matrix, audit trails, email dispatch logs, and system variables</p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs flex-wrap">
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
              activeTab === 'audit' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Audit Logs ({auditLogs.length})
          </button>
          <button
            onClick={() => setActiveTab('emails')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
              activeTab === 'emails' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Email Logs ({emailLogs.length})
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
              activeTab === 'users' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            User RBAC ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('import-csv')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
              activeTab === 'import-csv' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Import Flat CSV
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
              activeTab === 'settings' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Settings & RAG
          </button>
        </div>
      </div>

      {/* System Status Banner */}
      {systemStatus && (
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
          <div>
            <span className="text-slate-400">Environment</span>
            <div className="text-white font-bold font-mono mt-0.5">{systemStatus.environment}</div>
          </div>
          <div>
            <span className="text-slate-400">Engine Status</span>
            <div className="text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{systemStatus.systemStatus}</span>
            </div>
          </div>
          <div>
            <span className="text-slate-400">Total Entities</span>
            <div className="text-white font-bold mt-0.5">
              {systemStatus.entities?.flats} Flats • {systemStatus.entities?.documents} Docs
            </div>
          </div>
          <div>
            <span className="text-slate-400">RAG Pipeline Mode</span>
            <div className="text-amber-400 font-bold font-mono mt-0.5">
              {systemStatus.ragEnabled ? 'RAG_ENABLED' : 'RAG_DISABLED'}
            </div>
          </div>
          <div>
            <span className="text-slate-400">Database Engine</span>
            <div className="text-sky-400 font-bold font-mono mt-0.5">SQLite / Prisma Relational</div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs">Loading governance records...</div>
      ) : (
        <>
          {/* TAB 1: AUDIT LOGS */}
          {activeTab === 'audit' && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3">Action</th>
                      <th className="p-3">Module</th>
                      <th className="p-3">User</th>
                      <th className="p-3">Record ID</th>
                      <th className="p-3">Audit Payload</th>
                      <th className="p-3">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 font-mono text-[11px]">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/40">
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300">
                            {log.action}
                          </span>
                        </td>
                        <td className="p-3 text-slate-300 font-semibold">{log.module}</td>
                        <td className="p-3 text-white">{log.user?.name || 'System Engine'}</td>
                        <td className="p-3 text-slate-500">{log.recordId.slice(0, 8)}...</td>
                        <td className="p-3 text-slate-400 max-w-xs truncate">
                          {log.newValue || log.previousValue || '-'}
                        </td>
                        <td className="p-3 text-slate-500">{new Date(log.timestamp).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: EMAIL LOGS */}
          {activeTab === 'emails' && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3">Recipient TO</th>
                      <th className="p-3">CC Stakeholders</th>
                      <th className="p-3">Email Subject</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Dispatched At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-xs">
                    {emailLogs.map((em) => (
                      <tr key={em.id} className="hover:bg-slate-800/40">
                        <td className="p-3 font-semibold text-white">{em.to}</td>
                        <td className="p-3 text-slate-400 max-w-xs truncate">{em.cc || 'None'}</td>
                        <td className="p-3 text-slate-200">{em.subject}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              em.status === 'SENT' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                            }`}
                          >
                            {em.status}
                          </span>
                        </td>
                        <td className="p-3 text-slate-400">{new Date(em.sentAt).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: USERS & RBAC */}
          {activeTab === 'users' && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3">Full Name</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Assigned Role</th>
                      <th className="p-3">Contact</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-xs">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-800/40">
                        <td className="p-3 font-bold text-white">{u.name}</td>
                        <td className="p-3 text-slate-300">{u.email}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                            {u.role}
                          </span>
                        </td>
                        <td className="p-3 text-slate-400">{u.phone || '-'}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300">
                            {u.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: IMPORT FLAT INVENTORY CSV */}
          {activeTab === 'import-csv' && (
            <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-5 text-xs">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-sky-500/20 text-sky-400">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Import Flat / Unit Inventory via CSV</h3>
                  <p className="text-slate-400">
                    Import property inventory exported from external sales CRM, ERP or spreadsheets into the command center.
                  </p>
                </div>
              </div>

              {importSuccess && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{importSuccess}</span>
                </div>
              )}

              {importError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                  <span>{importError}</span>
                </div>
              )}

              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/40 border border-slate-800">
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-sky-600 file:text-white hover:file:bg-sky-500 cursor-pointer"
                  />
                </div>
                <button
                  type="button"
                  onClick={loadSampleCSV}
                  className="px-3 py-1.5 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 font-semibold border border-slate-700 cursor-pointer"
                >
                  Load Sample Data Template
                </button>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  CSV Data Content (Headers required: unitNumber, tower, floorNumber, configuration, carpetArea, saleableArea, basePrice, agreementValue, status, customerName, customerEmail, customerPhone)
                </label>
                <textarea
                  rows={9}
                  value={csvContent}
                  onChange={(e) => setCsvContent(e.target.value)}
                  placeholder="Paste CSV rows here..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white font-mono text-xs focus:outline-none focus:border-sky-500 leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setCsvContent('')}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Clear
                </button>
                <button
                  onClick={handleImportCSV}
                  disabled={importing || !csvContent.trim()}
                  className="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <Upload className="w-4 h-4" />
                  <span>{importing ? 'Processing CSV...' : 'Import to Inventory Master'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {settings.map((s) => (
                  <div key={s.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="font-bold font-mono text-sky-400">{s.key}</div>
                      <span className="text-[10px] text-slate-500">System Variable</span>
                    </div>
                    <div className="text-slate-400 text-[11px]">{s.description}</div>
                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="text"
                        defaultValue={s.value}
                        id={`input-${s.key}`}
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-sky-500"
                      />
                      <button
                        onClick={() => {
                          const val = (document.getElementById(`input-${s.key}`) as HTMLInputElement)?.value;
                          handleUpdateSetting(s.key, val);
                        }}
                        disabled={savingKey === s.key}
                        className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold cursor-pointer"
                      >
                        {savingKey === s.key ? 'Saving...' : 'Update'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
