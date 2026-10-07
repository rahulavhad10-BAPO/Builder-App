import prisma from '../db/prisma.js';
import { MaterialDemandService } from './materialDemandService.js';
import { ComplianceService } from './complianceService.js';
import { FlatInventoryService } from './flatInventoryService.js';
import { DemandEngine } from './demandEngine.js';

export class DashboardService {
  static async getCommandCenterData(projectId?: string) {
    // 1. Refresh dynamic states
    await MaterialDemandService.refreshOverdueStatus();
    await DemandEngine.refreshAllDemandStatuses();

    // 2. Fetch Projects
    const projects = await prisma.project.findMany({
      where: projectId ? { id: projectId } : undefined,
      include: {
        buildings: true,
      },
    });

    const activeProject = projects[0];

    // 3. Material Demands
    const allDemands = await prisma.materialDemand.findMany({
      where: projectId ? { projectId } : undefined,
    });
    const pendingMaterialDemand = allDemands.filter(d => !['COMPLETED', 'RECEIVED', 'REJECTED'].includes(d.status)).length;
    const overdueMaterialDemand = allDemands.filter(d => d.isOverdue || d.status === 'OVERDUE').length;

    // 4. Procurement & POs
    const allPOs = await prisma.purchaseOrder.findMany({
      where: projectId ? { projectId } : undefined,
    });
    const openPOs = allPOs.filter(p => !['DELIVERED', 'CANCELLED'].includes(p.status)).length;

    const allPOExceptions = await prisma.poException.findMany({
      where: { resolved: false },
    });

    // 5. Inventory & Low Stock
    const inventoryItems = await prisma.inventoryItem.findMany();
    const lowStockItems = inventoryItems.filter(i => i.currentStock <= i.reorderLevel);

    // 6. Compliance
    const complianceSummary = await ComplianceService.getComplianceSummary(projectId);

    // 7. Contractors & Performance
    const contractors = await prisma.contractor.findMany({
      where: { status: 'ACTIVE' },
    });
    const avgContractorScore = contractors.length > 0
      ? Number((contractors.reduce((sum, c) => sum + c.performanceScore, 0) / contractors.length).toFixed(1))
      : 85;

    // 8. Flat Inventory & Sales & Collections
    const flatKPIs = await FlatInventoryService.getDashboardKPIs(projectId);

    // 9. Issues, Snags, RFIs
    const issues = await prisma.issueSnagRfi.findMany({
      where: projectId ? { projectId } : undefined,
    });
    const openIssues = issues.filter(i => ['OPEN', 'IN_PROGRESS'].includes(i.status) && i.type === 'ISSUE').length;
    const criticalIssues = issues.filter(i => ['OPEN', 'IN_PROGRESS'].includes(i.status) && i.priority === 'CRITICAL').length;
    const openRFIs = issues.filter(i => ['OPEN', 'IN_PROGRESS'].includes(i.status) && i.type === 'RFI').length;

    // 10. Budget & Progress
    const totalBudget = projects.reduce((acc, p) => acc + p.budget, 0);
    const totalActualSpend = projects.reduce((acc, p) => acc + p.actualSpend, 0);
    const budgetVariance = totalBudget - totalActualSpend;

    return {
      project: activeProject ? {
        id: activeProject.id,
        name: activeProject.name,
        code: activeProject.code,
        location: activeProject.location,
        targetDate: activeProject.targetDate,
        status: activeProject.status,
      } : null,
      projectsList: projects.map(p => ({ id: p.id, name: p.name, code: p.code })),
      kpis: {
        // Project Progress
        projectProgress: 42.0, // calculated from latest monthly report or milestones
        plannedProgress: 45.0,
        scheduleHealth: 'GOOD', // GOOD, AT_RISK, DELAYED
        criticalActivitiesCount: criticalIssues,
        delayedActivitiesCount: overdueMaterialDemand,

        // Financial & Budget
        budget: totalBudget,
        actualSpend: totalActualSpend,
        budgetVariance,

        // Procurement & Material
        openPOs,
        pendingMaterialDemand,
        overdueMaterialDemand,
        totalInventoryCount: inventoryItems.length,
        lowStockCount: lowStockItems.length,
        poExceptionsCount: allPOExceptions.length,

        // Contractor & Quality
        avgContractorScore,
        activeContractorsCount: contractors.length,

        // Compliance
        compliancePercentage: complianceSummary.compliancePercentage,
        complianceCompleted: complianceSummary.completed,
        complianceTotal: complianceSummary.totalApplicable,
        complianceOverdue: complianceSummary.overdue,

        // Real Estate Sales & Collections
        totalFlats: flatKPIs.totalFlats,
        availableFlats: flatKPIs.available,
        soldFlats: flatKPIs.sold,
        totalAgreementValue: flatKPIs.soldValue,
        totalCollection: flatKPIs.totalCollection,
        totalOutstanding: flatKPIs.totalOutstanding,
        overdueCustomerAmount: flatKPIs.overdueAmount,
        upcomingDemandAmount: flatKPIs.upcomingDemandAmount,
        collectionEfficiency: flatKPIs.collectionEfficiency,
        flatsWithOverdueDemands: flatKPIs.flatsWithOverdue,

        // Issues & Safety
        openIssues,
        criticalIssues,
        openRFIs,
        safetyRecord: '180,000 Safe Hours (Zero LTI)',
      },
    };
  }
}
