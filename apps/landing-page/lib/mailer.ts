import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.titan.email',
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
});

export async function sendMail(to: string, subject: string, html: string) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return;
  await transporter.sendMail({
    from: '"La Villa del Millón" <noreply@lavilladelmillon.com>',
    to,
    subject,
    html,
  });
}
