const { Resend } = require("resend");
const nodemailer = require("nodemailer");

const parseBoolean = (value) => value === "true" || value === "1";

const getSmtpConfig = () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 0);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = parseBoolean(process.env.SMTP_SECURE || "false");

  if (!host || !port || !user || !pass) {
    throw new Error("SMTP configuration is missing");
  }

  return {
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  };
};

const getFromAddress = () => {
  return (
    process.env.RESEND_FROM || process.env.SMTP_FROM || process.env.SMTP_USER
  );
};

let resendClient;
let transporter;

const getResendClient = () => {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return null;
    }

    resendClient = new Resend(apiKey);
  }

  return resendClient;
};

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport(getSmtpConfig());
  }

  return transporter;
};

const sendWithResend = async ({ from, to, subject, text, html }) => {
  const client = getResendClient();
  if (!client) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const { error } = await client.emails.send({
    from,
    to,
    subject,
    text,
    html,
  });

  if (error) {
    throw new Error(`Resend email error: ${error.message || "unknown error"}`);
  }
};

const sendEmail = async ({ from, to, subject, text, html }) => {
  const provider = String(process.env.EMAIL_PROVIDER || "")
    .trim()
    .toLowerCase();

  if (provider === "resend") {
    return sendWithResend({ from, to, subject, text, html });
  }

  if (provider === "smtp") {
    return getTransporter().sendMail({ from, to, subject, text, html });
  }

  // Auto mode: prefer Resend when API key is present, fallback to SMTP.
  if (process.env.RESEND_API_KEY) {
    return sendWithResend({ from, to, subject, text, html });
  }

  return getTransporter().sendMail({ from, to, subject, text, html });
};

const sendPasswordResetOtpEmail = async ({ to, otp, ttlMinutes }) => {
  const from = getFromAddress();
  if (!from) {
    throw new Error("RESEND_FROM or SMTP_FROM is not configured");
  }

  const subject = "Your password reset code";
  const text =
    `We received a request to reset your password.\n\n` +
    `Your OTP code is: ${otp}\n` +
    `This code expires in ${ttlMinutes} minutes.\n\n` +
    `If you did not request this, you can ignore this email.`;

  const html = `
    <p>We received a request to reset your password.</p>
    <p><strong>Your OTP code is: ${otp}</strong></p>
    <p>This code expires in ${ttlMinutes} minutes.</p>
    <p>If you did not request this, you can ignore this email.</p>
  `;

  await sendEmail({
    from,
    to,
    subject,
    text,
    html,
  });
};

const sendPreorderCodeEmail = async ({
  to,
  code,
  productName,
  depositAmount,
}) => {
  const from = getFromAddress();
  if (!from) {
    throw new Error("RESEND_FROM or SMTP_FROM is not configured");
  }

  const subject = "Ma tra cuu don dat truoc";
  const text =
    `Cam on ban da dat coc preorder.\n\n` +
    `Ma tra cuu: ${code}\n` +
    (productName ? `San pham: ${productName}\n` : "") +
    (depositAmount ? `Tien coc: ${depositAmount} VND\n` : "") +
    `Ban co the tra cuu tai trang Preorder Lookup.`;

  const html = `
    <p>Cam on ban da dat coc preorder.</p>
    <p><strong>Ma tra cuu: ${code}</strong></p>
    ${productName ? `<p>San pham: ${productName}</p>` : ""}
    ${depositAmount ? `<p>Tien coc: ${depositAmount} VND</p>` : ""}
    <p>Ban co the tra cuu tai trang Preorder Lookup.</p>
  `;

  await sendEmail({
    from,
    to,
    subject,
    text,
    html,
  });
};

module.exports = {
  sendPasswordResetOtpEmail,
  sendPreorderCodeEmail,
};
