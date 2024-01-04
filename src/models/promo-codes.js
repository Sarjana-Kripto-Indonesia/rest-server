/**
 *************************************************************
 * SCHEMA MODELS
 *************************************************************
 */

const database = require('../config/database')

const PromoCodes = database.model('promo-codes', new database.Schema({
  code: String,          // Promo code with 6 chars alphanum
  description: String,   // Promo description
  discount: {
    type: {
      type: String,      // Type of discount. Accepts 'percentage' or 'fixed'
      default: null
    },
    amount: {            // Amount of discount
      type: Number,
      default: 0
    }
  },
  max_uses: {
    user: {
      type: Number,      // Max uses per user. O for unlimited
      default: 0
    },
    total: {             // Max uses to all users. 0 for unlimited
      type: Number,
      default: 0
    }
  },
  plan_ids: Array,       // Valid only for plan ids. Empty array will be valid for all plans
  valid_date: Date,      // Valid until to date
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  toJSON: {
    transform: (doc, ret) => {
      delete ret.__v
    }
  }
}))

const PromoUses = database.model('promo-uses', new database.Schema({
  user_id: String,
  plan_id: Number,
  promo_code_id: String,
  promo_code: String,
  amount: Number
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  toJSON: {
    transform: (doc, ret) => {
      delete ret.__v
    }
  }
}))

/**
 *************************************************************
 * RE-USABLE FUNCTIONS
 *************************************************************
 */

// const pricing = require('../config/pricing')
const utilPricing = require("../utils/pricing");
const moment = require('moment')

/**
 * Validate promo code
 * 
 * @param planId  Pricing plan id
 * @param code    Promo code
 * @param userId  User id
 * @returns 
 */
const validatePromoCode = async (planId, code, userId) => {
  // validate pricing plan
  let pricing = await utilPricing.getPricing();
  const plan = pricing.find(obj => obj.id == planId)

  if (!plan) {
    return {
      result: false,
      message: 'This promo code is not applicable to this plan'
    }
  }

  // validate promo code
  const promoCode = await PromoCodes.findOne({
    code: code
  }).exec()

  if (!promoCode) {
    return {
      result: false,
      message: 'Invalid promo code'
    }
  }

  // validate valid date
  if (moment().isAfter(moment(promoCode.valid_date))) {
    return {
      result: false,
      message: 'This promo code is no longer valid'
    }
  }

  // non unlimited uses
  if (promoCode.max_uses.user > 0) {
    // count used by this user
    const usedByThisUser = await PromoUses.where({
      promo_code: promoCode.code,
      user_id: userId
    }).countDocuments()

    if (usedByThisUser >= promoCode.max_uses.user) {
      return {
        result: false,
        message: 'This promo code is no longer valid'
      }
    }
  }

  if (promoCode.max_uses.total > 0) {
    // count all applied promo
    const usedByAllUsers = await PromoUses.where({
      promo_code: promoCode.code
    }).countDocuments()

    if (usedByAllUsers >= promoCode.max_uses.total) {
      return {
        result: false,
        message: 'This promo code has reached maximum limit of usage'
      }
    }
  }

  if (promoCode.plan_ids.length > 0) {
    // count all applied promo code
    if (!promoCode.plan_ids.includes(plan.id)) {
      return {
        result: false,
        message: 'This promo code is not applicable to this plan'
      }
    }
  }

  // everthing is fine
  return {
    result: promoCode,
    message: 'OK'
  }
}

module.exports = {
  PromoCodes,
  PromoUses,
  validatePromoCode
}
