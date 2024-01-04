const express = require('express')
const app = express.Router()
const Balances = require('../../models/balance')
const TradingHistory = require("../../models/trading-history")
const { admin } = require('../../services/firebase')
const { getUserByUid, getUserBalanceById } = require('../../helpers/user')
const { generateOtp } = require('../../helpers/string-generator')
const ethers = require('ethers')
const moment = require('moment')
const { sendEmail, processWithdraw } = require('../../services/queue')

// in usd
const WITHDRAW_FEE = 1

app.get('/', async (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit) : 10
  let page = req.query.page ? parseInt(req.query.page) : 1

  if (page === 0) {
    page = 1
  }

  let query = { uid: res.locals.uid }

  if (req.query.filter) {
    let filter = JSON.parse(req.query.filter);
    for (let key in filter) {
      query[key] = filter[key];
    }
  }

  const total = await Balances.where(query).countDocuments()

  Balances.find(query)
    .limit(limit)
    .skip((page - 1) * limit)
    .sort({ created_at: 'desc' })
    .exec().then((results) => {
      if (results.length > 0) {
        let data = [];
        results.forEach((val) => {
          let temp = val._doc;
          if (val.type == 'profit_share') {
            let split_string = val.description.split(' ');
            let last_index = split_string.length - 1;
            temp.exchange = split_string[last_index].slice(1, -1);
          }
          data.push(temp);
        })
        return res.status(200).json({
          status: true,
          result: {
            total: total,
            page: page,
            limit: limit,
            data
          }
        })
      } else {
        return res.status(200).json({
          status: true,
          result: {
            total: total,
            page: page,
            limit: limit,
            data: []
          }
        })
      }

    }).catch((err) => {
      console.log(err)

      return res.status(500).json({
        error: false,
        message: 'Error'
      })
    })
})

app.get('/total', async (req, res) => {
  let pipeline = [
    {
      $match: {
        uid: res.locals.uid
      }
    },
    {
      $group:
      {
        _id: '$uid',
        totalAmount: { $sum: { $subtract: ["$credit", "$debt"] } },
        count: { $sum: 1 }
      }
    }
  ]

  Balances.aggregate(pipeline).exec().then((result) => {
    return res.status(200).json({
      status: true,
      result: result[0] ? result[0].totalAmount : 0
    })
  }).catch((err) => {
    console.log('/user/balance/total', err)
    return res.status(500).json({
      error: false,
      message: 'Error'
    })
  })
})

app.get('/detail', async (req, res) => {
  let order_id = req.query.order_id ? req.query.order_id : null;
  let query = {
    order_id
  }
  TradingHistory.find(query).exec().then((result) => {
    res.status(200).json({ data: result });
  }).catch((err) => {
    console.log('/user/balance/detail', err)
    return res.status(500).json({
      error: false,
      message: 'Error'
    })
  })
})

/**
 * Get withdrawal list
 */
app.get('/withdraw', async (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit) : 10
  let page = req.query.page ? parseInt(req.query.page) : 1

  if (page === 0) {
    page = 1
  }

  const total = await Balances.where(({
    uid: res.locals.uid,
    type: 'withdraw'
  })).countDocuments()

  Balances.find({
    uid: res.locals.uid,
    type: 'withdraw'
  }).limit(limit)
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

      return res.status(200).json({
        error: false,
        message: 'Error'
      })
    })
})

/**
 * Request withdraw
 * This request need OTP confirmation
 */
