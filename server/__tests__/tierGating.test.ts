import { pool } from "../db";
import { stripeService } from "../stripeService";

async function cleanup() {
  await pool.query("DELETE FROM user_subscriptions WHERE username LIKE 'test_%'").catch(() => {});
}

export default async function runTests(): Promise<{ file: string; passed: number; failed: number; errors: string[] }> {
  const errors: string[] = [];
  let passed = 0;

  await stripeService.init();
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  PASS: ${message}`);
      passed++;
    } else {
      console.log(`  FAIL: ${message}`);
      errors.push(message);
      failed++;
    }
  }

  try {
    await cleanup();

    // Test 1: Free user gets free tier
    await pool.query("INSERT INTO user_subscriptions (username, subscription_tier, subscription_status) VALUES ('test_free_gate', 'free', 'none')");
    const freeSub = await stripeService.getUserSubscription("test_free_gate");
    assert(freeSub.subscriptionTier === "free", "Free user has free tier");

    // Test 2: Free tier should NOT be in pro allowed tiers
    const allowedProTiers = ["pro", "elite", "whale"];
    assert(!allowedProTiers.includes(freeSub.subscriptionTier), "Free tier is not in pro/elite/whale allowed set");

    // Test 3: Pro tier IS in pro allowed tiers
    await pool.query("INSERT INTO user_subscriptions (username, subscription_tier, subscription_status) VALUES ('test_pro_gate', 'pro', 'active')");
    const proSub = await stripeService.getUserSubscription("test_pro_gate");
    assert(allowedProTiers.includes(proSub.subscriptionTier), "Pro tier is in allowed set for pro endpoints");

    // Test 4: Elite tier allows access to pro endpoints
    await pool.query("INSERT INTO user_subscriptions (username, subscription_tier, subscription_status) VALUES ('test_elite_gate', 'elite', 'active')");
    const eliteSub = await stripeService.getUserSubscription("test_elite_gate");
    assert(allowedProTiers.includes(eliteSub.subscriptionTier), "Elite tier passes pro-level gating");

    // Test 5: Whale tier allows access to all endpoints
    await pool.query("INSERT INTO user_subscriptions (username, subscription_tier, subscription_status) VALUES ('test_whale_gate', 'whale', 'active')");
    const whaleSub = await stripeService.getUserSubscription("test_whale_gate");
    const allowedAllTiers = ["pro", "elite", "whale"];
    assert(allowedAllTiers.includes(whaleSub.subscriptionTier), "Whale tier passes all gating levels");

    // Test 6: Trialing user has pro access
    await pool.query(`
      INSERT INTO user_subscriptions (username, subscription_tier, subscription_status, trial_start_date, trial_end_date, is_trial_user)
      VALUES ('test_trial_gate', 'pro', 'trialing', NOW(), NOW() + INTERVAL '7 days', true)
    `);
    const trialSub = await stripeService.getUserSubscription("test_trial_gate");
    assert(trialSub.subscriptionTier === "pro", "Trialing user has pro tier access");
    assert(allowedProTiers.includes(trialSub.subscriptionTier), "Trialing user passes pro gating");

    // Test 7: Expired trial does NOT have pro access
    await pool.query(`
      INSERT INTO user_subscriptions (username, subscription_tier, subscription_status, trial_start_date, trial_end_date, is_trial_user, trial_converted)
      VALUES ('test_expired_gate', 'pro', 'trialing', NOW() - INTERVAL '14 days', NOW() - INTERVAL '7 days', true, false)
    `);
    const expiredSub = await stripeService.getUserSubscription("test_expired_gate");
    assert(expiredSub.subscriptionTier === "free", "Expired trial user has free tier");
    assert(!allowedProTiers.includes(expiredSub.subscriptionTier), "Expired trial user is blocked from pro endpoints");

    // Test 8: Cancelled subscription has free tier
    await pool.query(`
      INSERT INTO user_subscriptions (username, subscription_tier, subscription_status)
      VALUES ('test_cancelled_gate', 'free', 'cancelled')
    `);
    const cancelledSub = await stripeService.getUserSubscription("test_cancelled_gate");
    assert(cancelledSub.subscriptionTier === "free", "Cancelled user has free tier");
    assert(!allowedProTiers.includes(cancelledSub.subscriptionTier), "Cancelled user blocked from pro endpoints");

    // Test 9: Validate price ID works for allowed IDs
    assert(stripeService.validatePriceId("price_1SskcQIp7f8yVoSO8uj04w8T") === true, "Valid pro price ID is accepted");
    assert(stripeService.validatePriceId("price_1SskcRIp7f8yVoSOEKOx5hde") === true, "Valid elite price ID is accepted");
    assert(stripeService.validatePriceId("price_1SskcRIp7f8yVoSOWQe60fFw") === true, "Valid whale price ID is accepted");

    // Test 10: Invalid price ID is rejected
    assert(stripeService.validatePriceId("price_invalid_123") === false, "Invalid price ID is rejected");
    assert(stripeService.validatePriceId("") === false, "Empty price ID is rejected");

  } catch (e: any) {
    console.log(`  ERROR: ${e.message}`);
    errors.push(e.message);
    failed++;
  } finally {
    await cleanup();
  }

  return { file: "tierGating.test.ts", passed, failed, errors };
}
