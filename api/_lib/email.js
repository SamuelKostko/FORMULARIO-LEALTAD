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
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #2563eb;">Hola ${name},</h2>
        <p>¡Gracias por registrarte en nuestro programa de Lealtad NEXUS!</p>
        <p>Tu tarjeta ha sido creada exitosamente y ya puedes empezar a acumular puntos. Para ver tu balance y beneficios, accede a tu tarjeta a través del siguiente botón:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${link}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Ver mi Tarjeta NEXUS</a>
        </div>
        <p>Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
        <p style="word-break: break-all; color: #666; font-size: 14px;"><a href="${link}">${link}</a></p>
        <hr style="border: none; border-top: 1px solid #eaeaea; margin: 30px 0;" />
        <p style="font-size: 12px; color: #999;">Si no has solicitado este registro, puedes ignorar de forma segura este correo.</p>
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