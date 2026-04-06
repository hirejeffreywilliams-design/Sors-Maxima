/**
 * Omnivex Ecosystem — Stripe Configuration
 * Generated: April 6, 2026
 * 
 * This file contains all Stripe product and price IDs for the Omnivex platform.
 * Import this config in your payment integration modules.
 */

export const STRIPE_CONFIG = {
  // Use environment variable for the API key
  publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
  secretKey: process.env.STRIPE_SECRET_KEY || '',
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',

  products: {
    '4everacy': {
      productId: process.env.STRIPE_4EVERACY_PRODUCT_ID || 'prod_UHj29pljzUS2Xt',
      tiers: {
        free: { priceId: null, amount: 0 },
        pro: { priceId: process.env.STRIPE_4EVERACY_PRO_PRICE || '', amount: 999 },
        premium: { priceId: process.env.STRIPE_4EVERACY_PREMIUM_PRICE || '', amount: 1999 },
        enterprise: { priceId: process.env.STRIPE_4EVERACY_ENTERPRISE_PRICE || '', amount: 4999 },
      },
    },
    'sors-maxima': {
      productId: process.env.STRIPE_SORS_PRODUCT_ID || 'prod_UHj2UXUwJUNZZL',
      tiers: {
        starter: { priceId: process.env.STRIPE_SORS_STARTER_PRICE || '', amount: 1499 },
        professional: { priceId: process.env.STRIPE_SORS_PRO_PRICE || '', amount: 2999 },
        enterprise: { priceId: process.env.STRIPE_SORS_ENTERPRISE_PRICE || '', amount: 7999 },
      },
    },
    'novashield': {
      productId: process.env.STRIPE_NOVASHIELD_PRODUCT_ID || 'prod_UHj2maYx8Ip3Cp',
      tiers: {
        basic: { priceId: process.env.STRIPE_NOVASHIELD_BASIC_PRICE || '', amount: 999 },
        professional: { priceId: process.env.STRIPE_NOVASHIELD_PRO_PRICE || '', amount: 2499 },
        enterprise: { priceId: process.env.STRIPE_NOVASHIELD_ENTERPRISE_PRICE || '', amount: 5999 },
      },
    },
    'novarivals': {
      productId: process.env.STRIPE_NOVARIVALS_PRODUCT_ID || 'prod_UHj2MAwyxzlWZZ',
      tiers: {
        free: { priceId: null, amount: 0 },
        competitor: { priceId: process.env.STRIPE_NOVARIVALS_COMP_PRICE || '', amount: 499 },
        champion: { priceId: process.env.STRIPE_NOVARIVALS_CHAMP_PRICE || '', amount: 1499 },
      },
    },
    'tradenova': {
      productId: process.env.STRIPE_TRADENOVA_PRODUCT_ID || 'prod_UHj2Hcp7fnlsWd',
      tiers: {
        starter: { priceId: process.env.STRIPE_TRADENOVA_STARTER_PRICE || '', amount: 1999 },
        professional: { priceId: process.env.STRIPE_TRADENOVA_PRO_PRICE || '', amount: 4999 },
        elite: { priceId: process.env.STRIPE_TRADENOVA_ELITE_PRICE || '', amount: 9999 },
      },
    },
  },
} as const;

export type ProductKey = keyof typeof STRIPE_CONFIG.products;
export type TierKey<P extends ProductKey> = keyof typeof STRIPE_CONFIG.products[P]['tiers'];
