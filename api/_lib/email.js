const nodemailer = require("nodemailer");

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 465,
    secure: Number(process.env.SMTP_PORT) === 465, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendActivationEmail({ to, name, link }) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("Faltan credenciales SMTP (SMTP_USER / SMTP_PASS). Saltando envío de correo.");
    return null;
  }

  const transporter = createTransporter();

  const mailOptions = {
    from: `"Programa NEXUS" <${process.env.SMTP_USER}>`,
    to: to,
    subject: "¡Bienvenido/a! Activa tu tarjeta de Lealtad NEXUS",
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #e5e7eb;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 32px; letter-spacing: 2px; font-weight: 800;">NEXUS</h1>
          <p style="color: #bfdbfe; margin: 10px 0 0 0; font-size: 16px; font-weight: 500; letter-spacing: 0.5px;">PROGRAMA DE LEALTAD</p>
        </div>
        
        <!-- Contenido Principal -->
        <div style="padding: 40px 30px; color: #374151; line-height: 1.6;">
          <h2 style="color: #111827; margin-top: 0; font-size: 24px;">¡Hola, ${name}!</h2>
          <p style="font-size: 16px; margin-bottom: 24px;">Gracias por unirte al <strong>Programa de Lealtad NEXUS</strong>. Tu tarjeta ha sido creada exitosamente y ya estás listo/a para empezar a descubrir beneficios exclusivos y acumular puntos en cada visita.</p>
          
          <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px 20px; margin-bottom: 30px; border-radius: 0 8px 8px 0;">
            <p style="margin: 0; font-size: 15px; color: #166534;">🎉 <strong>¡Todo listo!</strong> Accede a tu tarjeta digital en cualquier momento para consultar tu balance y recompensas.</p>
          </div>

          <!-- Botón de Acción -->
          <div style="text-align: center; margin: 40px 0;">
            <a href="${link}" style="background-color: #2563eb; color: #ffffff; padding: 16px 36px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.2);">
              Ver mi Tarjeta Digital
            </a>
          </div>
          
          <p style="font-size: 14px; color: #6b7280; margin-bottom: 8px;">Si el botón superior no funciona, también puedes copiar este enlace en tu navegador:</p>
          <div style="background-color: #f9fafb; padding: 12px 16px; border-radius: 6px; border: 1px solid #e5e7eb; word-break: break-all;">
            <a href="${link}" style="color: #2563eb; font-size: 13px; text-decoration: none;">${link}</a>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 24px 30px; text-align: center; border-top: 1px solid #f1f5f9;">
          <p style="font-size: 12px; color: #94a3b8; margin: 0; line-height: 1.5;">
            © ${new Date().getFullYear()} Programa NEXUS. Todos los derechos reservados.<br>
            Este es un correo generado automáticamente. Si no solicitaste este registro, por favor ignóralo de forma segura.
          </p>
        </div>
      </div>
    `,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log("Correo enviado: %s", info.messageId);
  return info;
}

module.exports = {
  sendActivationEmail,
};