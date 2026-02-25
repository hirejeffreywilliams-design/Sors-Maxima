import { getUncachableStripeClient, getStripePublishableKey, isStripeAvailable } from './stripeClient';
import { pool } from './db';

const ALLOWED_PRICE_IDS = new Set([
  'price_1SskcQIp7f8yVoSO8uj04w8T',
  'price_1SskcQIp7f8yVoSO1VDHyrWy',
  'price_1SskcRIp7f8yVoSOEKOx5hde',
  'price_1SskcRIp7f8yVoSOOBNZTk3V',
  'price_1SskcRIp7f8yVoSOWQe60fFw',
  'price_1SskcSIp7f8yVoSOxK0pY4Ki',
]);

const PRICE_TO_TIER: Record<string, 'pro' | 'elite' | 'whale'> = {
  'price_1SskcQIp7f8yVoSO8uj04w8T': 'pro',
  'price_1SskcQIp7f8yVoSO1VDHyrWy': 'pro',
  'price_1SskcRIp7f8yVoSOEKOx5hde': 'elite',
  'price_1SskcRIp7f8yVoSOOBNZTk3V': 'elite',
  'price_1SskcRIp7f8yVoSOWQe60fFw': 'whale',
  'price_1SskcSIp7f8yVoSOxK0pY4Ki': 'whale',
};

export interface UserSubscription {
  username: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionTier: 'free' | 'pro' | 'elite' | 'whale';
  subscriptionStatus: 'active' | 'cancelled' | 'past_due' | 'none' | 'trialing' | 'expired';
  trialStartDate: string | null;
  trialEndDate: string | null;
  isTrialUser: boolean;
  trialConverted: boolean;
  registeredAt: string;
  grantedFreeAccess?: boolean;
  grantedBy?: string | null;
  grantedAt?: string | null;
}

const TRIAL_DAYS = 7;
const TRIAL_TIER: 'pro' | 'elite' | 'whale' = 'pro';
const POST_TRIAL_TIER: 'free' | 'pro' | 'elite' | 'whale' = 'free';

function rowToSubscription(row: any): UserSubscription {
  return {
    username: row.username,
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
    subscriptionTier: row.subscription_tier || 'free',
    subscriptionStatus: row.subscription_status || 'none',
    trialStartDate: row.trial_start_date ? new Date(row.trial_start_date).toISOString() : null,
    trialEndDate: row.trial_end_date ? new Date(row.trial_end_date).toISOString() : null,
    isTrialUser: row.is_trial_user || false,
    trialConverted: row.trial_converted || false,
    registeredAt: row.registered_at ? new Date(row.registered_at).toISOString() : new Date().toISOString(),
    grantedFreeAccess: row.granted_free_access || false,
    grantedBy: row.granted_by || null,
    grantedAt: row.granted_at ? new Date(row.granted_at).toISOString() : null,
  };
}

function defaultSubscription(username: string): UserSubscription {
  return {
    username,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    subscriptionTier: 'free',
    subscriptionStatus: 'none',
    trialStartDate: null,
    trialEndDate: null,
    isTrialUser: false,
    trialConverted: false,
    registeredAt: new Date().toISOString(),
  };
}

