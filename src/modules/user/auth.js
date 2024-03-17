const express = require('express');
const app = express.Router()
const Users = require('../../models/users');
const UserToken = require('../../models/user-token');
const mongoose = require('mongoose');
const moment = require('moment/moment');
const generateToken = require('../../utils/generate-token');
const { sendVerificationEmail, sendWelcomeEmail } = require('../../services/mailing');

app.post('/verification', async (req, res) => {
  try {
    const { token } = req.body
    const user_id = mongoose.Types.ObjectId(res.locals.user._id)

    // * Check if token match
    const check_token = await UserToken.findOne({
      user_id,
      token,
      expires_at: {
        $gte: moment().toISOString()
      }
    })

    if (!check_token) return res.status(400).json({
      error: true,
      message: "Token unavailable or expired"
    })

    // * Flag user as verified
    let updated_user = await Users.updateOne({ _id: user_id }, { $set: { is_verified: true } })

    const user = await Users.findOne({
      _id: user_id
    })
    await sendWelcomeEmail({ email: user.email, name: user.name })

    return res.status(200).send({ ok: true, updated_user });
  } catch (error) {
    console.log('error', error)
    res.status(400).send(error)
  }
})

app.post('/resend-verification', async (req, res) => {
  try {
    const user_id = mongoose.Types.ObjectId(res.locals.user._id)
    const user = await Users.findOne({
      _id: user_id
    })

    if (!user) {
      throw new Error("User not found!")
    }

    // * Delete all token from that user
    await UserToken.remove({
      user_id,
      type: "user-verification"
    })

    // * Send verification email
    const token = await generateToken(user_id, "user-verification")
    sendVerificationEmail({
      token,
      email: user.email,
      name: user.name
    })

    return res.status(200).send({ ok: true });
  } catch (error) {
    console.log('error', error)
    res.status(400).send(error)
  }
})

module.exports = app