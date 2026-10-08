import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { Sidebar } from './components/Sidebar.js';
import { Header } from './components/Header.js';
import { DashboardView } from './views/DashboardView.js';
import { FlatInventoryView } from './views/FlatInventoryView.js';
import { CrmCollectionsView } from './views/CrmCollectionsView.js';
import { BrokersView } from './views/BrokersView.js';
import { MaterialInventoryView } from './views/MaterialInventoryView.js';
import { ProcurementView } from './views/ProcurementView.js';
import { BOQView } from './views/BOQView.js';
import { ComplianceView } from './views/ComplianceView.js';
import { DocumentsView } from './views/DocumentsView.js';
import { DrawingsView } from './views/DrawingsView.js';
import { ContractorsView } from './views/ContractorsView.js';
import { OperationsView } from './views/OperationsView.js';
import { AskProjectView } from './views/AskProjectView.js';
import { AdminView } from './views/AdminView.js';
import { Flat360Modal } from './components/Flat360Modal.js';
import { RecordPaymentModal } from './components/RecordPaymentModal.js';
import { ApiClient } from './api/client.js';

const MainApplication: React.FC = () => {
  const { loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [projects, setProjects] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [activeFlat360Id, setActiveFlat360Id] = useState<string | null>(null);
  const [recordPaymentData, setRecordPaymentData] = useState<{ flatId: string; customerId: string } | null>(null);
  const [tabFilter, setTabFilter] = useState<any>(null);

  // Load project list
  useEffect(() => {
    ApiClient.getDashboard().then((res) => {
      if (res?.projectsList) {
        setProjects(res.projectsList);
      }
    }).catch(() => {});
  }, []);

  const handleNavigate = (tab: string, filter?: any) => {
    setActiveTab(tab);
    setTabFilter(filter || null);
  };

  const handleOpenRecordPayment = (flatId: string, customerId: string) => {
    setRecordPaymentData({ flatId, customerId });
  };

  if (authLoading) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm font-semibold">
        Initializing Builder Operations Command Center...
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 font-sans">
      {/* Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(t) => {
          setActiveTab(t);
          setTabFilter(null);
        }}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header Bar */}
        <Header
          selectedProjectId={selectedProjectId}
          setSelectedProjectId={setSelectedProjectId}
          projects={projects}
          onOpenAskProject={() => setActiveTab('ask-project')}
        />

        {/* Viewport Router */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-950">
          {activeTab === 'dashboard' && (
            <DashboardView
              projectId={selectedProjectId}
              onNavigate={handleNavigate}
            />
          )}

          {activeTab === 'flats' && (
            <FlatInventoryView
              projectId={selectedProjectId}
              initialFilters={tabFilter}
              onOpenFlat360={(id) => setActiveFlat360Id(id)}
              onOpenRecordPayment={handleOpenRecordPayment}
            />
          )}

          {activeTab === 'crm' && (
            <CrmCollectionsView
              projectId={selectedProjectId}
              onOpenFlat360={(id) => setActiveFlat360Id(id)}
              onOpenRecordPayment={handleOpenRecordPayment}
            />
          )}

          {activeTab === 'brokers' && (
            <BrokersView
              projectId={selectedProjectId}
              onOpenFlat360={(id) => setActiveFlat360Id(id)}
            />
          )}

          {activeTab === 'material-inventory' && (
            <MaterialInventoryView
              projectId={selectedProjectId}
              initialFilters={tabFilter}
            />
          )}

          {activeTab === 'procurement' && (
            <ProcurementView
              projectId={selectedProjectId}
              initialFilters={tabFilter}
            />
          )}

          {activeTab === 'boq' && (
            <BOQView projectId={selectedProjectId} />
          )}

          {activeTab === 'compliance' && (
            <ComplianceView projectId={selectedProjectId} />
          )}

          {activeTab === 'documents' && (
            <DocumentsView projectId={selectedProjectId} />
          )}

          {activeTab === 'drawings' && (
            <DrawingsView projectId={selectedProjectId} />
          )}

          {activeTab === 'contractors' && (
            <ContractorsView />
          )}

          {activeTab === 'operations' && (
            <OperationsView
              projectId={selectedProjectId}
              initialFilters={tabFilter}
            />
          )}

          {activeTab === 'ask-project' && (
            <AskProjectView
              projectId={selectedProjectId}
              onNavigate={handleNavigate}
            />
          )}

          {activeTab === 'admin' && (
            <AdminView />
          )}
        </main>
      </div>

      {/* Global Flat 360 Modal */}
      {activeFlat360Id && (
        <Flat360Modal
          flatId={activeFlat360Id}
          onClose={() => setActiveFlat360Id(null)}
          onOpenRecordPayment={handleOpenRecordPayment}
        />
      )}

      {/* Global Record Payment Modal */}
      {recordPaymentData && (
        <RecordPaymentModal
          flatId={recordPaymentData.flatId}
          customerId={recordPaymentData.customerId}
          onClose={() => setRecordPaymentData(null)}
          onSuccess={() => {
            // Trigger refresh
            setRecordPaymentData(null);
          }}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApplication />
    </AuthProvider>
  );
}
