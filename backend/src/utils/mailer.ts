import { env } from "../config/env.js";
import { getLogger } from "../config/logger.js";

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
 *
 * That fallback is refused outright in production: printing a working reset
 * code into a log aggregator is a credential leak, so a missing key there is an
 * error to fix, not something to route around. The `code` field is redacted by
 * the logger as a second line of defence.
 */
export async function sendPasswordResetEmail(to: string, code: string): Promise<void> {
  if (!env.resendApiKey) {
    if (env.nodeEnv === "production") {
      getLogger().error(
        { to },
        "mailer: RESEND_API_KEY is not set — no password reset email sent, and the code is not logged in production",
      );
      return;
    }
    getLogger().info(
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
      getLogger().error(
        { to, status: response.status, body: await response.text().catch(() => "") },
        "mailer: Resend rejected the password reset email",
      );
      return;
    }

    getLogger().debug({ to }, "mailer: password reset email sent");
  } catch (error) {
    getLogger().error({ err: error, to }, "mailer: password reset email failed to send");
  }
}
