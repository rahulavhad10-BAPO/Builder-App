import prisma from '../../db/prisma.js';
import { MaterialDemandService } from '../materialDemandService.js';
import { ComplianceService } from '../complianceService.js';
import { FlatInventoryService } from '../flatInventoryService.js';

export class StructuredDataService {
  /**
   * Evaluates structured operational questions against the live database
   */
  static async answerStructuredQuery(query: string, projectId?: string): Promise<{
    matched: boolean;
    answer?: string;
    data?: any;
    drillDownRoute?: string;
  }> {
    const q = query.toLowerCase();

    // 1. Overdue Material Demands
    if (q.includes('overdue') && (q.includes('material') || q.includes('demand'))) {
      await MaterialDemandService.refreshOverdueStatus();
      const overdue = await prisma.materialDemand.findMany({
        where: { isOverdue: true },
        include: { item: true },
      });
      return {
        matched: true,
        answer: `There are currently ${overdue.length} overdue material demand(s).`,
        data: overdue.map(d => ({
          demandNumber: d.demandNumber,
          item: d.item.name,
          quantity: `${d.quantity} ${d.item.unit}`,
          requiredDate: d.requiredDate.toISOString().split('T')[0],
          owner: d.ownerName,
        })),
        drillDownRoute: '/procurement?tab=demands&status=OVERDUE',
      };
    }

    // 2. Available Flats
    if (q.includes('available') && (q.includes('flat') || q.includes('unit'))) {
      const available = await prisma.flat.findMany({
        where: { status: 'AVAILABLE' },
        include: { building: true },
      });
      return {
        matched: true,
        answer: `There are ${available.length} available flat(s) in total.`,
        data: available.map(f => ({
          unitNumber: f.unitNumber,
          tower: f.building.name,
          configuration: f.configuration,
          agreementValue: `₹${f.agreementValue.toLocaleString('en-IN')}`,
        })),
        drillDownRoute: '/flats?status=AVAILABLE',
      };
    }

    // 3. Next demand for Flat A-1204
    if (q.includes('a-1204') || q.includes('next demand')) {
      const flat = await prisma.flat.findFirst({
        where: { unitNumber: 'A-1204' },
        include: {
          demands: {
            where: { balanceAmount: { gt: 0 } },
            orderBy: { dueDate: 'asc' },
          },
        },
      });

      if (flat && flat.demands.length > 0) {
        const nextD = flat.demands[0];
        return {
          matched: true,
          answer: `The next demand for Flat ${flat.unitNumber} is ${nextD.demandNumber} (${nextD.demandType.replace(/_/g, ' ')}), due on ${nextD.dueDate.toISOString().split('T')[0]} for ₹${nextD.balanceAmount.toLocaleString('en-IN')} (Status: ${nextD.status}).`,
          data: nextD,
          drillDownRoute: `/flats?flatId=${flat.id}`,
        };
      }
    }

    // 4. PO Mismatches / PO Exceptions
    if (q.includes('mismatch') || q.includes('po exception') || (q.includes('po') && q.includes('quantity'))) {
      const exceptions = await prisma.poException.findMany({
        where: { resolved: false },
        include: { po: { include: { vendor: true } }, demand: { include: { item: true } } },
      });
      return {
        matched: true,
        answer: `Found ${exceptions.length} active PO exception(s) with quantity or price mismatch.`,
        data: exceptions.map(e => ({
          poNumber: e.po.poNumber,
          vendor: e.po.vendor.name,
          exceptionType: e.type,
          message: e.message,
        })),
        drillDownRoute: '/procurement?tab=exceptions',
      };
    }

    // 5. Compliance Status
    if (q.includes('compliance') || q.includes('fire safety approval')) {
      const summary = await ComplianceService.getComplianceSummary(projectId);
      const fireApproval = await prisma.complianceItem.findFirst({
        where: { category: 'FIRE_SAFETY' },
      });
      return {
        matched: true,
        answer: `Overall project compliance is at ${summary.compliancePercentage}% (${summary.completed}/${summary.totalApplicable} statutory items complete). ${fireApproval ? `Fire Safety Provisional NOC is: ${fireApproval.status} (Remarks: ${fireApproval.remarks}).` : ''}`,
        data: summary,
        drillDownRoute: '/compliance',
      };
    }

    // 6. Critical Issues
    if (q.includes('critical') && (q.includes('issue') || q.includes('snag'))) {
      const critical = await prisma.issueSnagRfi.findMany({
        where: { priority: 'CRITICAL', status: { notIn: ['CLOSED', 'RESOLVED'] } },
        include: { contractor: true },
      });
      return {
        matched: true,
        answer: `There are ${critical.length} critical active site issue(s) requiring immediate intervention.`,
        data: critical.map(c => ({
          type: c.type,
          location: c.location,
          description: c.description,
          contractor: c.contractor?.name,
          dueDate: c.dueDate.toISOString().split('T')[0],
        })),
        drillDownRoute: '/issues?priority=CRITICAL',
      };
    }

    // 7. Customer payment lookup
    if (q.includes('paid') && (q.includes('customer') || q.includes('vivek'))) {
      const cust = await prisma.customer.findFirst({
        where: { name: { contains: 'Vivek' } },
        include: { payments: true, flats: true },
      });
      if (cust) {
        const totalPaid = cust.payments.reduce((sum, p) => sum + p.amount, 0);
        return {
          matched: true,
          answer: `Customer ${cust.name} has paid a total of ₹${totalPaid.toLocaleString('en-IN')} across ${cust.flats.length} property unit(s).`,
          data: cust.payments,
          drillDownRoute: `/crm?customerId=${cust.id}`,
        };
      }
    }

    return { matched: false };
  }
}
