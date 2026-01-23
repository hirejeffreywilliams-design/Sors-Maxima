// Stripe Service - stripe integration
// NOTE: This uses in-memory storage which resets on server restart.
// For production, implement persistent storage via IStorage interface.
import { getUncachableStripeClient, getStripePublishableKey } from './stripeClient';

// Allowed price IDs from Stripe
const ALLOWED_PRICE_IDS = new Set([
  // Pro tier
  'price_1SskcQIp7f8yVoSO8uj04w8T', // monthly
  'price_1SskcQIp7f8yVoSO1VDHyrWy', // yearly
  // Elite tier
  'price_1SskcRIp7f8yVoSOEKOx5hde', // monthly
  'price_1SskcRIp7f8yVoSOOBNZTk3V', // yearly
  // Whale tier
  'price_1SskcRIp7f8yVoSOWQe60fFw', // monthly
  'price_1SskcSIp7f8yVoSOxK0pY4Ki', // yearly
]);

// Map of price IDs to subscription tiers
const PRICE_TO_TIER: Record<string, 'pro' | 'elite' | 'whale'> = {
  'price_1SskcQIp7f8yVoSO8uj04w8T': 'pro',
  'price_1SskcQIp7f8yVoSO1VDHyrWy': 'pro',
  'price_1SskcRIp7f8yVoSOEKOx5hde': 'elite',
  'price_1SskcRIp7f8yVoSOOBNZTk3V': 'elite',
  'price_1SskcRIp7f8yVoSOWQe60fFw': 'whale',
  'price_1SskcSIp7f8yVoSOxK0pY4Ki': 'whale',
};

// In-memory user subscription storage
interface UserSubscription {
  username: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionTier: 'free' | 'pro' | 'elite' | 'whale';
  subscriptionStatus: 'active' | 'cancelled' | 'past_due' | 'none' | 'trialing';
  trialStartDate: string | null;
  trialEndDate: string | null;
  isTrialUser: boolean;
  trialConverted: boolean;
  registeredAt: string;
}

const userSubscriptions = new Map<string, UserSubscription>();

// Trial configuration
const TRIAL_DAYS = 7;
const TRIAL_TIER: 'pro' | 'elite' | 'whale' = 'pro'; // Trial gives Pro access

export class StripeService {
  async createCustomer(email: string, username: string) {
    const stripe = await getUncachableStripeClient();
    const customer = await stripe.customers.create({
      email,
      metadata: { username },
    });
    
    // Start 7-day free trial for new users
    const now = new Date();
    const trialEnd = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
    
    const existing = userSubscriptions.get(username) || {
      username,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      subscriptionTier: TRIAL_TIER as 'free' | 'pro' | 'elite' | 'whale',
      subscriptionStatus: 'trialing' as const,
      trialStartDate: now.toISOString(),
      trialEndDate: trialEnd.toISOString(),
      isTrialUser: true,
      trialConverted: false,
      registeredAt: now.toISOString(),
    };
    existing.stripeCustomerId = customer.id;
    userSubscriptions.set(username, existing);
    
    return customer;
  }

  validatePriceId(priceId: string): boolean {
    return ALLOWED_PRICE_IDS.has(priceId);
  }

  async createCheckoutSession(customerId: string, priceId: string, successUrl: string, cancelUrl: string) {
    if (!this.validatePriceId(priceId)) {
      throw new Error(`Invalid price ID: ${priceId}`);
    }
    
    const stripe = await getUncachableStripeClient();
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
    return await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  }

  async getPublishableKey() {
    return await getStripePublishableKey();
  }

