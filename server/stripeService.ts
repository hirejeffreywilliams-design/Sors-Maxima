// Stripe Service - stripe integration
import { getUncachableStripeClient, getStripePublishableKey } from './stripeClient';

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

  async createCheckoutSession(customerId: string, priceId: string, successUrl: string, cancelUrl: string) {
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
    // Map price IDs to tiers (these will be set after creating products)
    const priceToTier: Record<string, 'pro' | 'elite' | 'whale'> = {
      // Will be populated with actual price IDs after running seed script
    };
    return priceToTier[priceId || ''] || 'free';
  }
}

export const stripeService = new StripeService();
