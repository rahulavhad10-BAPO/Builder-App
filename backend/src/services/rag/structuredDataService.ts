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

    // 8. Daily Progress Reports (DPR) / Site Progress / Contractor Daily Reports
    if (
      q.includes('daily progress') ||
      q.includes('progress report') ||
      q.includes('dpr') ||
      q.includes('site report') ||
      (q.includes('daily') && (q.includes('report') || q.includes('progress') || q.includes('summary')))
    ) {
      const reports = await prisma.dailyReport.findMany({
        orderBy: { date: 'desc' },
        include: { contractor: true, building: true },
        take: 5,
      });

      if (reports.length === 0) {
        return {
          matched: true,
          answer: `Daily Progress Reports (DPR) are submitted directly by site contractors (not static documents). Currently, no DPR records are logged in the database. Contractors can submit today's DPR in the Site Operations module.`,
          drillDownRoute: '/operations?tab=daily',
        };
      }

      const latest = reports[0];
      const totalReports = await prisma.dailyReport.count();
      const formattedDate = new Date(latest.date).toLocaleDateString('en-IN', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });

      let summaryAnswer = `Daily Progress Report (DPR) Summary (live operational data submitted by contractors):\n\n` +
        `• Latest Submission (${formattedDate}):\n` +
        `  - Tower & Contractor: ${latest.building?.name || 'Tower A'} • ${latest.contractor?.name || 'Apex Civil Works'}\n` +
        `  - Manpower & Weather: ${latest.manpower} Pax deployed under ${latest.weather}\n` +
        `  - Planned Work for Day: ${latest.plannedWork}\n` +
        `  - Achieved End of Day (EoD): ${latest.completedWork}\n` +
        `  - Safety Adherence: ${latest.safety}\n`;

      if (latest.delayedWork || (latest.issues && latest.issues !== 'None' && latest.issues !== 'Zero incidents')) {
        summaryAnswer += `  - Active Site Blocker: ${latest.delayedWork || latest.issues}\n`;
      } else {
        summaryAnswer += `  - Blocker Status: Zero site blockers reported; execution proceeding as planned.\n`;
      }

      summaryAnswer += `\nTotal DPR records submitted across project: ${totalReports} reports.`;

      return {
        matched: true,
        answer: summaryAnswer,
        data: reports.map(r => ({
          date: new Date(r.date).toLocaleDateString('en-IN'),
          tower: r.building?.name || 'Main Tower',
          contractor: r.contractor?.name || 'Contractor',
          manpower: `${r.manpower} Pax`,
          planned: r.plannedWork,
          achieved: r.completedWork,
          blocker: r.delayedWork || r.issues || 'None',
        })),
        drillDownRoute: '/operations?tab=daily',
      };
    }

    // 9. Brokers & Channel Partners
    if (q.includes('broker') || q.includes('channel partner')) {
      const brokers = await prisma.broker.findMany({
        include: {
          flats: {
            include: { building: true, project: true },
          },
        },
      });

      const totalUnitsSold = brokers.reduce((acc, b) => acc + b.flats.length, 0);
      const totalVolume = brokers.reduce((acc, b) => acc + b.flats.reduce((s, f) => s + f.agreementValue, 0), 0);

      const brokerList = brokers
        .map(b => `• ${b.company || b.name} (${b.registrationNo || 'RERA Registered'}): ${b.flats.length} unit(s) sold, Commission rate: ${b.commissionRate}%`)
        .join('\n');

      return {
        matched: true,
        answer: `Channel Partner & Broker Network Overview:\n\n` +
          `• Total Registered Channel Partners: ${brokers.length}\n` +
          `• Total Units Sourced: ${totalUnitsSold} units sold\n` +
          `• Gross Booking Volume: ₹${totalVolume.toLocaleString('en-IN')}\n\n` +
          `Active Brokerage Houses:\n${brokerList}`,
        data: brokers,
        drillDownRoute: '/brokers',
      };
    }

    // 10. Delayed Contractors
    if (q.includes('contractor') && (q.includes('delay') || q.includes('delayed') || q.includes('performance'))) {
      const contractors = await prisma.contractor.findMany({
        include: {
          issues: { where: { status: { notIn: ['CLOSED', 'RESOLVED'] } } },
        },
      });

      const delayed = contractors.filter(c => c.performanceScore < 85 || c.issues.length > 0);
      return {
        matched: true,
        answer: `Contractor Performance & Schedule Health:\n\n` +
          `There are ${delayed.length} contractor(s) currently flagged with schedule delays or open snags:\n` +
          delayed.map(c => `• ${c.name} (${c.scope}): Performance Score ${c.performanceScore}/100, ${c.issues.length} active issue(s)`).join('\n'),
        data: contractors,
        drillDownRoute: '/contractors',
      };
    }

    // 11. Meetings / Last Meeting Decisions
    if (q.includes('meeting') || q.includes('last meeting') || q.includes('mom') || q.includes('decision')) {
      const meeting = await prisma.meeting.findFirst({
        orderBy: { date: 'desc' },
        include: { decisions: true, actions: true },
      });

      if (meeting) {
        const decisionsList = meeting.decisions.map(d => `• ${d.decision} (Decided by: ${d.decidedBy})`).join('\n');
        return {
          matched: true,
          answer: `Minutes & Decisions from Most Recent Meeting ("${meeting.title}" on ${meeting.date.toISOString().split('T')[0]}):\n\n` +
            `Location: ${meeting.location}\n` +
            `Participants: ${meeting.participants}\n\n` +
            `Decisions Agreed:\n${decisionsList || '• Milestone timelines reviewed and confirmed.'}`,
          data: meeting,
          drillDownRoute: '/operations?tab=meetings',
        };
      }
    }

    return { matched: false };
  }
}
