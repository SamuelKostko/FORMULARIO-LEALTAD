const { MailerSend, EmailParams, Sender, Recipient } = require("mailersend");

async function sendActivationEmail({ to, name, link }) {
  if (!process.env.MAILERSEND_API_KEY) {
    console.warn("Falta token de MailerSend (MAILERSEND_API_KEY). Saltando envío de correo.");
    return null;
  }

  const mailerSend = new MailerSend({
    apiKey: process.env.MAILERSEND_API_KEY,
  });

  const sentFrom = new Sender(
    process.env.MAILERSEND_SENDER_EMAIL,
    "Programa V+ Puntos"
  );
  
  const recipients = [new Recipient(to, name)];

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Crea tu cuenta V+ Puntos</title>
      <!--[if mso]>
      <noscript>
        <xml>
          <o:OfficeDocumentSettings>
            <o:PixelsPerInch>96</o:PixelsPerInch>
          </o:OfficeDocumentSettings>
        </xml>
      </noscript>
      <![endif]-->
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        body { margin: 0; padding: 0; background-color: #0f172a; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        table { border-spacing: 0; }
        td { padding: 0; }
        img { border: 0; }
        .wrapper { width: 100%; table-layout: fixed; background-color: #020617; padding-bottom: 60px; }
        .main { background-color: #0f172a; margin: 0 auto; width: 100%; max-width: 600px; border-spacing: 0; color: #e2e8f0; border-radius: 24px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); border: 1px solid #1e293b; }
        .header { padding: 50px 30px; text-align: center; background: linear-gradient(135deg, #1e1b4b 0%, #3b82f6 100%); position: relative; }
        .header-bg-glow { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: radial-gradient(circle at top right, rgba(96, 165, 250, 0.3) 0%, transparent 60%); }
        .title { position: relative; color: #ffffff; font-size: 38px; font-weight: 800; letter-spacing: -0.02em; margin: 0; text-shadow: 0 4px 12px rgba(0,0,0,0.3); }
        .subtitle { position: relative; color: #bfdbfe; font-size: 14px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; margin-top: 8px; margin-bottom: 0; }
        .content { padding: 48px 40px; background-color: #0f172a; }
        .greeting { color: #f8fafc; font-size: 26px; font-weight: 700; margin-top: 0; margin-bottom: 20px; }
        .body-text { font-size: 16px; line-height: 1.6; color: #cbd5e1; margin-bottom: 30px; }
        .body-text strong { color: #ffffff; }
        .alert-box { background: linear-gradient(90deg, rgba(34,197,94,0.1) 0%, rgba(34,197,94,0.05) 100%); border-left: 4px solid #22c55e; padding: 20px 24px; border-radius: 0 12px 12px 0; margin-bottom: 35px; }
        .alert-text { margin: 0; font-size: 15px; color: #86efac; line-height: 1.5; }
        .button-wrapper { text-align: center; margin: 45px 0; }
        .button { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 18px 40px; border-radius: 9999px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.3), 0 4px 6px -2px rgba(37, 99, 235, 0.15); transition: all 0.3s ease; }
        .link-text { text-align: center; font-size: 13px; color: #64748b; margin-bottom: 12px; }
        .link-box { background-color: #1e293b; padding: 16px; border-radius: 12px; text-align: center; word-break: break-all; border: 1px solid #334155; }
        .raw-link { color: #60a5fa; font-size: 13px; text-decoration: none; }
        .footer { background-color: #020617; padding: 35px 40px; text-align: center; border-top: 1px solid #1e293b; }
        .footer-text { font-size: 12px; color: #64748b; margin: 0; line-height: 1.6; }
      </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #020617;">
      <center class="wrapper" style="width: 100%; table-layout: fixed; background-color: #020617; padding-top: 40px; padding-bottom: 60px;">
        <table class="main" width="100%" max-width="600" cellpadding="0" cellspacing="0" style="margin: 0 auto; width: 100%; max-width: 600px; background-color: #0f172a; border-radius: 24px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); border: 1px solid #1e293b; font-family: 'Inter', sans-serif;">
          <tr>
            <td class="header" style="padding: 50px 30px; text-align: center; background: linear-gradient(135deg, #1e1b4b 0%, #3b82f6 100%);">
              <h1 class="title" style="color: #ffffff; font-size: 42px; font-weight: 800; letter-spacing: -0.02em; margin: 0; text-shadow: 0 4px 12px rgba(0,0,0,0.3);">V+ Puntos</h1>
              <p class="subtitle" style="color: #bfdbfe; font-size: 14px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; margin-top: 12px; margin-bottom: 0;">Tu Programa de Lealtad</p>
            </td>
          </tr>
          <tr>
            <td class="content" style="padding: 48px 40px; background-color: #0f172a;">
              <h2 class="greeting" style="color: #f8fafc; font-size: 26px; font-weight: 700; margin-top: 0; margin-bottom: 24px;">¡Bienvenido/a, ${name}!</h2>
              <p class="body-text" style="font-size: 16px; line-height: 1.6; color: #cbd5e1; margin-top: 0; margin-bottom: 30px;">
                Gracias por unirte al programa exclusivo <strong>V+ Puntos</strong>. Tu tarjeta de beneficios ha sido creada exitosamente. Prepárate para acumular puntos, recibir ofertas personalizadas y elevar tu experiencia en cada visita.
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 35px;">
                <tr>
                  <td class="alert-box" style="background: linear-gradient(90deg, rgba(34,197,94,0.1) 0%, rgba(34,197,94,0.05) 100%); border-left: 4px solid #22c55e; padding: 20px 24px; border-radius: 0 12px 12px 0;">
                    <p class="alert-text" style="margin: 0; font-size: 15px; color: #86efac; line-height: 1.5;">✨ <strong>Todo está listo.</strong> Haz clic abajo para descubrir tu tarjeta digital y visualizar tus primeros beneficios de inmediato.</p>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 45px; text-align: center;">
                <tr>
                  <td align="center">
                    <a href="${link}" class="button" style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 18px 40px; border-radius: 9999px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.3);">
                      Ver Mi Tarjeta V+
                    </a>
                  </td>
                </tr>
              </table>
              
              <div style="text-align: center;">
                <p class="link-text" style="font-size: 13px; color: #64748b; margin-top: 0; margin-bottom: 12px;">¿Problemas con el botón? Copia y pega el enlace:</p>
                <div class="link-box" style="background-color: #1e293b; padding: 16px; border-radius: 12px; text-align: center; word-break: break-all; border: 1px solid #334155;">
                  <a href="${link}" class="raw-link" style="color: #60a5fa; font-size: 13px; text-decoration: none;">${link}</a>
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td class="footer" style="background-color: #020617; padding: 35px 40px; text-align: center; border-top: 1px solid #1e293b;">
              <p class="footer-text" style="font-size: 12px; color: #64748b; margin: 0; line-height: 1.6;">
                © ${new Date().getFullYear()} V+ Puntos. Una experiencia exclusiva.<br><br>
                Este mensaje fue enviado a ${to}. Si este correo llegó por error, puedes descartarlo de forma segura.
              </p>
            </td>
          </tr>
        </table>
      </center>
    </body>
    </html>
  `;

  const emailParams = new EmailParams()
    .setFrom(sentFrom)
    .setTo(recipients)
    .setSubject("¡Bienvenido/a! Activa tu tarjeta de Lealtad V+ Puntos")
    .setHtml(htmlContent);

  try {
    const response = await mailerSend.email.send(emailParams);
    console.log("Correo enviado via MailerSend. Estado:", response.statusCode);
    return response;
  } catch (error) {
    console.error("Error al enviar con MailerSend:", error);
    return null;
  }
}

module.exports = {
  sendActivationEmail,
};