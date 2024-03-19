const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const app = express.Router()
const Users = require('../../models/users');
const ReferralHistories = require('../../models/referrals-histories');
const { body, validationResult } = require('express-validator')
const { generateOtp, generateReferralCode } = require('../../helpers/string-generator')
const axios = require('axios')
const moment = require('moment')
const { sendEmail, sendTelegram } = require('../../services/queue')
const { generateRandomPassword } = require('../../helpers/password')
const { decodeSessionTokenMiddleware } = require('../../modules/auth/decoding');
const UtilLogs = require("../../utils/logs");
const { sendVerificationEmail, sendForgotPasswordEmail } = require('../../services/mailing');
const generateToken = require('../../utils/generate-token');
const UserToken = require('../../models/user-token');
const generateRefferal = require('../../helpers/referral');
const { OAuth2Client } = require('google-auth-library');
const bcrypt = require("bcrypt");
const { default: mongoose } = require('mongoose');

const writeLoginRecord = (uid, userRecord, ip, geo, userAgent, banned) => {
  return new Promise(async (resolve, reject) => {
    try {
      let createRecord = await UserLogins.create({
        uid, ip, geo, userAgent, banned
      });
      return resolve(createRecord);
    } catch (error) {
      return reject(error)
    }
  })
}

const sendLoginEmail = (_id, userRecord, ip, geo, userAgent, banned) => {
  return new Promise(async (resolve, reject) => {
    try {
      sendEmail({
        to: userRecord.email,
        subject: 'New device login alert!',
        template: 'auth-signin-new-device',
        data: {
          user: {
            display_name: userRecord.displayName
          },
          action_url: `${process.env.WEB_APP_URL}/auth-action?id=${_id}&mode=unlockDevice`,
          device_info: `IP: ${ip} - Location: ${geo.city} - ${userAgent.platform} ${userAgent.browser}`
        }
      })
      return resolve();
    } catch (error) {
      console.error(error);
      return reject(error)
    }
  })
}

// Hashing a.k.a Encrypt
const hashString = (val) => {
  const hash = crypto.createHash('sha256');
  hash.update(val);
  return hash.digest('hex')
}

// Secret for JWT
const secretKey = 'thisIsOurSecret';

const jwtSignin = (payload) => {
  const { name, email } = payload;

  // Create session token with a short expiration time (e.g., 15 minutes)
  const sessionToken = jwt.sign({ name, email }, secretKey, { expiresIn: '7d' });

  // Create refresh token with a longer expiration time (e.g., 7 days)
  const refreshToken = jwt.sign({ name, email }, secretKey, { expiresIn: '7d' });

  return {
    sessionToken,
    refreshToken
  }
}

// Middleware to generate and add tokens to res.locals
const generateTokensMiddleware = (req, res, next) => {
  const { sessionToken, refreshToken } = jwtSignin(req.body)
  res.locals.sessionToken = sessionToken;
  res.locals.refreshToken = refreshToken;

  next();

  // const { name, email, password } = req.body;

  // // Create session token with a short expiration time (e.g., 15 minutes)
  // const sessionToken = jwt.sign({ name, email }, secretKey, { expiresIn: '7d' });

  // // Create refresh token with a longer expiration time (e.g., 7 days)
  // const refreshToken = jwt.sign({ name, email }, secretKey, { expiresIn: '7d' });

  // // Add tokens to res.locals for further use in the request lifecycle
  // res.locals.sessionToken = sessionToken;
  // res.locals.refreshToken = refreshToken;

  // next();
};

app.post('/signup', [
  body('name').isLength({ min: 4 }).withMessage('Name must be at least 4 chars'),
  body('email').isEmail(),
  body('password').isStrongPassword({
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1
  })
], async (req, res) => {
  try {
    const { name, email, password, country, province, referral } = req.body
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let createUser = await Users.create({
      name,
      email,
      is_verified: false,
      password: hashString(password),
      country,
      province
      refferal: null,
      point:0
    })

    // Generate Self Refferal
    const generatedReferral = generateRefferal(createUser._id);
    const updateRefferal = await Users.updateOne({ _id: createUser._id }, { $set: { referral:generatedReferral } })

    // If Referred exist
    if (referral) {
      const findReferred = await Users.findOne({ referral });
      if (!findReferred) return res.status(400).json({ message: "Referral not found" })    

      const createHistories = await ReferralHistories.create({
        from: createUser._id,
        to: findReferred._id
      });
    }

    // * Send verification email
    const token = await generateToken(createUser._id, "user-verification")
    sendVerificationEmail({
      token,
      email,
      name
    })

    return res.status(200).send({ ok: true });
  } catch (error) {
    console.log('error', error)
    res.status(400).send(error)
  }
})

// Login endpoint
app.post('/login', generateTokensMiddleware, async (req, res) => {
  const { email, password } = req.body;

  // Get by email first
  const user = await Users.findOne({ email: email });

  if (!user) {
    return res.status(401).json({ message: "Couldn't find any user with that email" });
  }

  // Hash the provided password and compare with the stored hash
  const hashedPassword = hashString(password);

  if (hashedPassword === user.password) {
    // Successful login

    //   Session token generating
    const { sessionToken, refreshToken } = res.locals;

    return res.status(200).json({ message: 'Login successful', data: { sessionToken, refreshToken } });
  } else {
    return res.status(401).json({ message: 'Invalid password' });
  }
});

