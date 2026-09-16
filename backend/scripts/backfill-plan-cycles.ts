/**
 * Rewrites plans stored in the pre-cycle shape (exercises or meals at the top
 * level) into a one-day cycle, and sets cycleLengthDays to match.
 *
 * Not required for correctness — every read path normalizes on the way out — so
 * this is housekeeping: it makes what is stored match what is served.
 *
 * Idempotent: a plan already holding `days` is left exactly as it is, so
 * running it twice changes nothing the second time. Item ids are never
 * rewritten, because CheckIn rows reference them.
 *
 *   pnpm --filter backend exec tsx scripts/backfill-plan-cycles.ts [--dry-run]
 */
import { prisma } from "../src/config/prisma.config.js";
import { normalizePlanContent } from "../src/features/plan/content.js";

const dryRun = process.argv.includes("--dry-run");

function alreadyCycle(content: unknown): boolean {
  return Boolean(content && typeof content === "object" && Array.isArray((content as { days?: unknown }).days));
}

async function main(): Promise<void> {
  const plans = await prisma.plan.findMany({ orderBy: { createdAt: "asc" } });
  let converted = 0;
  let skipped = 0;

  for (const plan of plans) {
    if (alreadyCycle(plan.content)) {
      // Keep the column honest even for rows converted by an earlier run.
      const days = (plan.content as { days: unknown[] }).days.length;
      if (plan.cycleLengthDays !== days && !dryRun) {
        await prisma.plan.update({ where: { id: plan.id }, data: { cycleLengthDays: days } });
      }
      skipped += 1;
      continue;
    }

    const content = normalizePlanContent(plan.type, plan.content);
    console.log(
      `${dryRun ? "would convert" : "converting"} ${plan.type} ${plan.id} "${plan.title}" -> ${content.days.length}-day cycle`,
    );
    if (!dryRun) {
      await prisma.plan.update({
        where: { id: plan.id },
        data: { content: content as unknown as object, cycleLengthDays: content.days.length },
      });
    }
    converted += 1;
  }

  console.log(
    `${dryRun ? "[dry run] " : ""}${converted} plan(s) converted, ${skipped} already in cycle shape, ${plans.length} total`,
  );
}

await main();
await prisma.$disconnect();
