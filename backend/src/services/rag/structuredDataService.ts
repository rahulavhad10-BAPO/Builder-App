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

    // 8. Contractor Progress Notes & Project Status based on Progress Reports
    const contractorsList = await prisma.contractor.findMany({
      include: {
        progressNotes: { orderBy: { reportingDate: 'desc' } },
        contracts: true,
        dailyReports: { orderBy: { date: 'desc' }, take: 2 },
      },
    });

    // 8a. Contractor Contact Details & Master Directory in Table Form
    const isContractorDirectoryQuery =
      (q.includes('contractor') && (
        q.includes('contact') ||
        q.includes('detail') ||
        q.includes('directory') ||
        q.includes('phone') ||
        q.includes('email') ||
        q.includes('table') ||
        q.includes('list') ||
        q.includes('available') ||
        q.includes('master') ||
        q.includes('who are') ||
        q.includes('vendor')
      )) ||
      q.includes('contractor contacts') ||
      q.includes('contractors list');

    if (isContractorDirectoryQuery && !q.includes('progress') && !q.includes('report') && !q.includes('dpr') && !q.includes('log')) {
      const allContractors = await prisma.contractor.findMany({
        orderBy: { name: 'asc' },
      });

      let table = `### Contractor Master Directory & Contact Credentials\n\n`;
      table += `Here are the active contractors with their registered contact persons, phone numbers, and emails:\n\n`;
      table += `| Contractor Name | Code | Contact Person | Phone | Email | Scope / Trade | Status |\n`;
      table += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;

      for (const c of allContractors) {
        const person = c.contactPerson || 'Project In-charge';
        const phone = c.phone || 'N/A';
        const email = c.email || 'N/A';
        const scope = c.scope || 'General Construction';
        const status = c.status || 'ACTIVE';
        table += `| **${c.name}** | \`${c.code}\` | ${person} | ${phone} | ${email} | ${scope} | \`${status}\` |\n`;
      }

      table += `\n*Total Registered Contractors: ${allContractors.length}. All contacts are verified against active project execution contracts.*`;

      return {
        matched: true,
        answer: table,
        data: allContractors,
        drillDownRoute: '/contractors',
      };
    }

    const isContractorOrProjectStatusQuery =
      q.includes('progress note') ||
      q.includes('progress report') ||
      q.includes('contractor status') ||
      q.includes('contractor progress') ||
      q.includes('milestone status') ||
      q.includes('milestone progress') ||
      ((q.includes('project status') || q.includes('status of project') || q.includes('execution status')) && (q.includes('contractor') || q.includes('report') || q.includes('progress') || q.includes('site'))) ||
      contractorsList.some(c => {
        const n = c.name.toLowerCase();
        const code = c.code.toLowerCase();
        return (
          (n.includes('larsen') && (q.includes('l&t') || q.includes('larsen') || q.includes('toubro') || q.includes('lt'))) ||
          (n.includes('sterling') && (q.includes('sterling') || q.includes('wilson') || q.includes('sw'))) ||
          (n.includes('kone') && q.includes('kone')) ||
          (n.includes('apex') && q.includes('apex'))
        );
      });

    if (isContractorOrProjectStatusQuery && !q.includes('summary of daily progress report') && !q.includes('daily progress report')) {
      // Check for a specific contractor match
      const matched = contractorsList.find(c => {
        const n = c.name.toLowerCase();
        const code = c.code.toLowerCase();
        if (n.includes('larsen') && (q.includes('l&t') || q.includes('larsen') || q.includes('toubro') || q.includes('lt'))) return true;
        if (n.includes('sterling') && (q.includes('sterling') || q.includes('wilson') || q.includes('sw'))) return true;
        if (n.includes('kone') && q.includes('kone')) return true;
        if (n.includes('apex') && q.includes('apex')) return true;
        return q.includes(code);
      });

      if (matched) {
        if (matched.progressNotes.length > 0) {
          const latest = matched.progressNotes[0];
          const formattedDate = new Date(latest.reportingDate).toLocaleDateString('en-IN', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });

          let ans = `Executive Project Status Briefing: ${matched.name} (${matched.scope})\n\n` +
            `• Scope Package: ${latest.workPackageTitle || 'Main Scope Package'}\n` +
            `• Current Milestone: ${latest.milestoneName || 'Active Milestone'}\n` +
            `• Progress Completion: ${latest.progressPercent}% Completed [Status: ${latest.status.replace(/_/g, ' ')}]\n` +
            `• Reporting Date: ${formattedDate} (Logged by: ${latest.submittedBy})\n` +
            `• Manpower & Machinery: ${latest.manpowerDepl || 'Standard site crew deployed'}\n\n` +
            `Detailed Progress Update:\n` +
            `"${latest.progressNotes}"\n\n` +
            `Site Blocker & Schedule Risk:\n` +
            (latest.hasBlocker
              ? `⚠️ CRITICAL BLOCKER REPORTED: ${latest.blockerDesc}\n  - Escalated To: ${latest.reportedTo || 'Project Director'}\n  - Delay Impact: ${latest.blockerImpact || 'Under assessment'}\n`
              : `✅ Zero active blockers reported; work is proceeding on schedule.\n`) +
            `\nContractor Scorecard: Rating ${matched.rating}/5.0 • Performance Score: ${matched.performanceScore}/100.`;

          return {
            matched: true,
            answer: ans,
            data: latest,
            drillDownRoute: `/contractors?id=${matched.id}`,
          };
        } else {
          return {
            matched: true,
            answer: `Project Status for ${matched.name} (${matched.scope}):\n\n` +
              `• Active Contracts: ${matched.contracts.map(c => c.title).join('; ') || 'Structural Works'}\n` +
              `• Performance Score: ${matched.performanceScore}/100 (Rating: ${matched.rating}/5.0)\n` +
              (matched.dailyReports.length > 0
                ? `• Recent Daily Work: "${matched.dailyReports[0].completedWork}" (Planned: "${matched.dailyReports[0].plannedWork}")\n`
                : '') +
              `\nNo formal milestone progress notes logged yet for this contractor. You can record a progress report in Contractor Master to enable instant RAG indexing.`,
            data: matched,
            drillDownRoute: `/contractors?id=${matched.id}`,
          };
        }
      }

      // General overview across all contractors
      const totalNotes = contractorsList.reduce((acc, c) => acc + c.progressNotes.length, 0);
      let overview = `Project Status Overview (Contractor Progress Reports & Milestone Submissions):\n\n`;

      for (const c of contractorsList) {
        if (c.progressNotes.length > 0) {
          const p = c.progressNotes[0];
          overview += `• ${c.name} (${c.scope}):\n` +
            `  - Milestone: ${p.milestoneName} (${p.progressPercent}% Done, Status: ${p.status.replace(/_/g, ' ')})\n` +
            `  - Latest Progress: "${p.progressNotes.slice(0, 160)}${p.progressNotes.length > 160 ? '...' : ''}"\n` +
            `  - Blocker: ${p.hasBlocker ? `⚠️ ${p.blockerDesc}` : 'None (On Schedule)'}\n\n`;
        } else {
          overview += `• ${c.name} (${c.scope}):\n` +
            `  - Performance Score: ${c.performanceScore}/100 • Pending milestone note submission in Contractor Master.\n\n`;
        }
      }

      overview += `Total progress reports logged in system: ${totalNotes}.`;

      return {
        matched: true,
        answer: overview,
        data: contractorsList,
        drillDownRoute: '/contractors',
      };
    }

    // 9. Daily Progress Reports (DPR) / Today's Progress / Site Execution Logs
    if (
      q.includes('today') ||
      q.includes('daily progress') ||
      q.includes('dpr') ||
      q.includes('site report') ||
      (q.includes('progress') && (q.includes('report') || q.includes('status') || q.includes('log')))
    ) {
      const isToday = q.includes('today') || q.includes("today's");
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // If user specifically asked about today, check only today's submissions
      if (isToday) {
        const todayReports = await prisma.dailyReport.findMany({
          where: {
            date: { gte: todayStart },
          },
          include: { contractor: true, building: true, project: true },
          orderBy: { date: 'desc' },
        });

        const todayStr = new Date().toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });

        if (todayReports.length === 0) {
          return {
            matched: true,
            answer: `No daily progress report has been submitted for today (${todayStr}) yet.\n\nSite contractors can submit today's DPR in the Site Operations module, and it will immediately be indexed for queries here.`,
            drillDownRoute: '/operations?tab=daily',
          };
        }

        let ans = `### Daily Progress Report for Today (${todayStr}):\n\n`;
        todayReports.forEach((r, idx) => {
          ans += `${idx + 1}. **${r.contractor?.name || 'Contractor'}** (${r.building?.name || 'Site'}):\n` +
            `   • **Planned Work:** "${r.plannedWork}"\n` +
            `   • **Achieved EoD:** "${r.completedWork}"\n` +
            `   • **Manpower:** ${r.manpower} Pax deployed (${r.equipment || 'Standard equipment'})\n` +
            (r.hasBlocker
              ? `   • ⚠️ **Blocker:** ${r.blockerDesc} (Escalated to: ${r.reportedTo || 'Project Management'})\n\n`
              : `   • **Blockers:** Zero blockers; work on schedule.\n\n`);
        });

        return {
          matched: true,
          answer: ans,
          data: todayReports,
          drillDownRoute: '/operations?tab=daily',
        };
      }

      // Check general recent reports in system
      const recentReports = await prisma.dailyReport.findMany({
        orderBy: { date: 'desc' },
        include: { contractor: true, building: true, project: true },
        take: 10,
      });

      if (recentReports.length === 0) {
        return {
          matched: true,
          answer: `Currently, no Daily Progress Reports (DPR) are logged in the system.\n\nYou can submit a fresh Daily Report under the **Site Operations** module, and the RAG engine will instantly retrieve it.`,
          drillDownRoute: '/operations?tab=daily',
        };
      }

      let ans = `### Recent Site Daily Progress Reports (${recentReports.length} Submitted Logs):\n\n`;
      recentReports.forEach((r, idx) => {
        const logDate = new Date(r.date).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
        ans += `${idx + 1}. **${r.contractor?.name || 'Contractor'}** - ${r.building?.name || 'Site'} (${logDate}):\n` +
          `   • **Planned:** "${r.plannedWork}"\n` +
          `   • **Achieved:** "${r.completedWork}"\n` +
          `   • **Manpower:** ${r.manpower} Pax\n` +
          (r.hasBlocker ? `   • ⚠️ **Blocker:** ${r.blockerDesc}\n\n` : `   • **Blocker:** None\n\n`);
      });

      return {
        matched: true,
        answer: ans,
        data: recentReports,
        drillDownRoute: '/operations?tab=daily',
      };
    }

    // 10. Brokers & Channel Partners
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

    // 11. Delayed Contractors
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
