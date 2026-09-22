import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Tests hit the real dev Postgres, so they must not run in parallel files
    // against the same rows; they also share one Express app instance.
    fileParallelism: false,
    // Keep request logging out of the test output — failures are what matter.
    // The suite makes far more than five requests from one address; the
    // limiter itself is tested directly in tests/early-access.test.ts.
    env: { LOG_LEVEL: "silent", EARLY_ACCESS_RATE_LIMIT_MAX: "100000" },
  },
});
