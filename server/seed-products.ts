// Seed Stripe Products - Run this manually to create subscription products
// Usage: npx tsx server/seed-products.ts

import { getUncachableStripeClient } from './stripeClient';

async function createProducts() {
  const stripe = await getUncachableStripeClient();
  if (!stripe) {
    console.error('Stripe client not available. Set STRIPE_SECRET_KEY to continue.');
    return;
  }
  
  console.log('Creating Sors Maxima subscription products...\n');

  // Pro/Sharp Plan - $49/month
  const proProduct = await stripe.products.create({
    name: 'Sors Maxima Sharp',
    description: 'Full AI analysis, unlimited picks, all 46 analysis factors',
    metadata: {
      tier: 'pro',
      features: 'ai_analysis,unlimited_picks,all_sports,basic_alerts',
    },
  });
  
  const proMonthly = await stripe.prices.create({
    product: proProduct.id,
    unit_amount: 4900, // $49.00
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: { tier: 'pro', billing: 'monthly' },
  });

  const proYearly = await stripe.prices.create({
    product: proProduct.id,
    unit_amount: 46800, // $468.00/yr (20% discount)
    currency: 'usd',
    recurring: { interval: 'year' },
    metadata: { tier: 'pro', billing: 'yearly' },
  });

  console.log('Sharp Plan created:');
  console.log(`  Product ID: ${proProduct.id}`);
  console.log(`  Monthly Price ID: ${proMonthly.id} ($49/mo)`);
  console.log(`  Yearly Price ID: ${proYearly.id} ($468/yr)\n`);

  // Elite Plan - $99/month
  const eliteProduct = await stripe.products.create({
    name: 'Sors Maxima Elite',
    description: 'Everything in Pro + Live alerts, AI assistant, prop projections, CLV tracking',
    metadata: {
      tier: 'elite',
      features: 'all_pro,live_alerts,ai_assistant,prop_projections,clv_tracking,steam_alerts',
    },
  });
  
  const eliteMonthly = await stripe.prices.create({
    product: eliteProduct.id,
    unit_amount: 9900, // $99.00
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: { tier: 'elite', billing: 'monthly' },
  });

  const eliteYearly = await stripe.prices.create({
    product: eliteProduct.id,
    unit_amount: 94800, // $948.00/yr (20% discount)
    currency: 'usd',
    recurring: { interval: 'year' },
    metadata: { tier: 'elite', billing: 'yearly' },
  });

  console.log('Elite Plan created:');
  console.log(`  Product ID: ${eliteProduct.id}`);
  console.log(`  Monthly Price ID: ${eliteMonthly.id} ($99/mo)`);
  console.log(`  Yearly Price ID: ${eliteYearly.id} ($990/yr)\n`);

  // Whale/Max Plan - $249/month
  const whaleProduct = await stripe.products.create({
    name: 'Sors Maxima Max',
    description: 'VIP exclusive picks, 1-on-1 coaching, priority support, early access to new features',
    metadata: {
      tier: 'whale',
      features: 'all_elite,vip_picks,one_on_one_coaching,priority_support,early_access,discord_vip',
    },
  });
  
  const whaleMonthly = await stripe.prices.create({
    product: whaleProduct.id,
    unit_amount: 24900, // $249.00
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: { tier: 'whale', billing: 'monthly' },
  });

  const whaleYearly = await stripe.prices.create({
    product: whaleProduct.id,
    unit_amount: 238800, // $2,388.00/yr (20% discount)
    currency: 'usd',
    recurring: { interval: 'year' },
    metadata: { tier: 'whale', billing: 'yearly' },
  });

  console.log('Max Plan created:');
  console.log(`  Product ID: ${whaleProduct.id}`);
  console.log(`  Monthly Price ID: ${whaleMonthly.id} ($249/mo)`);
  console.log(`  Yearly Price ID: ${whaleYearly.id} ($2,388/yr)\n`);

  console.log('='.repeat(60));
  console.log('All products created successfully!');
  console.log('='.repeat(60));
  console.log('\nPRICE IDs FOR CHECKOUT (copy these to your code):');
  console.log(`PRO_MONTHLY: "${proMonthly.id}"`);
  console.log(`PRO_YEARLY: "${proYearly.id}"`);
  console.log(`ELITE_MONTHLY: "${eliteMonthly.id}"`);
  console.log(`ELITE_YEARLY: "${eliteYearly.id}"`);
  console.log(`WHALE_MONTHLY: "${whaleMonthly.id}"`);
  console.log(`WHALE_YEARLY: "${whaleYearly.id}"`);
}

createProducts().catch(console.error);
