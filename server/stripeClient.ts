// Stripe Client - stripe integration
// Modified to gracefully handle missing credentials for beta deployment
import Stripe from 'stripe';

let connectionSettings: any;
let stripeAvailable: boolean | null = null;

async function getCredentials(): Promise<{ publishableKey: string; secretKey: string } | null> {
  // Prefer env var keys (set directly via Replit secrets)
  const envPublishable = process.env.STRIPE_PUBLISHABLE_KEY;
  const envSecret = process.env.STRIPE_SECRET_KEY;
  if (envPublishable && envSecret) {
    stripeAvailable = true;
    return { publishableKey: envPublishable, secretKey: envSecret };
  }

  // Fall back to Replit connector system
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? 'depl ' + process.env.WEB_REPL_RENEWAL
      : null;

  if (!xReplitToken || !hostname) {
    console.log('[STRIPE] Stripe connector not available and no env keys found - running in demo mode');
    stripeAvailable = false;
    return null;
  }

  try {
    const connectorName = 'stripe';
    const isProduction = process.env.REPLIT_DEPLOYMENT === '1';
    const targetEnvironment = isProduction ? 'production' : 'development';

    const url = new URL(`https://${hostname}/api/v2/connection`);
    url.searchParams.set('include_secrets', 'true');
    url.searchParams.set('connector_names', connectorName);
    url.searchParams.set('environment', targetEnvironment);

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    });

    const data = await response.json();
    
    connectionSettings = data.items?.[0];

    if (!connectionSettings || (!connectionSettings.settings?.publishable || !connectionSettings.settings?.secret)) {
      console.log(`[STRIPE] Stripe ${targetEnvironment} connection not configured - running in demo mode`);
      stripeAvailable = false;
      return null;
    }

    stripeAvailable = true;
    return {
      publishableKey: connectionSettings.settings.publishable,
      secretKey: connectionSettings.settings.secret,
    };
  } catch (error) {
    console.log('[STRIPE] Failed to get Stripe credentials - running in demo mode:', error);
    stripeAvailable = false;
    return null;
  }
}

export async function isStripeAvailable(): Promise<boolean> {
  if (stripeAvailable === null) {
    await getCredentials();
  }
  return stripeAvailable === true;
}

export async function getUncachableStripeClient(): Promise<Stripe | null> {
  const credentials = await getCredentials();
  if (!credentials) {
    return null;
  }

  return new Stripe(credentials.secretKey, {
    apiVersion: '2025-11-17.clover' as any,
  });
}

export async function getStripePublishableKey(): Promise<string | null> {
  const credentials = await getCredentials();
  return credentials?.publishableKey || null;
}

export async function getStripeSecretKey(): Promise<string | null> {
  const credentials = await getCredentials();
  return credentials?.secretKey || null;
}

let stripeSync: any = null;

export async function getStripeSync(): Promise<any | null> {
  const secretKey = await getStripeSecretKey();
  if (!secretKey) {
    return null;
  }

  if (!stripeSync) {
    const { StripeSync } = await import('stripe-replit-sync');

    stripeSync = new StripeSync({
      poolConfig: {
        connectionString: process.env.DATABASE_URL!,
        max: 2,
      },
      stripeSecretKey: secretKey,
    });
  }
  return stripeSync;
}
