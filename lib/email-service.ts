import nodemailer from "nodemailer";

export interface SendEmailParams {
  fromEmail: string;
  fromName?: string;
  toEmail: string;
  subject: string;
  bodyText?: string;
  bodyHtml?: string;
  appPassword?: string;
  smtpHost?: string;
  smtpPort?: number;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  timestamp: string;
}

/**
 * Dispatches a genuine RFC 5321 / 5322 email via Google Gmail SMTP (smtp.gmail.com)
 * or custom authenticated SMTP transport.
 */
export async function sendLiveEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const timestamp = new Date().toISOString();

  const host = params.smtpHost || "smtp.gmail.com";
  const port = params.smtpPort || 465;
  const isSecure = port === 465;

  const appPassword =
    params.appPassword ||
    process.env.GMAIL_APP_PASSWORD ||
    process.env.SMTP_PASSWORD ||
    "";

  if (!appPassword || appPassword.trim().length === 0) {
    return {
      success: false,
      error:
        "No email sending password configured. Please provide your 16-character Google App Password in Sending Accounts to dispatch real emails.",
      timestamp,
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: isSecure,
      auth: {
        user: params.fromEmail,
        pass: appPassword.replace(/\s+/g, ""), // clean spaces in app passwords
      },
      tls: {
        rejectUnauthorized: false, // Prevents self-signed SSL certificate issues
      },
    });

    const info = await transporter.sendMail({
      from: params.fromName ? `"${params.fromName}" <${params.fromEmail}>` : params.fromEmail,
      to: params.toEmail,
      subject: params.subject,
      text: params.bodyText || "",
      html: params.bodyHtml || params.bodyText?.replace(/\n/g, "<br/>") || "",
    });

    return {
      success: true,
      messageId: info.messageId,
      timestamp,
    };
  } catch (err: any) {
    console.error("[Email Dispatch Error]:", err);
    return {
      success: false,
      error: err?.message || "Failed to deliver email through SMTP transport",
      timestamp,
    };
  }
}

/**
 * Tests connection to Google SMTP with given credentials
 */
export async function verifySmtpConnection(email: string, appPassword: string): Promise<{ success: boolean; message: string }> {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: email.trim(),
        pass: appPassword.replace(/\s+/g, ""),
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    await transporter.verify();
    return { success: true, message: "Google SMTP connection verified successfully." };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || "Authentication failed. Check your Gmail address and 16-character Google App Password.",
    };
  }
}
