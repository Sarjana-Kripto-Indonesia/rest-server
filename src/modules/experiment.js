const express = require('express');
const { sendVerificationEmail } = require('../services/mailing');
const app = express.Router()

app.get('/', async (req, res) => {
  try {
    let result;
    result = await sendVerificationEmail({
      token: "TOKEN",
      email: "dpraktikastudio@gmail.com",
      name: "Dev101"
    })
    res.status(200).json({ result });
  } catch (err) {
    console.log({ err })
    res.status(400).json({ success: false, error: err })
  }
})

module.exports = app