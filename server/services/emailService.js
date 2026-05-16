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

  const subject = "Reset your KaFigure account password";

  const text = `
Hello,

We received a request to reset the password for your KaFigure account.

Your verification code is: ${otp}

This code will expire in ${ttlMinutes} minutes.

If you did not request a password reset, you can safely ignore this email.

KaFigure Team
https://figureshop.qzz.io
`;

  const html = `
<div style="font-family:Arial,sans-serif;line-height:1.6;color:#222;padding:20px">
  <h2 style="margin-bottom:20px;">KaFigure Password Reset</h2>

  <p>Hello,</p>

  <p>
    We received a request to reset the password for your
    <strong>KaFigure</strong> account.
  </p>

  <p>Please use the verification code below:</p>

  <div
    style="
      font-size:32px;
      font-weight:bold;
      letter-spacing:4px;
      margin:24px 0;
      color:#111;
    "
  >
    ${otp}
  </div>

  <p>
    This verification code will expire in
    <strong>${ttlMinutes} minutes</strong>.
  </p>

  <p>
    If you did not request a password reset, you can safely ignore this email.
  </p>

  <hr style="margin:30px 0;" />

  <p style="font-size:14px;color:#666;">
    KaFigure Team<br />
    https://figureshop.qzz.io
  </p>
</div>
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
