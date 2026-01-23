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
  subscriptionStatus: 'active' | 'cancelled' | 'past_due' | 'none';
}

const userSubscriptions = new Map<string, UserSubscription>();

export class StripeService {
  async createCustomer(email: string, username: string) {
    const stripe = await getUncachableStripeClient();
    const customer = await stripe.customers.create({
      email,
      metadata: { username },
    });
    
    // Update local storage
    const existing = userSubscriptions.get(username) || {
      username,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      subscriptionTier: 'free' as const,
      subscriptionStatus: 'none' as const,
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
    return userSubscriptions.get(username) || {
      username,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      subscriptionTier: 'free',
      subscriptionStatus: 'none',
    };
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
