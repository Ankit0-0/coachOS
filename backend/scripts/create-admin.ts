/**
 * Creates an admin account.
 *
 * This is the only way an ADMIN is ever created. There is no registration
 * route for it on purpose: `registerSchema` accepts COACH and CLIENT only, so
 * no request body can reach this role. Run it by hand on the machine that owns
 * the database.
 *
 *   pnpm admin:create -- --email admin@example.com --password "..." --name "Ada"
 *
 * or, to keep the password out of your shell history:
 *
 *   ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD='...' ADMIN_NAME='Ada' pnpm admin:create
 *
 * Re-running it for an address that already exists promotes that account to
 * ADMIN and resets its password, rather than failing — that is the usual
 * reason to run it twice.
 */
import { prisma } from "../src/config/prisma.config.js";
import { normalizeEmail } from "../src/utils/email.js";
import { hashPassword } from "../src/utils/password.js";

const MIN_PASSWORD_LENGTH = 8;

/** Reads `--flag value` from argv, falling back to an environment variable. */
function arg(flag: string, envVar: string): string | undefined {
  const index = process.argv.indexOf(`--${flag}`);
  if (index !== -1 && process.argv[index + 1]) return process.argv[index + 1];
  return process.env[envVar];
}

async function main() {
  const email = arg("email", "ADMIN_EMAIL");
  const password = arg("password", "ADMIN_PASSWORD");
  const name = arg("name", "ADMIN_NAME");

  const missing = [
    !email && "--email (or ADMIN_EMAIL)",
    !password && "--password (or ADMIN_PASSWORD)",
    !name && "--name (or ADMIN_NAME)",
  ].filter(Boolean);

  if (missing.length > 0) {
    console.error(`Missing required argument(s): ${missing.join(", ")}`);
    console.error('\nUsage: pnpm admin:create -- --email admin@example.com --password "..." --name "Ada"');
    process.exitCode = 1;
    return;
  }

  if (password!.length < MIN_PASSWORD_LENGTH) {
    console.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    process.exitCode = 1;
    return;
  }

  const normalizedEmail = normalizeEmail(email!);
  const hashed = await hashPassword(password!);

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    const admin = await prisma.user.update({
      where: { email: normalizedEmail },
      data: {
        role: "ADMIN",
        password: hashed,
        name: name!.trim(),
        // Approval is a coach concept; an admin carries no status.
        coachApprovalStatus: null,
      },
    });
    console.log(`Updated existing account to ADMIN: ${admin.email} (${admin.id})`);
    return;
  }

  const admin = await prisma.user.create({
    data: { email: normalizedEmail, password: hashed, name: name!.trim(), role: "ADMIN" },
  });
  console.log(`Created admin: ${admin.email} (${admin.id})`);
}

main()
  .catch((error) => {
    console.error("Failed to create admin:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
