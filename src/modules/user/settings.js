const express = require('express')
const app = express.Router()
const Users = require('../../models/users')

/**
 * GET /user
 * Get user's settings
 */
app.get('/', async (req, res) => {
  Users.findOne({ uid: res.locals.uid })
  .exec().then((user) => {
    return res.status(200).json({
      status: true,
      result: user
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
 * PUT /user
 * Update user's profile
 */
app.put('/', async (req, res) => {

})

module.exports = app