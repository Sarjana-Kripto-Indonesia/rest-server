const express = require('express')
const app = express.Router()
const Balances = require('../../models/balance')
const Users = require('../../models/users')
const { getUserByUid } = require('../../helpers/user')

app.get('/', async (req, res) => {
  const user = await getUserByUid(res.locals.uid)

  if (user && user.referral) {
    const totalRefferedUsers = await Users.where({
      'referral.user_id': user.id
    }).countDocuments()

    res.status(200).json({
      ...user.referral,
      referral_discount: user.subscription.referral_discount,
      referral_rewards: user.subscription.referral_rewards,
      total_referred_users: totalRefferedUsers
    })
  } else {
    res.status(400).json({
      error: true,
      message: 'User not found'
    })
  }
})

app.get('/rewards', async (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit) : 10
  let page = req.query.page ? parseInt(req.query.page) : 1

  if (page === 0) {
    page = 1
  }

  const filter = {
    uid: res.locals.uid,
    type: 'referral_reward'
  }

  const total = await Balances.where(filter).countDocuments()

  Balances.find(filter)
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
    return res.status(400).json({
      error: true,
      message: 'Error'
    })
  })
})

app.get('/total', async (req, res) => {
  let pipeline = [
    {
      $match: {
        uid: res.locals.uid,
        type: 'referral_reward'
      }
    },
    {
      $group:
      {
        _id: '$uid',
        totalAmount: { $sum: { $subtract: [ "$credit", "$debt" ] } },
        count: { $sum: 1 }
      }
    }
  ]

  Balances.aggregate(pipeline).exec().then((result) => {
    if(result.length > 0){
      return res.status(200).json({
        status: true,
        result: result[0].totalAmount
      })
    }else{
      return res.status(200).json({
        status: true,
        result: 0
      })
    }
  }).catch((err) => {
    return res.status(400).json({
      error: true,
      message: 'Error'
    })
  })
})

module.exports = app