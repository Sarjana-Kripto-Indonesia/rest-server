const express = require('express')
const app = express.Router()
const Invoices = require('../../models/invoices')
const Users = require('../../models/users')
const Balance = require('../../models/balance')
const { PromoCodes, PromoUses, validatePromoCode } = require('../../models/promo-codes')
// const pricing = require('../../config/pricing')
const utilPricing = require("../../utils/pricing");
const moment = require('moment')
const { generateInvoiceId } = require('../../helpers/string-generator')
const { sendEmail } = require('../../services/queue')

const {
  getUserById,
  getUserByUid,
  getUserByWalletVa,
  getUserBalanceByUid,
  setUserSubscription
} = require('../../helpers/user')

const censorWord = (str) => {
  return str[0] + '*'.repeat(str.length - 2) + str.slice(-1)
}

const censorEmail = (email) => {
  var arr = email.split('@')
  return censorWord(arr[0]) + '@' + censorWord(arr[1])
}

const checkActiveInvoce = async (user_id) => {
  const invoice = await Invoices.findOne({
    user_id: user_id,
    active: true
  }).exec()

  return invoice
}

const payInvoice = async (wallet, amount, txHash) => {
  const user = await getUserByWalletVa(wallet)

  if (user) {
    const invoice = await Invoices.findOne({
      $and: [
        { user_id: user.id},
        { active: true },
        { 'totals.total': { $lte: amount }}
      ]
    }).exec()

    if (invoice) {
      // execute user subscription
      await setUserSubscription(user.id, invoice.plan_id, false)

      const referrer = await getUserById(user.referral.user_id)

      if (referrer) {
        // make sure that subscription of the referral user is still active
        if (referrer.subscription.referral_rewards > 0) {
          const referralRewards = (invoice.totals.subtotal * referrer.subscription.referral_rewards) / 100

          Balance.create({
            user_id: referrer.id,
            uid: referrer.uid,
            type: 'referral_reward',
            description: `Referral Rewards from ${user.display_name}`,
            debt: 0,
            credit: referralRewards,
            reference: {
              type: 'user',
              id: user.id
            },
            status: 1
          }, (err, data) => {
            if (err) {
              console.log(err)
            }
    
            if (data) {
              // can send email to the referrer user
              console.log('Balance created with id #', data.id)

              try {
                sendEmail({
                  to: referrer.email,
                  subject: 'Referral Rewards',
                  template: 'account-referral-rewards',
                  data: {
                    user: {
                      display_name: referrer.display_name,
                    },
                    referred: {
                      email: censorEmail(user.email),
                      rewards: referralRewards.toFixed(2)
                    }
                  }
                })
              } catch (error) {
                console.log(error)
              }
            }
          })
        }
      }

      // set invoice to paid
      invoice.active = false
      invoice.payment = {
        paid: true,
        date: moment().toISOString(),
        method: 'crypto'
      }
      
      await invoice.save()

      if (amount > invoice.totals.total) {
        Balance.create({
          user_id: user.id,
          uid: user.uid,
          type: 'deposit',
          description: `Remaining overpaid for ${invoice.invoice_id}`,
          debt: 0,
          credit: amount - invoice.totals.total,
          reference: {
            type: 'crypto',
            id: txHash
          },
          status: 1
        }, async (err, data) => {
          if (err) {
            console.log(err)
            return false
          }
  
          if (data) {
            console.log('Balance created with id #', data.id)

            await data.save()
  
            return true
          }
        })
      }

      return true
    } else {
      // if invoice not found, add to the credit balance
      // substract $1 as transaction fees
      amount -= 1

      Balance.create({
        user_id: user.id,
        uid: user.uid,
        type: 'deposit',
        description: 'Deposit',
        debt: 0,
        credit: amount,
        reference: {
          type: 'crypto',
          id: txHash
        },
        status: 0
      }, async (err, data) => {
        if (err) {
          console.log(err)
          return false
        }

        if (data) {
          console.log('Balance created with id #', data.id)
        
          // transfer all amount (ERC20)
          // await Factory.connect(Signer).disburse(user.uid)
          
          // set transaction status to 'Done'
          data.status = 1
          await data.save()

          return true
        }
      })
      
      return false
    }
  } else {
    console.log('Warning: User not found')
    return false
  }
}

