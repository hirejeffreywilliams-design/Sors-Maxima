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

    // Test 1: getUserSubscription returns default free for unknown user
    const defaultSub = await stripeService.getUserSubscription("test_unknown_user_xyz");
    assert(defaultSub.subscriptionTier === "free", "getUserSubscription returns free tier for unknown user");
    assert(defaultSub.subscriptionStatus === "none", "getUserSubscription returns none status for unknown user");

    // Test 2: startTrial sets correct tier and status
    await cleanup();
    await pool.query("INSERT INTO user_subscriptions (username) VALUES ('test_trial_user')");
    const trialResult = await stripeService.startTrial("test_trial_user");
    assert(trialResult !== null, "startTrial returns a subscription object");
    assert(trialResult!.subscriptionTier === "pro", "startTrial sets tier to pro");
    assert(trialResult!.subscriptionStatus === "trialing", "startTrial sets status to trialing");
    assert(trialResult!.isTrialUser === true, "startTrial sets isTrialUser to true");
    assert(trialResult!.trialEndDate !== null, "startTrial sets trialEndDate");

    // Test 3: Trial has 7-day window
    const trialEnd = new Date(trialResult!.trialEndDate!);
    const now = new Date();
    const daysDiff = Math.round((trialEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    assert(daysDiff >= 6 && daysDiff <= 7, `Trial window is ~7 days (got ${daysDiff})`);

    // Test 4: Cannot start trial twice
    const secondTrial = await stripeService.startTrial("test_trial_user");
    assert(secondTrial === null, "Cannot start trial for user who already had one");

    // Test 5: Trial expiration - simulate expired trial
    await cleanup();
    const pastDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000); // 8 days ago
    const pastEnd = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000); // 1 day ago
    await pool.query(`
      INSERT INTO user_subscriptions (username, subscription_tier, subscription_status, trial_start_date, trial_end_date, is_trial_user, trial_converted)
      VALUES ('test_expired_trial', 'pro', 'trialing', $1, $2, true, false)
    `, [pastDate, pastEnd]);

    const expiredSub = await stripeService.getUserSubscription("test_expired_trial");
    assert(expiredSub.subscriptionTier === "free", "Expired trial downgrades to free tier");
    assert(expiredSub.subscriptionStatus === "expired", "Expired trial sets status to expired");
    assert(expiredSub.isTrialUser === false, "Expired trial sets isTrialUser to false");

    // Test 6: Webhook tier mapping - subscription created
    await cleanup();
    await pool.query(`
      INSERT INTO user_subscriptions (username, stripe_customer_id, subscription_tier, subscription_status)
      VALUES ('test_webhook_user', 'cus_test_123', 'free', 'none')
    `);
    await stripeService.handleWebhookEvent({
      type: 'customer.subscription.created',
      data: {
        object: {
          customer: 'cus_test_123',
          id: 'sub_test_456',
          status: 'active',
          items: { data: [{ price: { id: 'price_1SskcQIp7f8yVoSO8uj04w8T' } }] },
        },
      },
    });

    const webhookSub = await stripeService.getUserSubscription("test_webhook_user");
    assert(webhookSub.subscriptionTier === "pro", "Webhook correctly maps price ID to pro tier");
    assert(webhookSub.subscriptionStatus === "active", "Webhook sets status to active");

    // Test 7: Webhook - subscription deleted downgrades to free
    await stripeService.handleWebhookEvent({
      type: 'customer.subscription.deleted',
      data: {
        object: {
          customer: 'cus_test_123',
          id: 'sub_test_456',
        },
      },
    });

    const deletedSub = await stripeService.getUserSubscription("test_webhook_user");
    assert(deletedSub.subscriptionTier === "free", "Subscription deletion downgrades to free");
    assert(deletedSub.subscriptionStatus === "cancelled", "Subscription deletion sets status to cancelled");

    // Test 8: Webhook - invoice.payment_failed sets past_due
    await cleanup();
    await pool.query(`
      INSERT INTO user_subscriptions (username, stripe_customer_id, subscription_tier, subscription_status)
      VALUES ('test_payment_fail', 'cus_payment_fail', 'elite', 'active')
    `);
    await stripeService.handleWebhookEvent({
      type: 'invoice.payment_failed',
      data: {
        object: {
          customer: 'cus_payment_fail',
          subscription: 'sub_fail_123',
        },
      },
    });

    const failedSub = await stripeService.getUserSubscription("test_payment_fail");
    assert(failedSub.subscriptionStatus === "past_due", "Payment failure sets status to past_due");

    // Test 9: Grant free access
    await cleanup();
    await pool.query("INSERT INTO user_subscriptions (username) VALUES ('test_grant_user')");
    const granted = await stripeService.grantFreeAccess("test_grant_user", "whale", "admin");
    assert(granted.subscriptionTier === "whale", "grantFreeAccess sets correct tier");
    assert(granted.subscriptionStatus === "active", "grantFreeAccess sets status to active");

    // Test 10: Revoke free access
    const revoked = await stripeService.revokeFreeAccess("test_grant_user", "admin");
    assert(revoked.subscriptionTier === "free", "revokeFreeAccess resets to free tier");
    assert(revoked.subscriptionStatus === "none", "revokeFreeAccess resets status to none");

    // Test 11: Webhook - elite tier mapping
    await cleanup();
    await pool.query(`
      INSERT INTO user_subscriptions (username, stripe_customer_id)
      VALUES ('test_elite_user', 'cus_elite_test')
    `);
    await stripeService.handleWebhookEvent({
      type: 'customer.subscription.created',
      data: {
        object: {
          customer: 'cus_elite_test',
          id: 'sub_elite',
          status: 'active',
          items: { data: [{ price: { id: 'price_1SskcRIp7f8yVoSOEKOx5hde' } }] },
        },
      },
    });
    const eliteSub = await stripeService.getUserSubscription("test_elite_user");
    assert(eliteSub.subscriptionTier === "elite", "Webhook correctly maps price ID to elite tier");

    // Test 12: Webhook - whale tier mapping
    await cleanup();
    await pool.query(`
      INSERT INTO user_subscriptions (username, stripe_customer_id)
      VALUES ('test_whale_user', 'cus_whale_test')
    `);
    await stripeService.handleWebhookEvent({
      type: 'customer.subscription.created',
      data: {
        object: {
          customer: 'cus_whale_test',
          id: 'sub_whale',
          status: 'active',
          items: { data: [{ price: { id: 'price_1SskcRIp7f8yVoSOWQe60fFw' } }] },
        },
      },
    });
    const whaleSub = await stripeService.getUserSubscription("test_whale_user");
    assert(whaleSub.subscriptionTier === "whale", "Webhook correctly maps price ID to whale tier");

    // Test 13: Persistence - data survives re-read
    const persistCheck = await stripeService.getUserSubscription("test_whale_user");
    assert(persistCheck.subscriptionTier === "whale", "Subscription data persists across reads (DB-backed)");

  } catch (e: any) {
    console.log(`  ERROR: ${e.message}`);
    errors.push(e.message);
    failed++;
  } finally {
    await cleanup();
  }

  return { file: "stripeService.test.ts", passed, failed, errors };
}
