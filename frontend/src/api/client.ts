const API_BASE = '/api';

export class ApiClient {
  private static getToken(): string | null {
    return localStorage.getItem('builder_ops_jwt');
  }

  static setToken(token: string) {
    localStorage.setItem('builder_ops_jwt', token);
  }

  static clearToken() {
    localStorage.removeItem('builder_ops_jwt');
  }

  private static async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Request failed with status ${response.status}`);
    }

    return response.json();
  }

  // Auth
  static login(credentials: { email: string; password: string }) {
    return this.request<{ token: string; user: any; permissions: string[] }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  static getMe() {
    return this.request<{ user: any; permissions: string[] }>('/auth/me');
  }

  static getUsers() {
    return this.request<any[]>('/auth/users');
  }

  // Dashboard
  static getDashboard(projectId?: string) {
    const qs = projectId ? `?projectId=${projectId}` : '';
    return this.request<any>(`/dashboard${qs}`);
  }

  // Flats
  static getFlats(params: Record<string, any> = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, String(v));
    });
    return this.request<any[]>(`/flats?${query.toString()}`);
  }

  static getFlatDashboard(projectId?: string) {
    const qs = projectId ? `?projectId=${projectId}` : '';
    return this.request<any>(`/flats/dashboard${qs}`);
  }

  static getFlat360(id: string) {
    return this.request<any>(`/flats/${id}/360`);
  }

  static updateFlatStatus(id: string, data: any) {
    return this.request<any>(`/flats/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  static getFlatDemands(flatId: string) {
    return this.request<any[]>(`/flats/${flatId}/demands`);
  }

  static importFlatCSV(csvContent: string, projectId?: string) {
    return this.request<any>('/flats/import-csv', {
      method: 'POST',
      body: JSON.stringify({ csvContent, projectId }),
    });
  }

  // Documents
  static getDocuments(params: Record<string, any> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request<any[]>(`/documents?${query}`);
  }

  static uploadDocument(formData: FormData) {
    return this.request<any>('/documents', {
      method: 'POST',
      body: formData,
    });
  }

  static uploadDocumentVersion(id: string, formData: FormData) {
    return this.request<any>(`/documents/${id}/versions`, {
      method: 'POST',
      body: formData,
    });
  }

  static deleteDocument(id: string) {
    return this.request<any>(`/documents/${id}`, {
      method: 'DELETE',
    });
  }

  // Drawings
  static getDrawings(params: Record<string, any> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request<any[]>(`/drawings?${query}`);
  }

  // Material Inventory
  static getInventoryItems(params: Record<string, any> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request<any[]>(`/inventory/items?${query}`);
  }

