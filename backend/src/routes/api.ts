import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';
import { DashboardController } from '../controllers/dashboardController.js';
import { DocumentController } from '../controllers/documentController.js';
import { InventoryController, DemandController } from '../controllers/inventoryController.js';
import { ProcurementController, ComplianceController, BOQController } from '../controllers/procurementController.js';
import { FlatController } from '../controllers/flatController.js';
import { CRMController, PaymentController } from '../controllers/crmController.js';
import { ContractorController, OperationsController, AskProjectController, RAGController, AdminController } from '../controllers/operationsController.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();

// 1. AUTHENTICATION & USERS
router.post('/auth/login', AuthController.login);
router.get('/auth/me', requireAuth, AuthController.getMe);
router.get('/auth/users', requireAuth, AuthController.getUsers);

// 2. DASHBOARD / COMMAND CENTER
router.get('/dashboard', requireAuth, DashboardController.getCommandCenter);

// 3. DOCUMENTS (with upload & permissions)
router.get('/documents', requireAuth, requirePermission('document.view'), DocumentController.getDocuments);
router.get('/documents/:id', requireAuth, requirePermission('document.view'), DocumentController.getDocumentById);
router.post('/documents', requireAuth, requirePermission('document.upload'), upload.single('file'), DocumentController.uploadDocument);
router.post('/documents/:id/versions', requireAuth, requirePermission('document.upload'), upload.single('file'), DocumentController.uploadNewVersion);
router.delete('/documents/:id', requireAuth, requirePermission('document.delete'), DocumentController.deleteDocument);

// 4. DRAWINGS
router.get('/drawings', requireAuth, requirePermission('drawing.view'), OperationsController.getDrawings);
router.post('/drawings', requireAuth, requirePermission('drawing.upload'), OperationsController.createDrawing);

// 5. MATERIAL INVENTORY
router.get('/inventory/items', requireAuth, requirePermission('inventory.view'), InventoryController.getItems);
router.post('/inventory/transactions', requireAuth, requirePermission('inventory.edit'), InventoryController.recordTransaction);
router.patch('/inventory/items/:id/threshold', requireAuth, requirePermission('admin.access'), InventoryController.updateThreshold);

// 6. MATERIAL DEMANDS
router.get('/material-demands', requireAuth, DemandController.getDemands);
router.post('/material-demands', requireAuth, DemandController.createDemand);
router.patch('/material-demands/:id/status', requireAuth, DemandController.updateStatus);
router.post('/material-demands/refresh-overdue', requireAuth, DemandController.refreshOverdue);

// 7. PROCUREMENT & PO VERIFICATION
router.get('/procurement/vendors', requireAuth, ProcurementController.getVendors);
router.get('/procurement/pos', requireAuth, ProcurementController.getPurchaseOrders);
router.post('/procurement/pos', requireAuth, requirePermission('po.create'), ProcurementController.createPurchaseOrder);
router.post('/procurement/pos/:id/approve', requireAuth, requirePermission('admin.access'), ProcurementController.approvePO);
router.post('/procurement/pos/:id/place-order', requireAuth, requirePermission('admin.access'), ProcurementController.placeOrder);
router.get('/procurement/exceptions', requireAuth, ProcurementController.getPOExceptions);
router.post('/procurement/exceptions/:id/resolve', requireAuth, requirePermission('po.verify'), ProcurementController.resolveException);
router.post('/procurement/verify-po/:id', requireAuth, requirePermission('po.verify'), ProcurementController.verifyPO);

// 8. BOQ
router.get('/boq', requireAuth, BOQController.getItems);
router.patch('/boq/:id/consumption', requireAuth, BOQController.updateConsumption);

// 9. COMPLIANCE
router.get('/compliance', requireAuth, requirePermission('compliance.view'), ComplianceController.getChecklist);
router.get('/compliance/summary', requireAuth, requirePermission('compliance.view'), ComplianceController.getSummary);
router.patch('/compliance/:id', requireAuth, requirePermission('compliance.edit'), ComplianceController.updateItem);

