import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Tests hit the real dev Postgres, so they must not run in parallel files
    // against the same rows; they also share one Express app instance.
    fileParallelism: false,
    // Keep request logging out of the test output — failures are what matter.
    env: { LOG_LEVEL: "silent" },
  },
});