app.post('/google/login', async (req, res) => {
  try {
    const { id_token } = req.body
    const client = new OAuth2Client({
      clientId: process.env.GOOGLE_CLIENT_ID || "271189954999-8jn9sp7q8p7ado2eelf4uqigpirlqhkp.apps.googleusercontent.com",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "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"
    });
    const ticket = await client.verifyIdToken({
      idToken: id_token,
      audience: process.env.GOOGLE_CLIENT_ID || "271189954999-8jn9sp7q8p7ado2eelf4uqigpirlqhkp.apps.googleusercontent.com"
    });

    const payload = ticket.getPayload();
    const user = await Users.findOne({
      email: payload.email
    })

    if (user) {
      const { refreshToken, sessionToken } = await jwtSignin(user)
      res.locals.refreshToken = refreshToken
      res.locals.sessionToken = sessionToken
      return res.status(200).json({ message: 'Login successful', data: { sessionToken, refreshToken } });
    } else {
      const salt = await bcrypt.genSalt();
      const password = await bcrypt.hash(salt, salt);

      const created_user = await Users.create({
        name: payload?.name,
        email: payload?.email,
        is_verified: false,
        password: hashString(password)
      })

      // Generate Self Refferal
      const generatedReferral = generateRefferal(created_user._id);
      const updateRefferal = await Users.updateOne({ _id: created_user._id }, { $set: { referral:generatedReferral } })

      if (created_user) {
        const { refreshToken, sessionToken } = await jwtSignin(created_user)
        res.locals.refreshToken = refreshToken
        res.locals.sessionToken = sessionToken

        // * Send verification email
        const token = await generateToken(created_user._id, "user-verification")
        sendVerificationEmail({
          token,
          email: payload?.email,
          name: payload?.name
        })

        return res.status(200).json({ message: 'Login successful', data: { sessionToken, refreshToken } });

      } else {
        throw new Error('Failed to sync user data')
      }
    }
  } catch (error) {
    console.log({ error })
    return res.status(401).json({ message: error.message });
  }
})

// Refresh token
app.post('/refresh-access-token', [decodeSessionTokenMiddleware, generateTokensMiddleware], async (req, res) => {
  try {
    const user_id = mongoose.Types.ObjectId(res.locals.user._id)
    const user = await Users.findOne({ _id: user_id });

    if (!user) {
      return res.status(401).json({ message: "Couldn't find any user with that email" });
    }

    const { sessionToken, refreshToken } = res.locals;

    return res.status(200).json({ message: 'Login successful', data: { sessionToken, refreshToken } });
  } catch (err) {
    console.log({ error })
    return res.status(401).json({ message: error.message });
  }

});

// Forget password endpoint
app.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    // Get by email first
    const user = await Users.findOne({ email: email });

    if (!user) {
      return res.status(401).json({ message: "Couldn't find any user with that email" });
    }

    // * Send forgot password email
    const token = await generateToken(user._id, "forgot-password", 60 * 60 * 24)
    await sendForgotPasswordEmail({
      token,
      email: user.email,
      name: user.name
    })

    return res.status(200).json({ message: 'Email sent!' });
  } catch (error) {
    console.log({ error })
    return res.status(500).json({ message: 'Server error' });
  }

});

app.post('/reset-password', async (req, res) => {
  try {
    const { password, token } = req.body;

    // * Get by email first
    const check_token = await UserToken.findOne({
      token,
      expires_at: {
        $gte: moment().toISOString()
      }
    })

    if (!check_token) return res.status(400).json({
      error: true,
      message: "Token unavailable or expired"
    })

    // * Reset password for user
    const updated_user = await Users.updateOne({
      _id: check_token.user_id
    }, {
      $set: {
        password: hashString(password)
      }
    })

    // * Delete all token from that user
    await UserToken.remove({
      user_id: check_token.user_id,
      type: "forgot-password"
    })

    return res.status(200).json({ message: 'Password updated!', data: updated_user });
  } catch (error) {
    console.log({ error })
    return res.status(500).json({ message: 'Server error' });
  }

});

app.get('/profile', decodeSessionTokenMiddleware, async (req, res) => {
  try {
    // console.log(req.user);
    // console.log('locals', res.locals);

    let getCurrentUser = await Users.findOne({ email: req.user.email }).select('-password').exec();


    return res.status(200).json({ ok: true, data: getCurrentUser });
  } catch (error) {
    console.error({ error })
    return res.status(500).json({ message: 'Server error' });

  }

})


app.put('/profile', decodeSessionTokenMiddleware, async (req, res) => {
  try {
    const { name, phone, country, province } = req.body
    const user_id = mongoose.Types.ObjectId(res.locals.user._id)
    const user = await Users.updateOne({
      _id: user_id
    }, {
      $set: {
        phone,
        name,
        country,
        province
      }
    })

    return res.status(200).send({ ok: true, data: user });
  } catch (error) {
    console.log('error', error)
    res.status(400).send(error)
  }
})



module.exports = app