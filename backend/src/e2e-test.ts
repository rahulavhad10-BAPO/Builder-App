import prisma from './db/prisma.js';
import { MaterialDemandService } from './services/materialDemandService.js';
import { ProcurementService } from './services/procurementService.js';
import { ComplianceService } from './services/complianceService.js';
import { FlatInventoryService } from './services/flatInventoryService.js';
import { DemandEngine } from './services/demandEngine.js';
import { PaymentAllocationService } from './services/paymentAllocationService.js';
import { DemandReminderEngine } from './services/demandReminderEngine.js';
import { StructuredDataService } from './services/rag/structuredDataService.js';
import { AskProjectService } from './services/rag/askProjectService.js';
import { hasPermission } from './config/permissions.js';

async function runE2ETests() {
  console.log('===============================================================');
  console.log(' RUNNING BUILDER OPERATIONS COMMAND CENTER E2E TEST SUITE');
  console.log('===============================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  // 1. RBAC Matrix & Direct API Protection
  console.log('\n--- 1. AUTH & RBAC VERIFICATION ---');
  assert(hasPermission('Super Admin', 'document.delete'), 'Super Admin has document.delete');
  assert(hasPermission('Builder Admin', 'po.create'), 'Builder Admin has po.create');
  assert(!hasPermission('Contractor', 'document.delete'), 'Contractor is FORBIDDEN from document.delete');
  assert(!hasPermission('Contractor', 'po.create'), 'Contractor is FORBIDDEN from po.create');
  assert(!hasPermission('Broker', 'compliance.edit'), 'Broker is FORBIDDEN from compliance.edit');
  assert(hasPermission('Site Engineer', 'document.upload'), 'Site Engineer has document.upload');

  // 2. Compliance Calculations (excluding NOT_APPLICABLE)
  console.log('\n--- 2. COMPLIANCE ENGINE & DYNAMIC PERCENTAGE ---');
  const compSummary = await ComplianceService.getComplianceSummary();
  assert(compSummary.totalApplicable < compSummary.totalItems, 'Excludes NOT_APPLICABLE items from denominator');
  assert(compSummary.compliancePercentage > 70, `Dynamic compliance percentage is calculated (${compSummary.compliancePercentage}%)`);

  // 3. PO Verification Engine & Anomaly Detection
  console.log('\n--- 3. PROCUREMENT & PO VERIFICATION ENGINE ---');
  const exceptions = await ProcurementService.getPOExceptions();
  assert(exceptions.length > 0, `PO Verification Engine detected quantity mismatch exceptions (${exceptions.length} exceptions)`);
  const qtyMismatch = exceptions.find(e => e.type === 'QUANTITY_MISMATCH' || e.type === 'OVER_ORDERING');
  assert(!!qtyMismatch, `Detected over-ordering exception: "${qtyMismatch?.message}"`);

  // 4. Material Demands & Dynamic Overdue Evaluation
  console.log('\n--- 4. MATERIAL INVENTORY & OVERDUE DEMANDS ---');
  const overdueScan = await MaterialDemandService.refreshOverdueStatus();
  assert(overdueScan.checked > 0, `Overdue engine evaluated ${overdueScan.checked} material demands`);
  const overdueDemands = await MaterialDemandService.getDemands({ overdueOnly: true });
  assert(overdueDemands.length > 0, `Overdue material demand correctly marked (${overdueDemands[0].demandNumber})`);

  // 5. Flat Inventory Domain & Dashboard KPIs
  console.log('\n--- 5. REAL ESTATE FLAT INVENTORY DOMAIN ---');
  const flatKPIs = await FlatInventoryService.getDashboardKPIs();
  assert(flatKPIs.totalFlats === 24, `Flat Master has 24 property units (Found: ${flatKPIs.totalFlats})`);
  assert(flatKPIs.sold > 0, `Sold units tracked (Found: ${flatKPIs.sold})`);
  assert(flatKPIs.available > 0, `Available units tracked (Found: ${flatKPIs.available})`);
  assert(flatKPIs.totalCollection > 0, `Collection value realized: ₹${flatKPIs.totalCollection.toLocaleString('en-IN')}`);

  // 6. Ask Project Hybrid Queries & RAG Fallback
  console.log('\n--- 6. ASK PROJECT & RAG STATE CONTRACT ---');
  const structuredQ1 = await AskProjectService.handleQuery('Which material demands are overdue?');
  assert(structuredQ1.queryType === 'STRUCTURED_RELATIONAL', 'Structured query routed to Relational DB');
  assert(structuredQ1.answer.includes('overdue material demand'), 'Answered overdue demands accurately from database');

  const structuredQ2 = await AskProjectService.handleQuery('What is the next demand for Flat A-1204?');
  assert(structuredQ2.queryType === 'STRUCTURED_RELATIONAL', 'A-1204 query routed to Structured Engine');
  assert(structuredQ2.answer.includes('DEM-2024-') || structuredQ2.answer.includes('Flat A-1204'), 'Answered A-1204 milestone schedule accurately');

  const unstructuredQ = await AskProjectService.handleQuery('What does the contract specify regarding penalty clauses?');
  assert(unstructuredQ.queryType === 'UNSTRUCTURED_DOCUMENT', 'Contract query identified as unstructured');
  assert(unstructuredQ.ragConfigured === false, 'RAG_ENABLED=false honored');
  assert(unstructuredQ.answer.includes('AI/RAG is not configured yet'), 'Returned clean non-hallucinatory notice: "AI/RAG is not configured yet."');

  // 7. Complete Flat Commercial Lifecycle Simulation
  console.log('\n--- 7. COMPLETE FLAT COMMERCIAL LIFECYCLE TEST ---');
  // Available -> Booked -> Agreement -> Demand Created -> Partial Payment -> Reminder Sent -> Overdue -> Paid
  const testUnit = await prisma.flat.findFirst({ where: { status: 'AVAILABLE' } });
  assert(!!testUnit, `Selected Available test unit: ${testUnit?.unitNumber}`);

  const testCustomer = await prisma.customer.findFirst();
  assert(!!testCustomer, `Selected Test Customer: ${testCustomer?.name}`);

  if (testUnit && testCustomer) {
    // Stage 1: Booked
    const bookedFlat = await FlatInventoryService.updateFlatStatus(testUnit.id, 'BOOKED', {
      customerId: testCustomer.id,
      bookingDate: new Date(),
    });
    assert(bookedFlat.status === 'BOOKED', 'Lifecycle 1: Unit transitioned to BOOKED');

    // Stage 2: Agreement
    const agreementFlat = await FlatInventoryService.updateFlatStatus(testUnit.id, 'AGREEMENT', {
      agreementDate: new Date(),
    });
    assert(agreementFlat.status === 'AGREEMENT', 'Lifecycle 2: Unit transitioned to AGREEMENT');

    // Stage 3: Demand Created
    const newDemand = await DemandEngine.createDemand({
      flatId: testUnit.id,
      customerId: testCustomer.id,
      projectId: testUnit.projectId,
      demandType: 'CONSTRUCTION_LINKED',
      demandDate: new Date(),
      dueDate: new Date(Date.now() + 10 * 86400000), // Due in 10 days
      demandAmount: 500000,
    });
    assert(newDemand.balanceAmount === 500000, 'Lifecycle 3: Payment Demand created with ₹5,00,000 balance');
    assert(newDemand.status === 'UPCOMING', `Lifecycle 3b: Demand status evaluated as UPCOMING`);

    // Stage 4: Partial Payment
    const payment1 = await PaymentAllocationService.recordPayment({
      flatId: testUnit.id,
      customerId: testCustomer.id,
      amount: 200000,
      paymentMode: 'NEFT',
      transactionRef: `TEST-PARTIAL-${Date.now()}`,
    });
    assert(payment1.amount === 200000, 'Lifecycle 4: Partial payment of ₹2,00,000 recorded');

    const demandAfterP1 = await prisma.paymentDemand.findUnique({ where: { id: newDemand.id } });
    assert(demandAfterP1?.balanceAmount === 300000, 'Lifecycle 4b: Demand balance reduced to ₹3,00,000');
    assert(demandAfterP1?.status === 'PARTIALLY_PAID', 'Lifecycle 4c: Demand status dynamically updated to PARTIALLY_PAID');

    // Stage 5: Reminder Dispatch with Idempotency
    const reminder1 = await DemandReminderEngine.sendDemandReminder({
      demandId: newDemand.id,
      reminderType: 'CUSTOM',
    });
    assert(reminder1.success, 'Lifecycle 5: Reminder notice sent and recorded in DemandReminder & EmailLog');

    // Idempotency: Attempt sending duplicate reminder
    const duplicateReminder = await DemandReminderEngine.sendDemandReminder({
      demandId: newDemand.id,
      reminderType: 'CUSTOM',
    });
    assert(duplicateReminder.success === false, 'Lifecycle 5b: Idempotency enforced - duplicate reminder blocked');

    // Stage 6: Due date elapses -> Overdue evaluation
    await prisma.paymentDemand.update({
      where: { id: newDemand.id },
      data: { dueDate: new Date(Date.now() - 2 * 86400000) }, // 2 days in past
    });
    await DemandEngine.refreshAllDemandStatuses();
    const overdueDemandCheck = await prisma.paymentDemand.findUnique({ where: { id: newDemand.id } });
    assert(overdueDemandCheck?.status === 'OVERDUE', 'Lifecycle 6: Unpaid past-due demand dynamically transitioned to OVERDUE');

    // Stage 7: Remaining Payment Received -> Fully Paid
    await PaymentAllocationService.recordPayment({
      flatId: testUnit.id,
      customerId: testCustomer.id,
      amount: 300000,
      paymentMode: 'RTGS',
      transactionRef: `TEST-FINAL-${Date.now()}`,
    });
    const finalDemand = await prisma.paymentDemand.findUnique({ where: { id: newDemand.id } });
    assert(finalDemand?.balanceAmount === 0, 'Lifecycle 7: Balance cleared to ₹0');
    assert(finalDemand?.status === 'PAID', 'Lifecycle 7b: Demand status dynamically updated to PAID');

    // Reset test flat to available to maintain clean state
    await prisma.paymentDemand.delete({ where: { id: newDemand.id } });
    await FlatInventoryService.updateFlatStatus(testUnit.id, 'AVAILABLE', { customerId: null });
  }

  console.log('\n===============================================================');
  console.log(` E2E TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runE2ETests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
