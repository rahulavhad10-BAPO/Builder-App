import prisma from '../db/prisma.js';
import { NotificationEmailService } from './notificationEmailService.js';
import { AuditService } from './auditService.js';

export class DemandReminderEngine {
  /**
   * Scans all active payment demands and triggers reminders based on schedule offsets:
   * [-7, -3, 0, 3, 7] days relative to due date.
   * Ensures idempotency: never sends the same reminderType twice for the same demand.
   */
  static async runReminderScan(): Promise<{
    evaluated: number;
    remindersSent: number;
    errors: number;
  }> {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Load active demands with remaining balance
    const activeDemands = await prisma.paymentDemand.findMany({
      where: {
        balanceAmount: { gt: 0 },
        status: { notIn: ['PAID', 'CANCELLED'] },
      },
      include: {
        flat: {
          include: {
            project: true,
            building: true,
          },
        },
        customer: true,
        reminders: true,
      },
    });

    let remindersSent = 0;
    let errors = 0;

    for (const demand of activeDemands) {
      const dueDate = new Date(demand.dueDate);
      const diffTime = now.getTime() - dueDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); // negative means before due date, positive means after

      let reminderType: string | null = null;
      if (diffDays === -7) reminderType = 'SEVEN_DAYS_BEFORE';
      else if (diffDays === -3) reminderType = 'THREE_DAYS_BEFORE';
      else if (diffDays === 0) reminderType = 'ON_DUE_DATE';
      else if (diffDays === 3) reminderType = 'THREE_DAYS_AFTER';
      else if (diffDays === 7) reminderType = 'SEVEN_DAYS_AFTER';

      if (!reminderType) continue;

      // Idempotency check: Has this reminderType already been sent for this demand?
      const alreadySent = demand.reminders.some(r => r.reminderType === reminderType && r.status === 'SENT');
      if (alreadySent) continue;

      try {
        await this.sendDemandReminder({
          demandId: demand.id,
          reminderType,
        });
        remindersSent++;
      } catch (err) {
        errors++;
      }
    }

    return { evaluated: activeDemands.length, remindersSent, errors };
  }

  static async sendDemandReminder(params: {
    demandId: string;
    reminderType: string;
    userId?: string;
  }) {
    const demand = await prisma.paymentDemand.findUnique({
      where: { id: params.demandId },
      include: {
        flat: {
          include: {
            project: true,
            building: true,
          },
        },
        customer: true,
        reminders: true,
      },
    });

    if (!demand) throw new Error('Payment Demand not found');

    // Check idempotency for this reminder type
    const existing = demand.reminders.find(
      r => r.reminderType === params.reminderType && r.status === 'SENT'
    );
    if (existing) {
      return { success: false, message: `Reminder '${params.reminderType}' already sent on ${existing.sentDate?.toISOString()}` };
    }

    const customer = demand.customer;
    const flat = demand.flat;
    const project = flat.project;

    // CC addresses looked up dynamically: Sales Executive + Finance Manager + Admin
    const salesUser = flat.salesExecutiveName
      ? await prisma.user.findFirst({ where: { name: flat.salesExecutiveName }, select: { email: true } })
      : null;
    const financeUsers = await prisma.user.findMany({
      where: { role: 'Finance', status: 'ACTIVE' },
      select: { email: true },
    });

    const ccList = [
      salesUser?.email,
      financeUsers[0]?.email || 'finance@builderops.com',
      'collections@builderops.com',
    ].filter(Boolean).join(', ');

    const daysOverdue = demand.daysOverdue;
    const isOverdue = daysOverdue > 0;

    const subject = isOverdue
      ? `OVERDUE PAYMENT NOTICE: Unit ${flat.unitNumber} - Demand ${demand.demandNumber}`
      : `Payment Reminder: Unit ${flat.unitNumber} - Demand ${demand.demandNumber}`;

    const body = `
Dear ${customer.name},

${isOverdue ? 'This is an urgent notice regarding your overdue payment.' : 'This is a friendly reminder regarding your upcoming payment demand.'}

DEMAND DETAILS:
- Customer Name: ${customer.name}
- Project: ${project.name} (${flat.building.name})
- Unit / Flat: ${flat.unitNumber}
- Demand Number: ${demand.demandNumber}
- Demand Type: ${demand.demandType.replace(/_/g, ' ')}
- Due Date: ${demand.dueDate.toISOString().split('T')[0]}
- Total Demand Amount: ₹${demand.totalAmount.toLocaleString('en-IN')}
- Amount Paid: ₹${demand.paidAmount.toLocaleString('en-IN')}
- Balance Outstanding: ₹${demand.balanceAmount.toLocaleString('en-IN')}
${isOverdue ? `- Days Overdue: ${daysOverdue} Day(s)` : ''}

PAYMENT INSTRUCTIONS:
Account Name: Skyline Solitaire Escrow Collections A/C
Bank: HDFC Bank Ltd, Cyber City Branch
A/C Number: 50200088991234
IFSC Code: HDFC0001234

For queries, contact your Sales Relationship Manager: ${flat.salesExecutiveName || 'Customer Support'}.
    `.trim();

    // Create pending reminder record
    const reminderRecord = await prisma.demandReminder.create({
      data: {
        demandId: demand.id,
        customerId: customer.id,
        reminderType: params.reminderType,
        scheduledDate: new Date(),
        recipient: customer.email,
        status: 'PENDING',
      },
    });

    const emailRes = await NotificationEmailService.sendEmail({
      to: customer.email,
      cc: ccList,
      subject,
      body,
      reminderId: reminderRecord.id,
      demandId: demand.id,
    });

    const finalStatus = emailRes.success ? 'SENT' : 'FAILED';

    const updatedReminder = await prisma.demandReminder.update({
      where: { id: reminderRecord.id },
      data: {
        status: finalStatus,
        sentDate: emailRes.success ? new Date() : null,
        emailRef: emailRes.emailLogId,
        failureReason: emailRes.error || null,
      },
    });

    await AuditService.log({
      userId: params.userId,
      action: 'SEND_DEMAND_REMINDER',
      module: 'DEMAND_REMINDER',
      recordId: updatedReminder.id,
      newValue: {
        reminderType: params.reminderType,
        recipient: customer.email,
        status: finalStatus,
      },
    });

    return { success: emailRes.success, reminder: updatedReminder };
  }

  static async getReminderHistory(demandId?: string, customerId?: string) {
    return prisma.demandReminder.findMany({
      where: {
        demandId: demandId || undefined,
        customerId: customerId || undefined,
      },
      include: {
        demand: {
          select: {
            id: true,
            demandNumber: true,
            totalAmount: true,
            balanceAmount: true,
            dueDate: true,
          },
        },
        customer: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
