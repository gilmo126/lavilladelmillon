import { Resend } from 'resend';

export async function sendMail(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  console.log('RESEND_API_KEY:', apiKey ? 'configurado' : 'FALTA');
  if (!apiKey) {
    console.error('RESEND_API_KEY missing, skipping email');
    return;
  }

  const resend = new Resend(apiKey);
  console.log('Enviando email a:', to, '| Asunto:', subject);

  const { data, error } = await resend.emails.send({
    from: 'La Villa del Millón <noreply@lavilladelmillon.com>',
    to,
    subject,
    html,
  });

  if (error) {
    console.error('Error Resend:', error);
    throw new Error(error.message);
  }
  console.log('Email enviado:', data?.id);
}
