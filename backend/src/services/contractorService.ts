import prisma from '../db/prisma.js';

export class ContractorService {
  static async getContractors() {
    const contractors = await prisma.contractor.findMany({
      include: {
        contracts: true,
        dailyReports: { take: 5, orderBy: { date: 'desc' } },
        boqItems: true,
        issues: true,
      },
      orderBy: { performanceScore: 'desc' },
    });

    // Dynamically evaluate performance metrics from actual database records
    return contractors.map((c) => {
      const totalIssues = c.issues.length;
      const resolvedIssues = c.issues.filter(i => ['RESOLVED', 'CLOSED'].includes(i.status)).length;
      const issueResolutionRate = totalIssues > 0 ? (resolvedIssues / totalIssues) * 100 : 100;

      // BOQ cost variance check
      const totalBOQVariance = c.boqItems.reduce((acc, b) => acc + b.costVariance, 0);
      const boqPenalty = totalBOQVariance > 0 ? 5 : 0;

      // Dynamic Performance Score (Base 90 + Issue bonus/penalty - Variance penalty)
      const calculatedScore = Math.min(100, Math.max(50, Number((85 + (issueResolutionRate * 0.1) - boqPenalty).toFixed(1))));

      return {
        ...c,
        metrics: {
          totalContracts: c.contracts.length,
          totalContractsValue: c.contracts.reduce((sum, ct) => sum + ct.totalValue, 0),
          totalIssues,
          resolvedIssues,
          openIssues: totalIssues - resolvedIssues,
          issueResolutionRate: Number(issueResolutionRate.toFixed(1)),
          calculatedScore,
        },
      };
    });
  }

  static async getContractorById(id: string) {
    return prisma.contractor.findUnique({
      where: { id },
      include: {
        contracts: { include: { project: true } },
        dailyReports: { orderBy: { date: 'desc' } },
        boqItems: true,
        issues: { orderBy: { createdAt: 'desc' } },
      },
    });
  }
}
