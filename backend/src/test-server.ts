import prisma from './db/prisma.js';
import { DashboardService } from './services/dashboardService.js';
import { StructuredDataService } from './services/rag/structuredDataService.js';
import { FlatInventoryService } from './services/flatInventoryService.js';

async function testAll() {
  console.log('Testing Database connection...');
  const users = await prisma.user.count();
  console.log(`Users count: ${users}`);

  console.log('Testing Dashboard KPIs...');
  const kpis = await DashboardService.getCommandCenterData();
  console.log(`Compliance: ${kpis.kpis.compliancePercentage}%, Flats: ${kpis.kpis.totalFlats}, Sold: ${kpis.kpis.soldFlats}`);

  console.log('Testing Structured query: Overdue demands...');
  const ans1 = await StructuredDataService.answerStructuredQuery('Which material demands are overdue?');
  console.log('Ans 1:', ans1.answer);

  console.log('Testing Structured query: Next demand for Flat A-1204...');
  const ans2 = await StructuredDataService.answerStructuredQuery('What is the next demand for Flat A-1204?');
  console.log('Ans 2:', ans2.answer);

  console.log('Testing Flat Inventory Dashboard...');
  const flatKpis = await FlatInventoryService.getDashboardKPIs();
  console.log(`Flats count: ${flatKpis.totalFlats}, Available: ${flatKpis.available}, Overdue Amount: ₹${flatKpis.overdueAmount}`);

  console.log('All backend smoke tests PASSED!');
  process.exit(0);
}

testAll().catch((e) => {
  console.error('Smoke test error:', e);
  process.exit(1);
});
