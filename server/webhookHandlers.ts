// Webhook Handlers - stripe integration
import { getUncachableStripeClient, getStripeSecretKey } from './stripeClient';
import { stripeService } from './stripeService';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const stripe = await getUncachableStripeClient();
    
    // Get webhook secret from environment or Replit connectors
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    let event;
    
    if (webhookSecret) {
      // Verify signature if webhook secret is configured
      try {
        event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      } catch (err) {
        throw new Error(`Webhook signature verification failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    } else {
      // In development without webhook secret, parse the event directly
      // WARNING: This is insecure and should only be used in development
      console.warn('STRIPE WEBHOOK WARNING: No webhook secret configured. Skipping signature verification.');
      event = JSON.parse(payload.toString());
    }

    // Process the event through our service
    await stripeService.handleWebhookEvent(event);
  }
}