// 10. REAL ESTATE FLAT INVENTORY (DEDICATED DOMAIN)
router.get('/flats', requireAuth, requirePermission('flat.view'), FlatController.getFlats);
router.get('/flats/dashboard', requireAuth, requirePermission('flat.view'), FlatController.getDashboardKPIs);
router.get('/flats/:id/360', requireAuth, requirePermission('flat.view'), FlatController.getFlat360);
router.get('/flats/:id/demands', requireAuth, requirePermission('flat.view'), FlatController.getAllDemands);
router.patch('/flats/:id/status', requireAuth, requirePermission('flat.edit'), FlatController.updateStatus);
router.post('/flats/import-csv', requireAuth, requirePermission('admin.access'), FlatController.importCSV);

// 11. CRM, CUSTOMERS & BROKERS
router.get('/crm/customers', requireAuth, requirePermission('customer.view'), CRMController.getCustomers);
router.get('/crm/customers/:id', requireAuth, requirePermission('customer.view'), CRMController.getCustomerProfile);
router.get('/crm/collection-dashboard', requireAuth, requirePermission('collection.view'), CRMController.getCollectionDashboard);
router.get('/crm/brokers', requireAuth, CRMController.getBrokers);

// 12. PAYMENTS, DEMANDS & REMINDERS
router.get('/payments', requireAuth, requirePermission('payment.view'), PaymentController.getPayments);
router.post('/payments', requireAuth, requirePermission('payment.create'), PaymentController.recordPayment);
router.post('/payments/demands', requireAuth, requirePermission('demand.create'), PaymentController.createDemand);
router.post('/payments/demands/:id/remind', requireAuth, requirePermission('demand.remind'), PaymentController.sendReminder);
router.post('/payments/demands/run-reminder-scan', requireAuth, requirePermission('demand.remind'), PaymentController.runReminderScan);
router.get('/payments/reminders/history', requireAuth, PaymentController.getReminderHistory);

// 13. CONTRACTORS & PERFORMANCE
router.get('/contractors', requireAuth, requirePermission('contractor.view'), ContractorController.getContractors);
router.get('/contractors/:id', requireAuth, requirePermission('contractor.view'), ContractorController.getContractorById);

// 14. OPERATIONS (DAILY / MONTHLY REPORTS, MEETINGS, ISSUES)
router.get('/operations/daily-reports', requireAuth, OperationsController.getDailyReports);
router.post('/operations/daily-reports', requireAuth, OperationsController.createDailyReport);
router.get('/operations/monthly-reports', requireAuth, OperationsController.getMonthlyReports);
router.get('/operations/issues', requireAuth, OperationsController.getIssues);
router.patch('/operations/issues/:id', requireAuth, OperationsController.updateIssueStatus);
router.get('/operations/meetings', requireAuth, OperationsController.getMeetings);

// 15. ASK PROJECT (STRUCTURED OPERATIONAL + RAG CONTRACT)
router.post('/ask-project', requireAuth, requirePermission('askproject.query'), AskProjectController.query);
router.get('/rag/status', requireAuth, RAGController.getStatus);
router.post('/rag/reindex-all', requireAuth, requirePermission('admin.access'), RAGController.reindexAll);
router.post('/rag/documents/:id/ingest', requireAuth, requirePermission('document.upload'), RAGController.ingestDocument);

// 16. ADMIN & AUDIT
router.get('/admin/audit-logs', requireAuth, requirePermission('admin.access'), AdminController.getAuditLogs);
router.get('/admin/email-logs', requireAuth, requirePermission('admin.access'), AdminController.getEmailLogs);
router.get('/admin/settings', requireAuth, requirePermission('admin.access'), AdminController.getSettings);
router.patch('/admin/settings', requireAuth, requirePermission('admin.access'), AdminController.updateSetting);
router.get('/admin/system-status', requireAuth, AdminController.getSystemStatus);

export default router;
