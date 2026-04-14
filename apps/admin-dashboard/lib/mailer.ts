import nodemailer from 'nodemailer';

export async function sendMail(to: string, subject: string, html: string) {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  console.log('SMTP_USER:', user ? 'configurado' : 'FALTA');
  console.log('SMTP_PASS:', pass ? 'configurado' : 'FALTA');

  if (!user || !pass) {
    console.error('SMTP credentials missing, skipping email');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.titan.email',
    port: 465,
    secure: true,
    auth: { user, pass },
  });

  try {
    const info = await transporter.sendMail({
      from: `"La Villa del Millón" <${user}>`,
      to,
      subject,
      html,
    });
    console.log('Email enviado:', info.messageId, info.response);
  } catch (error) {
    console.error('Error SMTP:', error);
    throw error;
  }
}