export class StripeService {
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_subscriptions (
          id SERIAL PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          stripe_customer_id TEXT,
          stripe_subscription_id TEXT,
          subscription_tier TEXT NOT NULL DEFAULT 'free',
          subscription_status TEXT NOT NULL DEFAULT 'none',
          trial_start_date TIMESTAMP,
          trial_end_date TIMESTAMP,
          is_trial_user BOOLEAN DEFAULT false,
          trial_converted BOOLEAN DEFAULT false,
          registered_at TIMESTAMP DEFAULT NOW(),
          granted_free_access BOOLEAN DEFAULT false,
          granted_by TEXT,
          granted_at TIMESTAMP,
          updated_at TIMESTAMP DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_user_subs_stripe_cust ON user_subscriptions(stripe_customer_id);
      `);
      this.initialized = true;
      console.log('[STRIPE] user_subscriptions table initialized');
    } catch (error) {
      console.error('[STRIPE] Failed to initialize user_subscriptions table:', error);
    }
  }

  private async ensureInit() {
    if (!this.initialized) await this.init();
  }

  async isAvailable(): Promise<boolean> {
    return await isStripeAvailable();
  }

  async createCustomer(email: string, username: string) {
    await this.ensureInit();

    const now = new Date();
    const trialEnd = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

    await pool.query(`
      INSERT INTO user_subscriptions (username, subscription_tier, subscription_status, trial_start_date, trial_end_date, is_trial_user, trial_converted, registered_at)
      VALUES ($1, $2, $3, $4, $5, true, false, $6)
      ON CONFLICT (username) DO NOTHING
    `, [username, TRIAL_TIER, 'trialing', now, trialEnd, now]);

    const stripe = await getUncachableStripeClient();
    if (stripe) {
      try {
        const customer = await stripe.customers.create({
          email,
          metadata: { username },
        });
        await pool.query(`
          UPDATE user_subscriptions SET stripe_customer_id = $1, updated_at = NOW() WHERE username = $2
        `, [customer.id, username]);
        return customer;
      } catch (error) {
        console.log('[STRIPE] Failed to create customer, continuing in demo mode:', error);
      }
    }

    console.log(`[STRIPE] Demo mode - created local subscription for ${username} with 7-day trial`);
    return { id: `demo_${username}_${Date.now()}`, email, metadata: { username } };
  }

  validatePriceId(priceId: string): boolean {
    return ALLOWED_PRICE_IDS.has(priceId);
  }

  async createCheckoutSession(customerId: string, priceId: string, successUrl: string, cancelUrl: string) {
    if (!this.validatePriceId(priceId)) {
      throw new Error(`Invalid price ID: ${priceId}`);
    }

    const stripe = await getUncachableStripeClient();
    if (!stripe) {
      throw new Error('Stripe is not available - payment processing is disabled in demo mode');
    }

    return await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
    });
  }

  async createCustomerPortalSession(customerId: string, returnUrl: string) {
    const stripe = await getUncachableStripeClient();
    if (!stripe) {
      throw new Error('Stripe is not available - billing portal is disabled in demo mode');
    }

    return await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  }

  async getPublishableKey() {
    return await getStripePublishableKey();
  }

  async getUserSubscription(username: string): Promise<UserSubscription> {
    await this.ensureInit();

    const result = await pool.query(
      'SELECT * FROM user_subscriptions WHERE username = $1',
      [username]
    );

    if (result.rows.length > 0) {
      const sub = rowToSubscription(result.rows[0]);

      if (sub.subscriptionStatus === 'trialing' && sub.trialEndDate && !sub.trialConverted) {
        const trialEnd = new Date(sub.trialEndDate);
        if (new Date() > trialEnd) {
          await pool.query(`
            UPDATE user_subscriptions
            SET subscription_tier = $1, subscription_status = 'expired', is_trial_user = false, trial_converted = false, updated_at = NOW()
            WHERE username = $2
          `, [POST_TRIAL_TIER, username]);
          sub.subscriptionTier = POST_TRIAL_TIER;
          sub.subscriptionStatus = 'expired';
          sub.isTrialUser = false;
          sub.trialConverted = false;
          console.log(`[TRIAL] Trial expired for ${username}, downgraded to free tier — upgrade required for premium features`);
        }
      }
      return sub;
    }

    await pool.query(`
      INSERT INTO user_subscriptions (username) VALUES ($1) ON CONFLICT (username) DO NOTHING
    `, [username]);

    return defaultSubscription(username);
  }

  async getTrialStatus(username: string): Promise<{
    isOnTrial: boolean;
    daysRemaining: number;
    trialExpired: boolean;
    trialTier: string;
    hadTrial: boolean;
  }> {
    await this.ensureInit();

    const result = await pool.query(
      'SELECT * FROM user_subscriptions WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return { isOnTrial: false, daysRemaining: 0, trialExpired: false, trialTier: 'none', hadTrial: false };
    }

    const sub = rowToSubscription(result.rows[0]);

    if (sub.trialConverted) {
      return { isOnTrial: false, daysRemaining: 0, trialExpired: false, trialTier: 'none', hadTrial: true };
    }

    if (!sub.trialEndDate) {
      return { isOnTrial: false, daysRemaining: 0, trialExpired: false, trialTier: 'none', hadTrial: false };
    }

    const now = new Date();
    const trialEnd = new Date(sub.trialEndDate);
    const msRemaining = trialEnd.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(msRemaining / (24 * 60 * 60 * 1000)));
    const isOnTrial = sub.subscriptionStatus === 'trialing' && msRemaining > 0;
    const trialExpired = msRemaining <= 0 && !sub.trialConverted;

    return {
      isOnTrial,
      daysRemaining,
      trialExpired,
      trialTier: isOnTrial ? TRIAL_TIER : 'none',
      hadTrial: true,
    };
  }

  async startTrial(username: string): Promise<UserSubscription | null> {
    await this.ensureInit();

    const trialStatus = await this.getTrialStatus(username);

    if (trialStatus.hadTrial) {
      console.log(`[TRIAL] Cannot start trial for ${username} - trial already used`);
      return null;
    }

    const now = new Date();
    const trialEnd = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

    await pool.query(`
      INSERT INTO user_subscriptions (username, subscription_tier, subscription_status, trial_start_date, trial_end_date, is_trial_user, trial_converted)
      VALUES ($1, $2, 'trialing', $3, $4, true, false)
      ON CONFLICT (username) DO UPDATE SET
        subscription_tier = $2,
        subscription_status = 'trialing',
        trial_start_date = $3,
        trial_end_date = $4,
        is_trial_user = true,
        trial_converted = false,
        updated_at = NOW()
    `, [username, TRIAL_TIER, now, trialEnd]);

    console.log(`[TRIAL] Started 7-day ${TRIAL_TIER} trial for ${username}, expires ${trialEnd.toISOString()}`);
    return await this.getUserSubscription(username);
  }

  async convertTrialToSubscription(username: string, tier: 'pro' | 'elite' | 'whale'): Promise<void> {
    await this.ensureInit();

    await pool.query(`
      UPDATE user_subscriptions
      SET trial_converted = true, subscription_status = 'active', subscription_tier = $1, is_trial_user = false, updated_at = NOW()
      WHERE username = $2 AND trial_end_date IS NOT NULL
    `, [tier, username]);
    console.log(`[TRIAL] ${username} converted from trial to paid ${tier} subscription`);
  }

  async updateUserSubscription(username: string, updates: Partial<UserSubscription>): Promise<UserSubscription> {
    await this.ensureInit();

    const setClauses: string[] = [];
    const values: any[] = [];
    let idx = 1;

    const columnMap: Record<string, string> = {
      stripeCustomerId: 'stripe_customer_id',
      stripeSubscriptionId: 'stripe_subscription_id',
      subscriptionTier: 'subscription_tier',
      subscriptionStatus: 'subscription_status',
      trialStartDate: 'trial_start_date',
      trialEndDate: 'trial_end_date',
      isTrialUser: 'is_trial_user',
      trialConverted: 'trial_converted',
      grantedFreeAccess: 'granted_free_access',
      grantedBy: 'granted_by',
      grantedAt: 'granted_at',
    };

    for (const [key, column] of Object.entries(columnMap)) {
      if (key in updates) {
        setClauses.push(`${column} = $${idx}`);
        values.push((updates as any)[key]);
        idx++;
      }
    }

    if (setClauses.length === 0) {
      return await this.getUserSubscription(username);
    }

    setClauses.push('updated_at = NOW()');
    values.push(username);

    await pool.query(`
      UPDATE user_subscriptions SET ${setClauses.join(', ')} WHERE username = $${idx}
    `, values);

    return await this.getUserSubscription(username);
  }

  async handleWebhookEvent(event: any) {
    await this.ensureInit();

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        const tier = this.getPriceIdTier(subscription.items.data[0]?.price?.id);
        const status = subscription.status === 'active' ? 'active' :
                       subscription.status === 'canceled' ? 'cancelled' :
                       subscription.status === 'past_due' ? 'past_due' : 'none';

        await pool.query(`
          UPDATE user_subscriptions
          SET stripe_subscription_id = $1, subscription_tier = $2, subscription_status = $3, updated_at = NOW()
          WHERE stripe_customer_id = $4
        `, [subscription.id, tier, status, customerId]);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        await pool.query(`
          UPDATE user_subscriptions
          SET stripe_subscription_id = NULL, subscription_tier = 'free', subscription_status = 'cancelled', updated_at = NOW()
          WHERE stripe_customer_id = $1
        `, [customerId]);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customerId = invoice.customer;

        await pool.query(`
          UPDATE user_subscriptions
          SET subscription_status = 'past_due', updated_at = NOW()
          WHERE stripe_customer_id = $1
        `, [customerId]);
        console.log(`[STRIPE] Payment failed for customer ${customerId}, set status to past_due`);
        break;
      }
    }
  }

  private getPriceIdTier(priceId: string | undefined): 'free' | 'pro' | 'elite' | 'whale' {
    return PRICE_TO_TIER[priceId || ''] || 'free';
  }

  async grantFreeAccess(username: string, tier: 'pro' | 'elite' | 'whale', grantedBy: string): Promise<UserSubscription> {
    await this.ensureInit();

    await pool.query(`
      INSERT INTO user_subscriptions (username, subscription_tier, subscription_status, granted_free_access, granted_by, granted_at)
      VALUES ($1, $2, 'active', true, $3, NOW())
      ON CONFLICT (username) DO UPDATE SET
        subscription_tier = $2,
        subscription_status = 'active',
        granted_free_access = true,
        granted_by = $3,
        granted_at = NOW(),
        updated_at = NOW()
    `, [username, tier, grantedBy]);

    console.log(`[ADMIN] Free ${tier} access granted to ${username} by ${grantedBy}`);
    return await this.getUserSubscription(username);
  }

  async revokeFreeAccess(username: string, revokedBy: string): Promise<UserSubscription> {
    await this.ensureInit();

    await pool.query(`
      UPDATE user_subscriptions
      SET subscription_tier = 'free', subscription_status = 'none', granted_free_access = false, granted_by = NULL, granted_at = NULL, updated_at = NOW()
      WHERE username = $1
    `, [username]);

    console.log(`[ADMIN] Free access revoked from ${username} by ${revokedBy}`);
    return await this.getUserSubscription(username);
  }

  async getAllSubscriptions(): Promise<UserSubscription[]> {
    await this.ensureInit();

    const result = await pool.query('SELECT * FROM user_subscriptions');
    return result.rows.map(rowToSubscription);
  }

  async getUsersByTier(tier: 'free' | 'pro' | 'elite' | 'whale'): Promise<string[]> {
    await this.ensureInit();

    const result = await pool.query(
      'SELECT username FROM user_subscriptions WHERE subscription_tier = $1',
      [tier]
    );
    return result.rows.map((r: any) => r.username);
  }
}

export const stripeService = new StripeService();
