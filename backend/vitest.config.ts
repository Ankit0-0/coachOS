import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Tests hit the real dev Postgres, so they must not run in parallel files
    // against the same rows; they also share one Express app instance.
    fileParallelism: false,
    // Keep request logging out of the test output — failures are what matter.
    // The suite makes far more than five requests from one address; the
    // limiter itself is tested directly in tests/early-access.test.ts.
    // Pushes are never sent from a test; the rate limits' own behaviour is
    // tested directly in tests/rate-limit.test.ts. The provider settings let
    // tests/social-sign-in.test.ts reach the (mocked) token checks.
    env: {
      LOG_LEVEL: "silent",
      EARLY_ACCESS_RATE_LIMIT_MAX: "100000",
      AUTH_RATE_LIMIT_MAX: "100000",
      PASSWORD_RESET_RATE_LIMIT_MAX: "100000",
      API_RATE_LIMIT_MAX: "100000",
      PUSH_NOTIFICATIONS_ENABLED: "false",
      GOOGLE_CLIENT_ID: "test-web-client-id,test-ios-client-id",
      APPLE_BUNDLE_IDS: "com.coachos.client,com.coachos.coach",
    },
  },
});