app.get('/invoices', async (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit) : 10
  let page = req.query.page ? parseInt(req.query.page) : 1

  if (page === 0) {
    page = 1
  }

  const user = await getUserByUid(res.locals.uid)

  if (user) {
    const total = await Invoices.where({ user_id: user.id }).countDocuments()

    Invoices.find({ user_id: user.id })
    .limit(limit)
    .skip((page - 1) * limit)
    .sort({ created_at: 'desc' })
    .exec().then((results) => {
      return res.status(200).json({
        status: true,
        result: {
          total: total,
          page: page,
          limit: limit,
          data: results
        }
      })
    }).catch((err) => {
      console.log(err)

      return res.status(400).json({
        error: true,
        message: 'Error'
      })
    })
  } else {
    return res.status(400).json({
      error: true,
      message: 'Unknown user'
    })
  }
})

app.get('/user-trial', async (req, res) => {
  try {
    // Validate the params;
    let uid = req.query.uid ? req.query.uid : false;
    if (!uid) return res.status(400).json({ error: true, message: "Unable to get user UID" });

    let userQ = { uid };
    // Get user data from users collection, to get the _id
    let User = await Users.findOne(userQ).exec();
    if (!User) return res.status(400).json({error:true, message:"Couldn't find user data"})
    
    // After _id found, search related invoice collection that payment.method has free value
    let invoiceQ = { user_id: User._id.toString(), 'payment.method': 'free' };
    let Invoice = await Invoices.findOne(invoiceQ).exec();
    if (Invoice) {
      res.status(200).send(true);      
    } else {
      res.status(200).send(false);
    }
  } catch (error) {
    console.log(error);
    res.status(400).send({ error: true, data: error });
  }
})

app.get('/check-subscription', async (req, res) => {
  console.log('/subscription/check-subscription');
  try {
    // Validate the params;
    let uid = res.locals.uid ? res.locals.uid : false;
    if (!uid) return res.status(400).json({ error: true, message: "Unable to get user UID" });
    let userQ = { uid };

    let User = await Users.findOne(userQ).exec();
    if (!User) return res.status(400).json({ error: true, message: "Couldn't find user data" });

    let subscription = { ...User.subscription }
    let pricing = await utilPricing.getPricing();
    const plan = pricing.find(obj => obj.id == subscription.id);
    subscription = {...subscription, plan:plan}
    res.status(200).send({success:true, data:subscription});
  } catch (error) {
    console.log(error);
    res.status(400).send({ error: true, message: error });
  }
})

app.get('/invoices/:id', async (req, res) => {
  Invoices.findById(req.params.id).exec().then((result) => {
    return res.status(200).json({
      status: true,
      result: result
    })
  }).catch((err) => {
    console.log(err)

    return res.status(400).json({
      error: true,
      message: 'Error'
    })
  })
})

/**
 * Pay invoice
 * 
 * @param id Invoice ID
 * @param payment_method Payment method
 */
