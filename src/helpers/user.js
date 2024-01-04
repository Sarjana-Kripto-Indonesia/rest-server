const Users = require('../models/users')
const Balance = require('../models/balance')
// const pricing = require('../config/pricing')
const { admin } = require('../services/firebase')
const { sendEmail } = require('../services/queue')
const moment = require('moment')
const { generateReferralCode } = require('../helpers/string-generator')
const utilPricing = require("../utils/pricing");

const getUserById = async (id) => {
  return await Users.findById(id).exec()
}

const getUserByUid = async (uid) => {
  const user = await Users.findOne({
    uid: uid
  }).exec()

  return user
}

const getUserByWalletVa = async (wallet) => {
  const user = await Users.findOne({
    wallet_va: wallet.toString(),
    email_verified: true
  }).exec()

  return user
}

const getUserBalanceById = async (id, isActive = false) => {
  const pipeline = []

  if (isActive) {
    // only active balance
    pipeline.push({
      $match: {
        user_id: id,
        status: 1
      }
    })
  } else {
    // include active and pending balance
    pipeline.push({
      $match: {
        $and: [
          { user_id: id },
          {
            status: {
              $in: [0, 1]
            }
          }
        ]
      }
    })
  }

  pipeline.push({
    $group:
    {
      _id: '$user_id',
      totalAmount: { $sum: { $subtract: ["$credit", "$debt"] } },
      count: { $sum: 1 }
    }
  })

  const userBalance = await Balance.aggregate(pipeline).exec()
  return userBalance[0] ? userBalance[0].totalAmount : 0
}

const getUserBalanceByUid = async (uid, isActive = false) => {
  const pipeline = []

  if (isActive) {
    // only active balance
    pipeline.push({
      $match: {
        uid: uid,
        status: 1
      }
    })
  } else {
    // include active and pending balance
    pipeline.push({
      $match: {
        $and: [
          { uid: uid },
          {
            status: {
              $in: [0, 1]
            }
          }
        ]
      }
    })
  }

  pipeline.push({
    $group:
    {
      _id: '$uid',
      totalAmount: { $sum: { $subtract: ["$credit", "$debt"] } },
      count: { $sum: 1 }
    }
  })

  const userBalance = await Balance.aggregate(pipeline).exec()
  return userBalance[0] ? userBalance[0].totalAmount : 0
}

/**
 * Set user subscription
 *
 * @param userId User ID
 * @param planId Plan ID
 * @param trial Is trial or not
 */
const setUserSubscription = async (userId, planId, trial) => {
  const user = await getUserById(userId)

  if (user) {
    let pricing = await utilPricing.getPricing();
    const plan = pricing.find(obj => obj.id == planId)
    const startDate = moment()
    let endDate = moment().add(plan.cicle, 'M')

    // add trial for 7 days
    if (trial) {
      endDate = moment().add(7, 'd')
    }

    user.subscription = {
      id: plan.id,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      trial: trial,
      max_smart_trade_bot: plan.config.max_smart_trade_bot,
      max_exchange: plan.config.max_exchange,
      max_dca_bot: plan.config.max_dca_bot,
      max_grid_bot: plan.config.max_grid_bot,
      profit_share: plan.config.profit_share,
      automated_bot: plan.config.automated_bot,
      referral_discount: 10,
      referral_rewards: plan.config.referral,
      plan_name: plan.name,
      tier: plan.tier
    }

    user.referral = {
      ...user.referral,
      code: user.referral.code || generateReferralCode()
    }

    console.log('Firestore:', 'User subscription data: ', user.subscription)

    await user.save()

    // set to the firestore
    admin.firestore().collection('subscriptions').doc(user.uid).set(Object.assign({}, user.subscription), { merge: true }).then(() => {
      console.log('Firestore:', 'User subscription added')
    }).catch((err) => {
      console.log('Firestore:', err)
    })

    // set firebase custom claim
    admin.auth().getUser(user.uid).then(async (userRecord) => {
      const claims = {
        ...userRecord.customClaims,
        trial: trial,
        subscription: true
      }

      await admin.auth().setCustomUserClaims(user.uid, claims)
    })

    // send email notification
    sendEmail({
      to: user.email,
      subject: trial ? 'Free Trial Active' : 'Subscription Active',
      template: trial ? 'account-subscription-trial-active' : 'account-subscription-active',
      data: {
        user: user,
        subscription: {
          name: plan.name,
          start: startDate.format('DD MMM YYYY'),
          end: endDate.format('DD MMM YYYY'),
          referral: plan.config.referral > 0
        }
      }
    })
  }

  return user
}

module.exports = {
  getUserById,
  getUserByUid,
  getUserByWalletVa,
  getUserBalanceById,
  getUserBalanceByUid,
  setUserSubscription
}