/**
 * Pricing prototype and product variables:
 * 
 * pricing.id: Package ID
 * pricing.name: Package name
 * pricing.price: Price
 * pricing.cicle: Billing cicle
 * pricing.tier: Tier number
 * pricing.recommended: Recommended or not
 * pricing.config.max_smart_trade_bot: Maximum number of hybrid bots
 * pricing.config.max_exchange: Maximum number of auto bot
 * pricing.config.max_dca_bot: Maximum number of DCA bots
 * pricing.config.max_grid_bot: Maximum number of Grid bots
 * pricing.config.profit_share: Profit share (in percent)
 * pricing.config.automated_bot: Fully automated bot
 * pricing.config.referral: Referral right or not
 *
 */
const pricing = [
  {
    id: 1,
    name: 'Alpha',
    price: 199,
    cicle: 12,
    tier: 1,
    recommended: false,
    config: {
      max_smart_trade_bot: 5,
      max_exchange: 5,
      max_dca_bot: 5,
      max_grid_bot: 5,
      profit_share: 0,
      automated_bot: true,
      referral: 10
    }
  },
  {
    id: 2,
    name: 'Beta',
    price: 299,
    cicle: 12,
    tier: 3,
    recommended: true,
    config: {
      max_smart_trade_bot: 5,
      max_exchange: 1,
      max_dca_bot: 5,
      max_grid_bot: 5,
      profit_share: 0,
      automated_bot: true,
      referral: 10
    }
  },
  {
    id: 3,
    name: 'Gamma',
    price: 499,
    cicle: 12,
    tier: 5,
    recommended: false,
    config: {
      max_smart_trade_bot: 99999,
      max_exchange: 99999,
      max_dca_bot: 99999,
      max_grid_bot: 99999,
      profit_share: 0,
      automated_bot: true,
      referral: 10
    }
  },
  {
    id: 4,
    name: 'Alpha',
    price: 19,
    cicle: 1,
    tier: 2,
    recommended: false,
    config: {
      max_smart_trade_bot: 3,
      max_exchange: 1,
      max_dca_bot: 3,
      max_grid_bot: 3,
      profit_share: 0,
      automated_bot: true,
      referral: 10
    }
  },
  {
    id: 5,
    name: 'Beta',
    price: 29,
    cicle: 1,
    tier: 4,
    recommended: false,
    config: {
      max_smart_trade_bot: 5,
      max_exchange: 1,
      max_dca_bot: 5,
      max_grid_bot: 5,
      profit_share: 0,
      automated_bot: true,
      referral: 10
    }
  },
  {
    id: 6,
    name: 'Gamma',
    price: 49,
    cicle: 1,
    tier: 6,
    recommended: false,
    config: {
      max_smart_trade_bot: 10,
      max_exchange: 2,
      max_dca_bot: 10,
      max_grid_bot: 10,
      profit_share: 0,
      automated_bot: true,
      referral: 10
    }
  }
]

module.exports = pricing