app.post('/invoices/:id/pay', async (req, res) => {
  Invoices.findById(req.params.id).exec().then(async(invoice) => {
    const user = await getUserByUid(res.locals.uid)

    if (user) {
      // check paid status, deny if invoice has been paid
      if (invoice.payment.paid) {
        return res.status(400).json({
          error: true,
          message: 'Invoice already paid'
        })
      }

      let discount = 0

      // validate promo code here
      if (req.body.promo_code != '') {
        const promoCode = await validatePromoCode(invoice.plan_id, req.body.promo_code, user.id)
        
        if (promoCode.result) {
          if (promoCode.result.discount.type == 'percentage') {
            discount = (invoice.totals.subtotal * promoCode.result.discount.amount) / 100
          } else {
            discount = promoCode.result.discount.amount
          }

          invoice.discount = {
            source: 'promo-code',
            id: promoCode.result.id
          }

          invoice.totals.discount = discount
          invoice.totals.total = invoice.totals.subtotal - discount
        } else {
          console.log(promoCode)
        }
      }

      // can't double promo with referral discount
      if (discount == 0) {
        const referrer = await getUserById(user.referral.user_id)

        if (referrer) {
          const referralDiscountInvoice = await Invoices.where({
            user_id: user.id,
            active: false,
            'discount.source': 'referral'
          }).countDocuments()

          // make sure that subscription of the referral user is still active
          if (referralDiscountInvoice == 0 && referrer.subscription.referral_discount > 0) {
            discount = (invoice.totals.subtotal * referrer.subscription.referral_discount) / 100
            console.log(`Referral discount is applicable to the user ${user.id} from user ${referrer.id}`)

            invoice.discount = {
              source: 'referral',
              id: referrer.id
            }

            // implement referral discount
            invoice.totals.discount = discount
            invoice.totals.total = invoice.totals.subtotal - discount
          }
        }
      }

      // check payment method
      if (req.body.payment_method == 'credit_balance') {
        const userBalance = await getUserBalanceByUid(res.locals.uid)

        // user balance not enough
        if (userBalance < invoice.totals.total) {
          return res.status(400).json({
            error: true,
            message: 'Insufficient credit balance'
          })
        } else {
          Balance.create({
            user_id: user.id,
            uid: user.uid,
            type: 'payment',
            description: `Payment for ${invoice.invoice_id}`,
            debt: invoice.totals.total,
            credit: 0,
            reference: {
              type: 'invoice',
              id: invoice.id
            },
            status: 1
          }, async (err, data) => {
            if (err) {
              console.log(err)
              return res.status(400).json({
                error: true,
                message: 'Something error. Please contact our customer service'
              })
            }
      
            if (data) {
              console.log('Balance created with id #', data.id)
    
              // execute user subscription
              await setUserSubscription(user.id, invoice.plan_id, false)

              // if discount source from referral
              // calculate the referral rewards
              if (invoice.discount.source == 'referral') {
                const referrer = await getUserById(user.referral.user_id)
    
                if (referrer) {
                  // make sure that subscription of the referral user is still active
                  // and then add credit to the referrer balance
                  if (referrer.subscription.referral_rewards > 0) {
                    const referralRewards = (invoice.totals.subtotal * referrer.subscription.referral_rewards) / 100

                    Balance.create({
                      user_id: referrer.id,
                      uid: referrer.uid,
                      type: 'referral_reward',
                      description: `Referral Rewards from ${user.display_name}`,
                      debt: 0,
                      credit: (invoice.totals.subtotal * referrer.subscription.referral_rewards) / 100,
                      reference: {
                        type: 'user',
                        id: user.id
                      },
                      status: 1
                    }, (err, data) => {
                      if (err) {
                        console.log(err)
                      }
              
                      if (data) {
                        // can send email to the referrer user
                        console.log('Balance created with id #', data.id)
                        
                        try {
                          sendEmail({
                            to: referrer.email,
                            subject: 'Referral Rewards',
                            template: 'account-referral-rewards',
                            data: {
                              user: {
                                display_name: referrer.display_name,
                              },
                              referred: {
                                email: censorEmail(user.email),
                                rewards: referralRewards.toFixed(2)
                              }
                            }
                          })
                        } catch (error) {
                          console.log(error)
                        }
                      }
                    })
                  }
                }
              }
    
              // set invoice to paid
              invoice.active = false
              invoice.payment = {
                paid: true,
                date: moment().toISOString(),
                method: 'credit_balance'
              }
              
              await invoice.save()

              // write log for this promo code
              if (invoice.discount.source == 'promo-code') {
                const promoCode = await PromoCodes.findById(invoice.discount.id).exec()
                
                if (promoCode) {
                  await PromoUses.create({
                    user_id: user.id,
                    plan_id: invoice.plan_id,
                    promo_code_id: promoCode.id,
                    promo_code: promoCode.code,
                    amount: invoice.totals.subtotal
                  })
                }
              }
              
              return res.status(200).json({
                error: false,
                message: `Thank you for your payment to the invoice ${invoice.invoice_id}`,
                data: invoice.toJSON()
              })
            }
          })
        }
      } else {
        invoice.payment = {
          paid: false,
          date: null,
          method: 'crypto'
        }

        await invoice.save()

        return res.status(200).json({
          error: false,
          message: `Please transfer USDT amount to your virtual account`,
          data: invoice.toJSON()
        })
      }
    }
  }).catch((err) => {
    console.log(err)

    return res.status(400).json({
      error: true,
      message: 'Error'
    })
  })
})

