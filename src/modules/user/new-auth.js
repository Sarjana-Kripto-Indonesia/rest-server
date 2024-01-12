const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const app = express.Router()
const Users = require('../../models/users');
const { body, validationResult } = require('express-validator')
const { generateOtp, generateReferralCode } = require('../../helpers/string-generator')
const axios = require('axios')
const moment = require('moment')
const { sendEmail, sendTelegram } = require('../../services/queue')
const { generateRandomPassword } = require('../../helpers/password')
const UtilLogs = require("../../utils/logs");

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

// Middleware to generate and add tokens to res.locals
const generateTokensMiddleware = (req, res, next) => {
    const { name, email, password } = req.body;

    // Create session token with a short expiration time (e.g., 15 minutes)
    const sessionToken = jwt.sign({ name, email }, secretKey, { expiresIn: '15m' });
  
    // Create refresh token with a longer expiration time (e.g., 7 days)
    const refreshToken = jwt.sign({ name, email }, secretKey, { expiresIn: '7d' });
  
    // Add tokens to res.locals for further use in the request lifecycle
    res.locals.sessionToken = sessionToken;
    res.locals.refreshToken = refreshToken;
  
    next();
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
    try{
        const {name, email, password} = req.body

        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        let createUser = await Users.create({
            name,
            email,
            password:hashString(password)
        })

        return res.status(200).send({ok:true});
    }catch(error){
        res.status(400).send(error)
    }
})

// Login endpoint
app.post('/login', generateTokensMiddleware, async (req, res) => {
    const { email, password } = req.body;
    
    // Get by email first
    const user = await Users.findOne({email:email});

    if (!user) {
      return res.status(401).json({ message: "Couldn't find any user with that email" });
    }

    // Hash the provided password and compare with the stored hash
    const hashedPassword = hashString(password);

    if (hashedPassword === user.password) {
        // Successful login

        //   Session token generating
        const { sessionToken, refreshToken } = res.locals;
        
        return res.status(200).json({ message: 'Login successful', data: {sessionToken, refreshToken} });
    } else {
        return res.status(401).json({ message: 'Invalid password' });
    }
});
module.exports = app