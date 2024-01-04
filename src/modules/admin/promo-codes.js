const express = require('express')
const app = express.Router()
const { PromoCodes } = require('../../models/promo-codes')
const moment = require('moment')
const { generatePromoCode } = require('../../helpers/string-generator')

/**
 * Generate random promo code for testing purpose
 */
app.post('/test-generate', (req, res) => {
  const promoCode = generatePromoCode()
  const endDate = moment().add(1, 'D')

  PromoCodes.create({
    code: promoCode,
    description: 'Test promo discount 10%',
    discount: {
      type: 'percentage',
      amount: 10
    },
    max_uses: {
      user: 3,
      total: 50
    },
    plan_ids: [2,3,4],
    user_ids: [],
    valid_date: endDate.toISOString()
  }, async (err, data) => {
    if (err) {
      res.status(400).json({
        error: true,
        message: err
      })
    }

    if (data) {
      res.status(200).json({
        status: true,
        result: data
      })
    }
  })
})

module.exports = app