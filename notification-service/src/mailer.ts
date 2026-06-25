import nodemailer from 'nodemailer';
import type { NotifyTeacherEvent } from './types.ts';

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
}

export class Mailer {
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;

  constructor(config: SmtpConfig) {
    this.from = config.user || 'ismart@noreply';
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });
  }

  async sendTeacherNotification(event: NotifyTeacherEvent): Promise<void> {
    const statusLabel = event.status === 'passed' ? 'сдал(а)' : 'не прошёл(а) тесты';
    const subject = `[iSmart] ${event.studentName} — «${event.taskTitle}»`;
    const text = [
      `Студент ${event.studentName} ${statusLabel} задание «${event.taskTitle}».`,
      ``,
      `Посмотреть решение: /submissions/${event.submissionId}`,
    ].join('\n');

    await this.transporter.sendMail({
      from: this.from,
      to: event.teacherEmail,
      subject,
      text,
    });
  }
}