  getUserSubscription(username: string): UserSubscription {
    const sub = userSubscriptions.get(username);
    if (sub) {
      // Check if trial has expired
      if (sub.subscriptionStatus === 'trialing' && sub.trialEndDate && !sub.trialConverted) {
        const trialEnd = new Date(sub.trialEndDate);
        if (new Date() > trialEnd) {
          // Trial expired - downgrade to free and mark trial as used
          sub.subscriptionStatus = 'none';
          sub.subscriptionTier = 'free';
          sub.isTrialUser = false; // No longer on trial
          userSubscriptions.set(username, sub);
          console.log(`[TRIAL] Trial expired for ${username}, downgraded to free tier`);
        }
      }
      return sub;
    }
    
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

  getTrialStatus(username: string): { 
    isOnTrial: boolean; 
    daysRemaining: number; 
    trialExpired: boolean;
    trialTier: string;
    hadTrial: boolean;
  } {
    const sub = userSubscriptions.get(username);
    
    // No subscription record found
    if (!sub) {
      return { isOnTrial: false, daysRemaining: 0, trialExpired: false, trialTier: 'none', hadTrial: false };
    }

    // User has converted from trial to paid
    if (sub.trialConverted) {
      return { isOnTrial: false, daysRemaining: 0, trialExpired: false, trialTier: 'none', hadTrial: true };
    }
    
    // No trial end date - never had a trial
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

  startTrial(username: string): UserSubscription | null {
    const trialStatus = this.getTrialStatus(username);
    
    // Prevent starting trial if user already had one
    if (trialStatus.hadTrial) {
      console.log(`[TRIAL] Cannot start trial for ${username} - trial already used`);
      return null;
    }
    
    const now = new Date();
    const trialEnd = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
    
    const existing = this.getUserSubscription(username);
    const updated: UserSubscription = {
      ...existing,
      subscriptionTier: TRIAL_TIER,
      subscriptionStatus: 'trialing',
      trialStartDate: now.toISOString(),
      trialEndDate: trialEnd.toISOString(),
      isTrialUser: true,
      trialConverted: false,
    };
    
    userSubscriptions.set(username, updated);
    console.log(`[TRIAL] Started 7-day ${TRIAL_TIER} trial for ${username}, expires ${trialEnd.toISOString()}`);
    return updated;
  }

  convertTrialToSubscription(username: string, tier: 'pro' | 'elite' | 'whale'): void {
    const existing = this.getUserSubscription(username);
    if (existing.trialEndDate) {
      existing.trialConverted = true;
      existing.subscriptionStatus = 'active';
      existing.subscriptionTier = tier;
      existing.isTrialUser = false;
      userSubscriptions.set(username, existing);
      console.log(`[TRIAL] ${username} converted from trial to paid ${tier} subscription`);
    }
  }

  updateUserSubscription(username: string, updates: Partial<UserSubscription>) {
    const existing = this.getUserSubscription(username);
    const updated = { ...existing, ...updates };
    userSubscriptions.set(username, updated);
    return updated;
  }

  async handleWebhookEvent(event: any) {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        
        // Find user by customer ID
        const entries = Array.from(userSubscriptions.entries());
        for (const [username, data] of entries) {
          if (data.stripeCustomerId === customerId) {
            const tier = this.getPriceIdTier(subscription.items.data[0]?.price?.id);
            this.updateUserSubscription(username, {
              stripeSubscriptionId: subscription.id,
              subscriptionTier: tier,
              subscriptionStatus: subscription.status === 'active' ? 'active' : 
                                  subscription.status === 'canceled' ? 'cancelled' : 
                                  subscription.status === 'past_due' ? 'past_due' : 'none',
            });
            break;
          }
        }
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        
        const deletedEntries = Array.from(userSubscriptions.entries());
        for (const [username, data] of deletedEntries) {
          if (data.stripeCustomerId === customerId) {
            this.updateUserSubscription(username, {
              stripeSubscriptionId: null,
              subscriptionTier: 'free',
              subscriptionStatus: 'cancelled',
            });
            break;
          }
        }
        break;
      }
    }
  }

  private getPriceIdTier(priceId: string | undefined): 'free' | 'pro' | 'elite' | 'whale' {
    return PRICE_TO_TIER[priceId || ''] || 'free';
  }

  grantFreeAccess(username: string, tier: 'pro' | 'elite' | 'whale', grantedBy: string): UserSubscription {
    const existing = this.getUserSubscription(username);
    const updated = {
      ...existing,
      subscriptionTier: tier,
      subscriptionStatus: 'active' as const,
      grantedFreeAccess: true,
      grantedBy,
      grantedAt: new Date().toISOString(),
    };
    userSubscriptions.set(username, updated as UserSubscription);
    console.log(`[ADMIN] Free ${tier} access granted to ${username} by ${grantedBy}`);
    return updated as UserSubscription;
  }

  revokeFreeAccess(username: string, revokedBy: string): UserSubscription {
    const existing = this.getUserSubscription(username);
    const updated = {
      ...existing,
      subscriptionTier: 'free' as const,
      subscriptionStatus: 'none' as const,
      grantedFreeAccess: false,
      grantedBy: null,
      grantedAt: null,
    };
    userSubscriptions.set(username, updated as UserSubscription);
    console.log(`[ADMIN] Free access revoked from ${username} by ${revokedBy}`);
    return updated as UserSubscription;
  }

  getAllSubscriptions(): Map<string, UserSubscription> {
    return userSubscriptions;
  }

  getUsersByTier(tier: 'free' | 'pro' | 'elite' | 'whale'): string[] {
    const result: string[] = [];
    userSubscriptions.forEach((sub, username) => {
      if (sub.subscriptionTier === tier) {
        result.push(username);
      }
    });
    return result;
  }
}

export const stripeService = new StripeService();
