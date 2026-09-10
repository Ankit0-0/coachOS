import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

function resetEmailBody(code: string): { subject: string; text: string; html: string } {
  return {
    subject: "Your Coach OS password reset code",
    text: [
      "Use this code to reset your Coach OS password:",
      "",
      code,
      "",
      "The code expires in 15 minutes and can only be used once.",
      "If you didn't ask to reset your password, you can ignore this email.",
    ].join("\n"),
    html: [
      "<p>Use this code to reset your Coach OS password:</p>",
      `<p style="font-family:ui-monospace,monospace;font-size:28px;letter-spacing:4px;font-weight:700">${code}</p>`,
      "<p>The code expires in 15 minutes and can only be used once.</p>",
      "<p>If you didn't ask to reset your password, you can ignore this email.</p>",
    ].join(""),
  };
}

/**
 * Sends the reset code. With no RESEND_API_KEY configured this logs the code
 * instead, so the whole flow is exercisable locally without an email account.
 */
export async function sendPasswordResetEmail(to: string, code: string): Promise<void> {
  if (!env.resendApiKey) {
    logger.info(
      { to, code },
      "mailer: RESEND_API_KEY not set — logging code instead of sending (dev fallback)",
    );
    return;
  }

  const { subject, text, html } = resetEmailBody(code);

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: env.resendFromEmail, to: [to], subject, text, html }),
    });

    if (!response.ok) {
      // Never rethrow: a delivery failure must not tell the caller whether the
      // address exists, and forgot-password always answers the same way.
      logger.error(
        { to, status: response.status, body: await response.text().catch(() => "") },
        "mailer: Resend rejected the password reset email",
      );
      return;
    }

    logger.debug({ to }, "mailer: password reset email sent");
  } catch (error) {
    logger.error({ err: error, to }, "mailer: password reset email failed to send");
  }
}
