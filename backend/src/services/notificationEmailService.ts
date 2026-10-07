import prisma from '../db/prisma.js';

export class NotificationEmailService {
  static async sendEmail(params: {
    to: string;
    cc?: string;
    subject: string;
    body: string;
    reminderId?: string;
    demandId?: string;
  }): Promise<{ success: boolean; emailLogId: string; error?: string }> {
    try {
      console.log(`[EMAIL DISPATCH] TO: ${params.to} | CC: ${params.cc || 'None'} | SUBJECT: ${params.subject}`);
      
      const log = await prisma.emailLog.create({
        data: {
          to: params.to,
          cc: params.cc || null,
          subject: params.subject,
          body: params.body,
          status: 'SENT',
          reminderId: params.reminderId || null,
          demandId: params.demandId || null,
        },
      });

      return { success: true, emailLogId: log.id };
    } catch (err: any) {
      console.error('Failed to send email:', err);
      const log = await prisma.emailLog.create({
        data: {
          to: params.to,
          cc: params.cc || null,
          subject: params.subject,
          body: params.body,
          status: 'FAILED',
          error: err.message || 'Unknown email dispatch error',
          reminderId: params.reminderId || null,
          demandId: params.demandId || null,
        },
      });
      return { success: false, emailLogId: log.id, error: err.message };
    }
  }

  static async createNotification(params: {
    userId: string;
    title: string;
    message: string;
    type: 'INFO' | 'WARNING' | 'ALERT' | 'SUCCESS';
    link?: string;
  }) {
    return prisma.notification.create({
      data: {
        userId: params.userId,
        title: params.title,
        message: params.message,
        type: params.type,
        link: params.link || null,
      },
    });
  }

  static async notifyRole(role: string, params: {
    title: string;
    message: string;
    type: 'INFO' | 'WARNING' | 'ALERT' | 'SUCCESS';
    link?: string;
  }) {
    const users = await prisma.user.findMany({
      where: { role, status: 'ACTIVE' },
      select: { id: true },
    });

    for (const u of users) {
      await this.createNotification({
        userId: u.id,
        ...params,
      });
    }
  }

  static async getEmailLogs(limit = 100) {
    return prisma.emailLog.findMany({
      orderBy: { sentAt: 'desc' },
      take: limit,
    });
  }

  static async getUserNotifications(userId: string) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  static async markNotificationRead(id: string) {
    return prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }
}