  static recordInventoryTx(data: any) {
    return this.request<any>('/inventory/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static updateInventoryThreshold(itemId: string, minStock: number, reorderLevel: number) {
    return this.request<any>(`/inventory/items/${itemId}/threshold`, {
      method: 'PATCH',
      body: JSON.stringify({ minStock, reorderLevel }),
    });
  }

  // Material Demands
  static getMaterialDemands(params: Record<string, any> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request<any[]>(`/material-demands?${query}`);
  }

  static createMaterialDemand(data: any) {
    return this.request<any>('/material-demands', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static refreshMaterialOverdue() {
    return this.request<any>('/material-demands/refresh-overdue', {
      method: 'POST',
    });
  }

  // Procurement
  static getVendors() {
    return this.request<any[]>('/procurement/vendors');
  }

  static getPOs(params: Record<string, any> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request<any[]>(`/procurement/pos?${query}`);
  }

  static createPO(data: any) {
    return this.request<any>('/procurement/pos', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static approvePO(id: string) {
    return this.request<any>(`/procurement/pos/${id}/approve`, {
      method: 'POST',
    });
  }

  static placeOrder(id: string) {
    return this.request<any>(`/procurement/pos/${id}/place-order`, {
      method: 'POST',
    });
  }

  static getPOExceptions(resolved?: boolean) {
    const qs = resolved !== undefined ? `?resolved=${resolved}` : '';
    return this.request<any[]>(`/procurement/exceptions${qs}`);
  }

  static resolvePOException(id: string) {
    return this.request<any>(`/procurement/exceptions/${id}/resolve`, {
      method: 'POST',
    });
  }

  // BOQ
  static getBOQ(params: Record<string, any> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request<any[]>(`/boq?${query}`);
  }

  // Compliance
  static getCompliance(params: Record<string, any> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request<any[]>(`/compliance?${query}`);
  }

  static getComplianceSummary(projectId?: string) {
    const qs = projectId ? `?projectId=${projectId}` : '';
    return this.request<any>(`/compliance/summary${qs}`);
  }

  static updateComplianceItem(id: string, data: any) {
    return this.request<any>(`/compliance/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // CRM & Collections
  static getCustomers(search?: string) {
    const qs = search ? `?search=${encodeURIComponent(search)}` : '';
    return this.request<any[]>(`/crm/customers${qs}`);
  }

  static getCustomerProfile(id: string) {
    return this.request<any>(`/crm/customers/${id}`);
  }

  static getCollectionDashboard(projectId?: string) {
    const qs = projectId ? `?projectId=${projectId}` : '';
    return this.request<any>(`/crm/collection-dashboard${qs}`);
  }

  static getBrokers() {
    return this.request<any[]>('/crm/brokers');
  }

  // Payments & Reminders
  static getPayments(params: Record<string, any> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request<any[]>(`/payments?${query}`);
  }

  static recordPayment(data: any) {
    return this.request<any>('/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static createDemand(data: any) {
    return this.request<any>('/payments/demands', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static sendDemandReminder(demandId: string, reminderType?: string) {
    return this.request<any>(`/payments/demands/${demandId}/remind`, {
      method: 'POST',
      body: JSON.stringify({ reminderType }),
    });
  }

  static runReminderScan() {
    return this.request<any>('/payments/demands/run-reminder-scan', {
      method: 'POST',
    });
  }

  // Contractors
  static getContractors() {
    return this.request<any[]>('/contractors');
  }

  static getContractorById(id: string) {
    return this.request<any>(`/contractors/${id}`);
  }

  // Operations
  static getDailyReports(params: Record<string, any> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request<any[]>(`/operations/daily-reports?${query}`);
  }

  static getMonthlyReports(projectId?: string) {
    const qs = projectId ? `?projectId=${projectId}` : '';
    return this.request<any[]>(`/operations/monthly-reports${qs}`);
  }

  static getIssues(params: Record<string, any> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request<any[]>(`/operations/issues?${query}`);
  }

  static updateIssueStatus(id: string, data: any) {
    return this.request<any>(`/operations/issues/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  static getMeetings(projectId?: string) {
    const qs = projectId ? `?projectId=${projectId}` : '';
    return this.request<any[]>(`/operations/meetings${qs}`);
  }

  // Ask Project
  static askProject(query: string, projectId?: string) {
    return this.request<any>('/ask-project', {
      method: 'POST',
      body: JSON.stringify({ query, projectId }),
    });
  }

  // Admin
  static getAuditLogs(params: Record<string, any> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request<any[]>(`/admin/audit-logs?${query}`);
  }

  static getEmailLogs(limit = 100) {
    return this.request<any[]>(`/admin/email-logs?limit=${limit}`);
  }

  static getSystemSettings() {
    return this.request<any[]>('/admin/settings');
  }

  static updateSystemSetting(key: string, value: string) {
    return this.request<any>('/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify({ key, value }),
    });
  }

  static getSystemStatus() {
    return this.request<any>('/admin/system-status');
  }

  // RAG Vector Engine
  static getRAGStatus() {
    return this.request<any>('/rag/status');
  }

  static reindexVectors() {
    return this.request<any>('/rag/reindex-all', {
      method: 'POST',
    });
  }
}
