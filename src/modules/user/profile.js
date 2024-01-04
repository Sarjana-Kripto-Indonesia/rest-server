const express = require('express')
const app = express.Router()
const Users = require('../../models/users')
const Invoices = require('../../models/invoices')
const Balances = require('../../models/balance')
const Exchanges = require('../../models/exchanges')
const Setups = require('../../models/setups')
const AdvancedSetups = require('../../models/advanced-setups')
const { getUserByUid } = require('../../helpers/user')
const { admin } = require('../../services/firebase')
const { generateTelegramToken } = require('../../helpers/string-generator')

/**
 * GET /user/profile
 *
 * Get user's profile
 */
app.get('/', async (req, res) => {
  Users.findOne({ uid: res.locals.uid })
    .exec().then(async (user) => {
      if (user) {
        const userData = user.toJSON()
        // delete userData.otp

        const referralDiscountInvoice = await Invoices.where({
          user_id: user._id,
          active: false,
          'discount.source': 'referral'
        }).countDocuments()


        return res.status(200).json({
          status: true,
          result: { ...userData, referral_usage: referralDiscountInvoice }
        })
      } else {
        return res.status(200).json({
          status: true,
          result: {}
        })
      }
    }).catch((err) => {
      console.log(err)

      return res.status(400).json({
        error: false,
        message: 'Error'
      })
    })
})

/**
 * PUT /user/profile
 *
 * Update user's profile
 */
app.put('/', async (req, res) => {
  try {
    const userData = await getUserByUid(res.locals.uid)
    const userProfile = {}

    if (req.body.display_name && req.body.display_name != '') {
      userProfile.displayName = req.body.display_name
      userData.display_name = req.body.display_name
    }

    if (req.body.photo_url && req.body.photo_url != '') {
      userProfile.photoURL = req.body.photo_url
      userData.photo_url = req.body.photo_url
    }

    // 2fa method
    const otpMethods = ['none', 'email', 'telegram']

    if (req.body.otp_method && otpMethods.includes(req.body.otp_method)) {
      userData.otp.method = req.body.otp_method
    }

    if (req.body.wallet && req.body.wallet != '') {
      userData.wallet = req.body.wallet
    }

    await userData.save()

    // firebase user update
    if (Object.keys(userProfile).length > 0) {
      admin.auth().updateUser(userData.uid, userProfile).then((userRecord) => {
        console.log('Successfully updated user', userRecord.toJSON());
      }).catch((error) => {
        console.log('Error updating user:', error);
      })
    }

    res.status(200).json({
      error: false,
      result: userData
    })
  } catch (err) {
    console.log(err)
    res.status(400).json({
      error: false,
      message: 'Error'
    })
  }
})

/**
 * POST /user/profile/connect-telegram
 *
 * Request session token to initiate connection with telegram bot
 * Using firestore to save data
 */
app.post('/connect-telegram', async (req, res) => {
  try {
    const user = await getUserByUid(res.locals.uid)

    if (user) {
      const telegramToken = await generateTelegramToken()
      const createdAt = new Date()

      await admin.firestore().collection('telegrams').doc(res.locals.uid).set({
        user_id: user.id,
        session: {
          token: telegramToken,
          created_at: createdAt,
          updated_at: createdAt
        }
      }, { merge: true })

      res.status(200).json({
        token: telegramToken,
        created_at: createdAt
      })
    } else {
      res.status(400).json({
        error: true,
        message: 'User not found'
      })
    }
  } catch (err) {
    console.log(err)
    res.status(400).send('Something went wrong')
  }
})

/**
 * User completion step
 */
app.get('/completion', async (req, res) => {
  try {
    const completions = []
    const user = await getUserByUid(res.locals.uid)
    if (user) {
      let score = 0

      // registered user
      // completions.push({
      //   title: 'Welcome',
      //   description: 'Welcome to BitZenius',
      //   completed: true,
      //   path: '/'
      // })

      // email verification
      if (user.email_verified) {
        score += 1
        completions.push({
          title: 'Email Verification',
          description: 'Completed',
          completed: true,
          path: '/'
        })
      } else {
        completions.push({
          title: 'Email Verification',
          description: 'Verify your email',
          completed: false,
          path: '/verification'
        })
      }

      // trial
      const trialInvoice = await Invoices.where({
        user_id: user.id,
        active: false,
        'discount.source': 'trial'
      }).countDocuments()

      if (trialInvoice == 0) {
        completions.push({
          completed: false,
          title: 'Start Your Free Trial',
          description: 'Get free trial for 7 days',
          path: '/subscription'
        })
      } else {
        score += 1
        completions.push({
          completed: true,
          title: 'Start Your Free Trial',
          description: 'Completed',
          path: '/subscription'
        })
      }

      // connect exchange
      const ExchangesCount = await Exchanges.where({
        user_id: user.uid,
        exchange_name: { $ne: "Demo" }

      }).countDocuments();
      if (ExchangesCount <= 0) {
        completions.push({
          completed: false,
          title: 'Connect Your exchange',
          description: 'Connect to your favorite crypto exchange',
          path: '/exchanges'
        })
      } else {
        score += 1
        completions.push({
          completed: true,
          title: 'Connect Your Exchange',
          description: 'Completed',
          path: '/exchanges'
        })
      }

      // start bot
      let SetupsCount = await Setups.where({
        user_id: user.uid,
        exchange: { $ne: "Demo" }
      }).countDocuments();
      let AdvancedSetupsCount = await AdvancedSetups.where({
        user_id: user.uid,
        exchange: { $ne: "Demo" }
      }).countDocuments();

      let totalSetups = SetupsCount + AdvancedSetupsCount;

      if (totalSetups <= 0) {
        completions.push({
          completed: false,
          title: 'Start your first bot',
          description: 'Create your first bot and start earning',
          path: '/bots'
        })
      } else {
        score += 1
        completions.push({
          completed: true,
          title: 'Start your first bot',
          description: 'Completed',
          path: '/bots'
        })
      }

      // // top-up
      // const depositBalance = await Balances.where({
      //   uid: user.id,
      //   type: 'deposit'
      // }).countDocuments();
      // console.log('depositBalance', depositBalance);
      // if (depositBalance <= 0) {
      //   completions.push({
      //     completed: false,
      //     title: 'Balance Top Up',
      //     description: 'Top-up to your BitZenius account',
      //     path: '/wallet'
      //   })
      // } else {
      //   score += 1
      //   completions.push({
      //     completed: true,
      //     title: 'Balance Top Up',
      //     description: 'Completed',
      //     path: '/wallet'
      //   })
      // }

      // first purchased item
      // const paidInvoice = await Invoices.where({
      //   user_id: user.id,
      //   active: false
      // }).countDocuments()

      // paid subscription
      // if (paidInvoice >= 2) {
      //   score += 1
      //   completions.push({
      //     completed: true,
      //     title: 'Paid Subscription',
      //     description: 'Completed',
      //     path: '/subscription'
      //   })
      // } else {
      //   completions.push({
      //     completed: false,
      //     title: 'Paid Subscription',
      //     description: 'Subscribe to our paid subscription',
      //     path: '/subscription'
      //   })
      // }

      res.status(200).json({
        step: score,
        step_total: completions.length,
        data: completions
      })
    } else {
      res.status(400).json({
        error: true,
        message: 'User not found'
      })
    }
  } catch (err) {
    console.log(err)
    res.status(400).send('Something went wrong')
  }
})

module.exports = app