app.post('/withdraw', async (req, res) => {
  const otp = req.body.otp
  const now = moment().toDate()
  const user = await getUserByUid(res.locals.uid)

  if (user) {
    // validate user crypto wallet
    if (!ethers.utils.isAddress(user.wallet)) {
      return res.status(400).json({
        error: true,
        message: 'Wallet address is invalid'
      })
    }

    // validate to make sure balance is enough
    const userBalance = await getUserBalanceById(user.id)
    console.log('Balance', userBalance)

    const withdrawAmount = parseFloat(req.body.amount);

    if (withdrawAmount <= 0) {
      return res.status(400).json({
        error: true,
        message: 'Withdraw Amount must be greater than 0'
      })
    }

    if (withdrawAmount > 0 && userBalance >= withdrawAmount) {
      // validate OTP
      if (otp && user.otp.uses == 'withdraw' && user.otp.code == otp.toString() && user.otp.expired_at >= now) {
        // OTP is valid
        // admin will updating `reference` field later
        Balances.create({
          user_id: user.id,
          uid: user.uid,
          type: 'withdraw',
          description: 'Withdraw',
          debt: withdrawAmount - parseFloat(WITHDRAW_FEE),
          credit: 0,
          status: 0
        }, (err, data) => {
          if (err) {
            console.log(err)
          }

          if (data) {
            // send email to the user
            sendEmail({
              to: user.email,
              subject: 'Withdraw Submitted',
              template: 'balance-withdrawal-requested',
              data: {
                user: {
                  display_name: user.display_name,
                  email: user.email,
                  wallet: user.wallet
                },
                amount: withdrawAmount
              }
            })

            sendEmail({
              to: 'hello@bitzenius.com',
              subject: 'Withdraw Request From User Submitted',
              template: 'balance-withdrawal-requested',
              data: {
                user: {
                  display_name: user.display_name,
                  email: user.email,
                  wallet: user.wallet
                },
                amount: withdrawAmount
              }
            })

            // being processed, put into queue
            // processWithdraw({
            //   balance_id: data.id
            // })

            return res.status(200).json({
              status: true,
              message: 'Withdrawal request has been submitted successfully'
            })
          }
        })

        Balances.create({
          user_id: user.id,
          uid: user.uid,
          type: 'withdraw_fee',
          description: 'Withdraw',
          debt: 1,
          credit: 0,
          status: 1
        }, (err, data) => {
          if (err) {
            console.log(err)
          }

          if (data) {
            console.log('Withdraw Fee applied for', user.uid)
          }
        })

        // in the end of process, OTP should be resetted
        user.otp = {
          ...user.otp,
          code: null,
          expired_at: null,
          uses: null
        }

        await user.save()
      } else if (otp && user.otp.code != otp.toString()) {
        // OTP is provided but invalid
        return res.status(400).send('Invalid OTP code')
      } else {
        // OTP is not provided, so re-generate it
        const otpData = {
          ...user.otp,
          code: generateOtp(),
          expired_at: moment().add(10, 'm').toDate(),
          uses: 'withdraw'
        }

        user.otp = otpData
        await user.save()

        const emailPayload = {
          to: user.email,
          subject: 'Withdraw Request',
          template: 'balance-withdrawal-otp',
          data: {
            user: {
              display_name: user.display_name,
              email: user.email,
              wallet: user.wallet
            },
            otp: {
              code: otpData.code,
              expired_at: otpData.expired_at
            },
            amount: withdrawAmount
          }
        }

        switch (user.otp.method) {
          case 'whatsapp':
            // @todo setup Whatsapp api
            break
          case 'authenticator':
            // @todo setup Google Authenticator
            break
          case 'telegram':
            admin.firestore().collection('telegrams').doc(user.uid).get().then((doc) => {
              if (doc.exists) {
                const chatId = doc.data().chat_id ? doc.data().chat_id : null

                if (chatId) {
                  let message = `Your OTP code for withdraw request is: <b>${otpData.code}</b>\n`
                  message += 'Valid for 10 minutes. Please don\'t share with anyone!'

                  sendTelegram({
                    chatId,
                    message
                  })

                  return res.status(200).json({
                    method: 'telegram',
                    expired_at: otpData.expired_at
                  })
                }
              } else {
                return res.status(400).send('Telegram is not connected')
              }
            }).catch((err) => {
              console.log(err)
              return res.status(400).send('Error')
            })

            break
        }

        // always to send OTP to the user email as of the default
        sendEmail(emailPayload)

        return res.status(200).json({
          otp: true,
          expired_at: otpData.expired_at,
          message: 'OTP was sent to your email'
        })
      }
    } else {
      return res.status(400).json({
        error: true,
        message: 'Insufficient balance'
      })
    }
  }
})

module.exports = app