// Stripe Service - stripe integration
// NOTE: This uses in-memory storage which resets on server restart.
// For production, implement persistent storage via IStorage interface.
import { getUncachableStripeClient, getStripePublishableKey } from './stripeClient';

// Allowed price IDs - MUST be updated after running seed-products.ts
// These placeholder IDs will be replaced with actual Stripe price IDs
const ALLOWED_PRICE_IDS = new Set([
  // Pro tier
  'price_pro_monthly',
  'price_pro_yearly',
  // Elite tier
  'price_elite_monthly',
  'price_elite_yearly',
  // Whale tier
  'price_whale_monthly',
  'price_whale_yearly',
]);

// Map of price IDs to subscription tiers
// Must be updated with actual Stripe price IDs after running seed-products.ts
const PRICE_TO_TIER: Record<string, 'pro' | 'elite' | 'whale'> = {
  'price_pro_monthly': 'pro',
  'price_pro_yearly': 'pro',
  'price_elite_monthly': 'elite',
  'price_elite_yearly': 'elite',
  'price_whale_monthly': 'whale',
  'price_whale_yearly': 'whale',
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
}

export const stripeService = new StripeService();
