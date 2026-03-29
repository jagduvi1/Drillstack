const nodemailer = require("nodemailer");

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT, 10) || 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || "DrillStack <noreply@drillstack.com>";

let transporter = null;

function isEmailEnabled() {
  return !!(SMTP_HOST && SMTP_USER && SMTP_PASS);
}

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return transporter;
}

function baseUrl() {
  return process.env.FRONTEND_URL || "http://localhost:3000";
}

async function sendVerificationEmail(to, name, token) {
  if (!isEmailEnabled()) {
    console.warn("[email] SMTP not configured — skipping verification email");
    return;
  }

  const url = `${baseUrl()}/verify-email?token=${token}`;

  await getTransporter().sendMail({
    from: SMTP_FROM,
    to,
    subject: "Verify your email — DrillStack",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <h2 style="color:#1a1a1a;">Welcome to DrillStack, ${name}!</h2>
        <p style="color:#444;line-height:1.6;">
          Please verify your email address by clicking the button below.
          This link expires in 24 hours.
        </p>
        <a href="${url}"
           style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;
                  border-radius:6px;text-decoration:none;font-weight:600;margin:16px 0;">
          Verify Email
        </a>
        <p style="color:#888;font-size:13px;">
          If the button doesn't work, copy and paste this link into your browser:<br/>
          <a href="${url}" style="color:#2563eb;">${url}</a>
        </p>
      </div>
    `,
  });
}

async function sendPasswordResetEmail(to, name, token) {
  if (!isEmailEnabled()) {
    console.warn("[email] SMTP not configured — skipping password reset email");
    return;
  }

  const url = `${baseUrl()}/reset-password?token=${token}`;

  await getTransporter().sendMail({
    from: SMTP_FROM,
    to,
    subject: "Reset your password — DrillStack",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <h2 style="color:#1a1a1a;">Password Reset</h2>
        <p style="color:#444;line-height:1.6;">
          Hi ${name}, we received a request to reset your password.
          Click the button below to choose a new password.
          This link expires in 1 hour.
        </p>
        <a href="${url}"
           style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;
                  border-radius:6px;text-decoration:none;font-weight:600;margin:16px 0;">
          Reset Password
        </a>
        <p style="color:#888;font-size:13px;">
          If you didn't request this, you can safely ignore this email.<br/>
          <a href="${url}" style="color:#2563eb;">${url}</a>
        </p>
      </div>
    `,
  });
}

module.exports = { isEmailEnabled, sendVerificationEmail, sendPasswordResetEmail };