/**
 * This is for example purpose
 */
app.post('/invoices/pay-crypto', async (req, res) => {
  const user = await getUserByUid(res.locals.uid)
  const payment = await payInvoice(user.wallet_va, parseFloat(req.body.amount), '0xc302ecc0e4fadf903b64458a448859fd5be21cb1fa1e0c6613957e75f2b2f76d')
  
  if (payment) {
    res.status(200).json({
      error: false,
      message: 'Subscription Paid'
    })
  } else {
    res.status(400).json({
      error: true,
      message: 'Subscription payment failed. Add credit to user balance'
    })
  }
})

/**
 * Purchase subscription and creating invoice
 */
app.post('/purchase', async (req, res) => {
  let pricing = await utilPricing.getPricing();
  const plan = pricing.find(obj => obj.id == req.body.plan_id)
  
  if (!plan) {
    return res.status(400).json({
      error: true,
      message: 'Invalid plan'
    })
  }

  const user = await getUserByUid(res.locals.uid)

  if (user) {
    // check trial availability
    const trialInvoice = await Invoices.where({
      user_id: user.id,
      active: false,
      'discount.source': 'trial'
    }).countDocuments()

    // make trial invoice for the first time
    if (trialInvoice == 0) {
      Invoices.create({
        invoice_id: generateInvoiceId(),
        user_id: user.id,
        plan_id: req.body.plan_id,
        description: `${plan.name} (Trial)`,
        totals: {
          subtotal: plan.price,
          discount: plan.price,
          total: 0
        },
        active: false,
        wallet_va: user.wallet_va,
        discount: {
          source: 'trial',
          id: null
        },
        payment: {
          paid: true,
          date: moment().toISOString(),
          method: 'free'
        }
      }, async (err, data) => {
        if (err) {
          res.status(400).json({
            error: true,
            message: err
          })
        }

        if (data) {
          // set trial subscription
          await setUserSubscription(user.id, plan.id, true)

          res.status(200).json({
            status: true,
            result: data
          })
        }
      })
    } else {
      const activeInvoice = await checkActiveInvoce(user.id)
  
      if (activeInvoice) {
        // delete old invoice
        await activeInvoice.delete()
      }

      Invoices.create({
        invoice_id: generateInvoiceId(),
        user_id: user.id,
        plan_id: req.body.plan_id,
        description: `${plan.name}`,
        totals: {
          subtotal: plan.price,
          discount: 0,
          total: plan.price
        },
        active: true,
        wallet_va: user.wallet_va,
        discount: {
          source: null,
          id: null
        }
      }, (err, data) => {
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
    }
  } else {
    res.status(400).json({
      error: true,
      message: 'User not found'
    })
  }
})

app.post('/validate-promo-code', async (req, res) => {
  let pricing = await utilPricing.getPricing();
  const plan = pricing.find(obj => obj.id == req.body.plan_id)
  const user = await getUserByUid(res.locals.uid)
  const promoCode = await validatePromoCode(plan.id, req.body.promo_code, user.id)

  if (!promoCode.result) {
    res.status(400).json({
      result: false,
      message: promoCode.message
    })
  } else {
    let discount = 0

    if (promoCode.result.discount.type == 'percentage') {
      discount = (plan.price * promoCode.result.discount.amount) / 100
    } else {
      discount = promoCode.result.discount.amount
    }

    return res.status(200).json({
      discount: discount * -1,
      data: promoCode.result
    })
  }
})

module.exports = app