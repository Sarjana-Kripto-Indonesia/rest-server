const express = require('express')
const mongoose = require('mongoose');
const geoip = require('geoip-lite');
const app = express.Router()
const Users = require('../../models/users')
const UserLogins = require('../../models/user-logins')
const UserProperties = require('../../models/user-properties')
const { admin } = require('../../services/firebase')
const { body, validationResult } = require('express-validator')
const { getUserByUid } = require('../../helpers/user')
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
      console.log('rejectWrite1')
      return reject(error)
    }
  })
}

const sendLoginEmail = (_id, userRecord, ip, geo, userAgent, banned) => {
  console.log('userRecord', userRecord);
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
      console.log('rejectWrite2')
      return reject(error)
    }
  })
}

const actionCodeSettings = {
  url: process.env.WEB_APP_URL,
  handleCodeInApp: true
}

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
  const errors = validationResult(req)
  let hearAbout = req.body.hearAbout ? req.body.hearAbout : null;
  if (!errors.isEmpty()) {
    res.status(400).json({
      status: 'error',
      data: null,
      message: 'Validation Error',
      errors: errors.array()
    })
  } else {
    // validate referral if available
    let referrerUserId = null

    console.log("CHECK REFERRAL: ", req.body.referral)

    if (req.body.referral && typeof req.body.referral != 'undefined' && req.body.referral != '') {
      const userReferrer = await Users.findOne({
        'referral.code': req.body.referral
      }).exec()

      if (userReferrer) {
        referrerUserId = userReferrer.id
        console.log('USER REFERRAL', userReferrer.id)
      }

    }

    const otpData = {
      method: "none",
      code: generateOtp(),
      expired_at: moment().add(10, 'm').toDate(),
      uses: 'signup'
    }

    // create firebase auth user
    admin.auth().createUser({
      email: req.body.email,
      emailVerified: false,
      password: req.body.password,
      displayName: req.body.name,
      photoURL: 'https://firebasestorage.googleapis.com/v0/b/bitzenius-dev.appspot.com/o/bitzenius-default-avatar.jpeg?alt=media&token=d6d78d74-7baa-4c02-9894-a26000a4d4f2',
      disabled: false,
    }).then((userRecord) => {
      // create user on mongodb
      Users.create({
        uid: userRecord.uid,
        display_name: userRecord.displayName,
        email: userRecord.email,
        email_verified: userRecord.emailVerified,
        photo_url: userRecord.photoURL,
        referral: {
          code: generateReferralCode(),
          user_id: referrerUserId
        },
        otp: otpData
      }, (err, data) => {
        if (err) {
          console.log(err)
          return res.status(400).send('Creating user error')
        }

        if (data) {
          // user properties creation
          
          UserProperties.create({
            key: hearAbout.key,
            value: hearAbout.value,
            description: hearAbout.description,
            user_id: data.uid,
          }, (err, data) => {
            if (err) {
              console.log('Error create user properties', err)
            }

            if (data) {
              console.log('User properties created', data)
            }
          })

          // send verification email
          // admin.auth().generateEmailVerificationLink(data.email, actionCodeSettings).then((link) => {
          //   sendEmail({
          //     to: data.email,
          //     subject: 'Verify Your Account to Access BitZenius',
          //     template: 'account-verification',
          //     data: {
          //       user: {
          //         display_name: data.display_name
          //       },
          //       verification_link: `${link}&email=${data.email}`
          //     }
          //   })

          //   return res.status(200).json({
          //     status: 'success',
          //     result: userRecord
          //   })

            
          // }).catch((error) => {
          //   return res.status(400).send(error)
          // })

          console.log('User created:', data)
          let otp = generateOtp();
          
          const emailPayload = {
            to: data.email,
            subject: 'Signin Request',
            template: 'account-signin-otp',
            data: {
              user: {
                display_name: data.display_name,
                email: data.email
              },
              otp: {
                code: otpData.code,
                expired_at: otpData.expired_at
              }
            }
          }

          sendEmail(emailPayload)
          res.status(200).json({
            method: 'email',
            expired_at: otpData.expired_at
          });

          // sendEmail({
          //   to: data.email,
          //   subject: 'Verify Your Account to Access BitZenius',
          //   template: 'account-verification',
          //   data: {
          //     user: {
          //       display_name: data.display_name
          //     },
          //     verification_link: `${otp}`
          //   }
          // })
          // create OTP send via Email
        }
      })
    }).catch((error) => {
      return res.status(400).send(error)
    })
  }
})

// app.post('/verify-otp', (req, res) => {
//   console.log('verify otp');
//   console.log(req.body);
//   let uid = req.body.uid ? req.body.uid  : null;
//   admin.auth().updateUser(uid, { emailVerified: true }).then(async (reply) => {
//     console.log('RES UPDATE USER');
//     console.log(reply);
//     res.status(200).send(true)
//   })
// });

app.post('/verify', [
  body('email').isEmail()
], (req, res) => {

  const errors = validationResult(req)

  if (!errors.isEmpty()) {
    res.status(400).json({
      status: 'error',
      data: null,
      message: 'Validation Error',
      errors: errors.array()
    })
  } else {
    admin.auth().getUserByEmail(req.body.email).then(async (userRecord) => {
      if (userRecord.emailVerified) {
        let isEmailVerifiedOnDatabase = false

        const userData = await Users.findOne({
          uid: userRecord.uid
        }).exec()

        if (userData) {
          isEmailVerifiedOnDatabase = userData.email_verified

          // set user email verified
          userData.set('email_verified', true)
          await userData.save()
        }

        // send welcome email for the first verification
        if (!isEmailVerifiedOnDatabase) {
          sendEmail({
            to: userRecord.email,
            subject: 'Welcome to BitZenius!',
            template: 'account-signup',
            data: {
              user: {
                display_name: userRecord.displayName
              }
            }
          })
        }

        res.status(200).json({
          status: 'success',
          message: 'User email already verified'
        })
      } else {
        // send verification email
        console.log('userRecord', userRecord);
        admin.auth().generateEmailVerificationLink(userRecord.email, actionCodeSettings).then(async (link) => {
          sendEmail({
            to: userRecord.email,
            subject: 'Verify Your Account to Access BitZenius',
            template: 'account-verification',
            data: {
              user: {
                display_name: userRecord.displayName
              },
              verification_link: `${link}&email=${userRecord.email}`
            }
          })

          res.status(200).json({
            status: 'success',
            message: 'Email verification sent'
          })
        }).catch((error) => {
          console.log('233 - error user/auth/verify', error);
          res.status(400).send(error)
        })
      }
    }).catch((error) => {
      console.log('238 - error user/auth/verify', error);
      res.status(400).send(error)
    })
  }
})

app.post('/reset-password', [
  body('email').isEmail()
], (req, res) => {
  const errors = validationResult(req)

  if (!errors.isEmpty()) {
    res.status(400).json({
      status: 'error',
      data: null,
      message: 'Validation Error',
      errors: errors.array()
    })
  } else {
    admin.auth().getUserByEmail(req.body.email).then(async (userRecord) => {
      admin.auth().generatePasswordResetLink(userRecord.email, actionCodeSettings).then(async (link) => {
        sendEmail({
          to: userRecord.email,
          subject: 'Reset your Password for BitZenius',
          template: 'account-reset-password',
          data: {
            user: {
              display_name: userRecord.displayName
            },
            reset_password_link: link
          }
        })

        res.status(200).json({
          status: 'success',
          message: 'Email reset password sent'
        })
      }).catch((error) => {
        res.status(400).send(error)
      })
    }).catch((error) => {
      res.status(400).send(error)
    })
  }
})

app.post('/signin', (req, res) => {
  axios.post(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_API_KEY}`, {
    email: req.body.email,
    password: req.body.password
  }).then(() => {
    admin.auth().getUserByEmail(req.body.email).then(async (userRecord) => {
      const user = await getUserByUid(userRecord.uid);
      console.log('------------- getUserById', user);
      if (user) { //Successfully logged in ↓
        //------------------------- DISABLE FROM THIS ON DEVELOPMENT
        // VALIDATE USER USER IP, USER AGENT, LOCATION
        // let ip = req.body.ip ? req.body.ip : null;
        // if (!ip) {
        //   return res.status(400).send({ message: "Unable to get client IP" });
        // }
        // console.log(`User: ${req.body.email}, ip: ${ip}`)
        // let dummyIp = '125.166.12.121';
        // let geo = geoip.lookup(ip);
        // console.log(geo);
        // if (!geo) {
        //   geo = {
        //     range: [],
        //     country: "Unknown",
        //     region: "Unknown",
        //     eu: 0,
        //     timezone: "Unknown",
        //     city: "Unknown",
        //     ll: [],
        //     metro: 0,
        //     area: 0
        //   }
        // }

        // let userAgent = req.useragent ? req.useragent : false;

        // // CHECK USER RECORDS, IF NOT FOUND CREATE ONE → ELSE FOUND ONE THEN CHECK IS BANNED TRUE/FALSE
        // let userLoginsRecords = await UserLogins.find({ uid: user.uid });
        // if (userLoginsRecords.length <= 0) {
        //   /**
        //    * User doesn't have login record before, allow their first device
        //    * Create user first device on DB with unlocked status
        //    */
        //   try {
        //     console.log('FreshAccount')
        //     let writeRecord = await writeLoginRecord(user.uid, userRecord, ip, geo, userAgent, false);
        //   } catch (error) {
        //     console.log('errorFreshAccount')
        //     return res.status(400).send(error)
        //   }
        // }
        // else {
        //   /**
        //    * User has login record, logic goes here ↓
        //    * Find a record that match with current params (IP, USER AGENT, LOCATION)
        //    */

        //   try {
        //     let query = { uid: user.uid}
        //     // let query = { uid: user.uid, 'geo.city': geo.city }
        //     let findOneLoginHistory = await UserLogins.findOne(query).exec();

        //     if (!findOneLoginHistory) { // ↓ Device is not registered yet, create new device on DB and then send email with unlock URL
        //       let writeRecord = await writeLoginRecord(user.uid, userRecord, ip, geo, userAgent, true);
        //       let sendEmail = await sendLoginEmail(writeRecord._id, userRecord, ip, geo, userAgent, true);
        //       return res.status(400).send("New device detected! please check your email to continue")
        //     }

        //     if (findOneLoginHistory.banned) { // ↓ Device found but still on banned mode
        //       let sendEmail = await sendLoginEmail(findOneLoginHistory._id, userRecord, ip, geo, userAgent, true);
        //       return res.status(400).send("This device is still locked, please check your email to unlock")
        //     } else if (!findOneLoginHistory.banned) { // ↓ Device found and not banned
        //       console.log('deviceExist: not banned')
        //       // Write user-logs only
        //     }
        //   } catch (error) {
        //     console.log('errorAlreadyExistAccount', error);
        //     return res.status(400).send(error)
        //   }
        // }
        //------------------------- DISABLE UNTIL THIS ON DEVELOPMENT


        // Continue sign-in process ↓
        const otpData = {
          ...user.otp,
          code: generateOtp(),
          expired_at: moment().add(10, 'm').toDate(),
          uses: 'signin'
        }

        user.otp = otpData
        await user.save()

        const emailPayload = {
          to: user.email,
          subject: 'Signin Request',
          template: 'account-signin-otp',
          data: {
            user: {
              display_name: user.display_name,
              email: user.email
            },
            otp: {
              code: otpData.code,
              expired_at: otpData.expired_at
            }
          }
        }


        // check for 2FA auth is enabled
        switch (user.otp.method) {
          case 'email':
            sendEmail(emailPayload)
            res.status(200).json({
              method: 'email',
              expired_at: otpData.expired_at
            })

            break
          case 'telegram':
            // also send OTP to user email as of the default
            sendEmail(emailPayload)

            admin.firestore().collection('telegrams').doc(user.uid).get().then((doc) => {
              if (doc.exists) {
                const chatId = doc.data().chat_id ? doc.data().chat_id : null

                if (chatId) {
                  let message = `Your OTP code is: <b>${otpData.code}</b>\n`
                  message += 'Valid for 10 minutes. Please don\'t share with anyone!'

                  sendTelegram({
                    chatId,
                    message
                  })

                  return res.status(200).json({
                    method: 'telegram',
                    expired_at: otpData.expired_at
                  })
                } else {
                  return res.status(200).json({
                    method: 'email',
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
          case 'whatsapp':
            // @todo setup Whatsapp api
            break
          case 'authenticator':
            // @todo setup Google Authenticator
            break
          default:
            // returns custom claim if no otp method found
            // this is for debugging purpose only
            admin.auth().createCustomToken(user.uid).then(async (customToken) => {
              // set locked status to false
              await Users.findByIdAndUpdate(user.id, {
                locked: false
              })

              res.status(200).json({
                method: 'token',
                token: customToken
              })
            }).catch((error) => {
              console.log('Error creating custom token:', error)
              res.status(400).send(error)
            })

            break
        }
      } else {
        console.log('user is not verified yet!');
        res.status(200).json({ not_verified: true, message: 'User is not verified yet' })
      }
    }).catch((error) => {
      console.log('error 340')
      console.log(error);
      res.status(400).send(error)
    })
  }).catch(async (error) => {
    console.log("ERROR SIGNIN", error)
    const errorMessage = error.response?.data?.error?.message

    // use built-in Firebase Auth to detecting max login attempts
    // for the security reason, our system will lock this user
    console.log(`errorMessage`, errorMessage);
    if (errorMessage.indexOf('TOO_MANY_ATTEMPTS_TRY_LATER') != -1) {
      console.log('Should reset password here')
      Users.findOne({
        email: req.body.email
      }, (async (err, user) => {
        err && console.log(err)

        if (user && !user.locked) {
          // lock user
          user.locked = true
          await user.save()

          // Reset user password with random string. This action also revoking the user refresh token
          // as described at here: https://firebase.google.com/docs/auth/admin/manage-sessions
          admin.auth().updateUser(user.uid, {
            password: generateRandomPassword()
          }).then(() => {
            // Reset to generate password reset link
            admin.auth().generatePasswordResetLink(user.email, actionCodeSettings).then((passwordResetLink) => {
              // Once generated link has been created, send this link to user
              sendEmail({
                to: user.email,
                subject: 'Your account has been locked due to multiple failed login attempts',
                template: 'account-locked',
                data: {
                  user: {
                    display_name: user.display_name
                  },
                  action_url: passwordResetLink
                }
              })
            }).catch((error) => {
              console.log(error)
            })
          }).catch(error => {
            console.log(error)
          })
        }
      }))

      res.status(400).send('Your account has been temporarily locked. Please check your email for further information!')
    } else {
      res.status(400).send('Invalid email and password or user is not found!')
    }
  })
})

app.post('/generate-otp-signup', (req, res) => { 
  let query = {
    uid: req.body.uid ? req.body.uid : null
  }

  if (!query.uid) {
    return res.status(400).send("User ID is not valid!")
  }

  Users.findOne(query).exec().then(async (user) => {
    if (!user) {
      return res.status(400).send('User is not found!')
    }

    const otpData = {
      method: "none",
      code: generateOtp(),
      expired_at: moment().add(10, 'm').toDate(),
      uses: 'signup'
    }

    user.otp = otpData
    await user.save();

    const emailPayload = {
      to: user.email,
      subject: 'Signin Request',
      template: 'account-signin-otp',
      data: {
        user: {
          display_name: user.display_name,
          email: user.email
        },
        otp: {
          code: otpData.code,
          expired_at: otpData.expired_at
        }
      }
    }

    sendEmail(emailPayload)

    return res.status(200).send("New OTP has been successfully generated, please check your email!")
  }).catch((error) => {
    console.log(error)
    res.status(400).send(error)
  });

})

app.post('/otp-verify', (req, res) => {
  /*
  // For testing only
  Users.updateMany({}, { '$set': { 'otp': {
    method: 'email',
    code: null,
    expired_at: null,
    uses: null
  }}}).exec().then((ree) => {
    console.log(res)
  }).catch((err) => {
    console.log(err)
  })
  */

  const now = moment().toDate()
  let query = {
    'otp.code': req.body.otp.toString(),
    'otp.expired_at': {
      $gte: now
    }
  }
  let uid = req.body.uid ? req.body.uid : null;
  if (uid) {
    query.uid = uid
  };
  console.log(`verify otp q`, query);
  Users.findOne(query).exec().then(async (user) => {
    console.log(user);
    if (!user) {
      return res.status(400).send('Either user is not found or your OTP code is invalid')
    }

    const otpUses = user.otp.uses

    // reset otp
    user.otp = {
      ...user.otp,
      code: null,
      expired_at: null,
      uses: null
    }

    if (otpUses == 'signup') {
      user.email_verified = true
    }

    user.locked = false
    await user.save()

    if (otpUses == 'signin') {
      console.log(`otp on signin`)
      admin.auth().createCustomToken(user.uid).then((customToken) => {
        res.status(200).json({
          status: 'success',
          message: 'Custom token was created successfully',
          token: customToken
        })
      }).catch((error) => {
        console.log('Error creating custom token:', error)
        res.status(400).send(error)
      })
    } else if (otpUses == 'signup') {
      console.log(`otp on signup`)
      admin.auth().updateUser(uid, { emailVerified: true }).then(async (reply) => {
        console.log('RES UPDATE USER');
        console.log(reply);
        admin.auth().createCustomToken(user.uid).then((customToken) => {
          sendEmail({
            to: user.email,
            subject: 'Welcome to BitZenius!',
            template: 'account-signup',
            data: {
              user: {
                display_name: user.display_name
              }
            }
          })
          res.status(200).json({
            status: 'success',
            message: 'Custom token was created successfully',
            token: customToken
          })
        }).catch((error) => {
          console.log('Error creating custom token:', error)
          res.status(400).send(error)
        })
      }).catch((error) => { 
        console.log('Error validating user sign-up using OTP:', error)
        res.status(400).send(error)
      })
    }
    else {
      res.status(200).json({
        status: 'success',
        message: 'OTP resetted successfully'
      })
    }
  }).catch((error) => {
    console.log(error)
    res.status(400).send(error)
  })
})

app.get('/unlock', async (req, res) => {
  try {
    console.log(req.query.id);

    //Get parameters to update
    let id = req.query.id ? mongoose.Types.ObjectId(req.query.id) : null;
    if (!id) return res.status(400).send("Device ID is not defined");

    let UserLoginsRecords = await UserLogins.findOne({ _id: id }).exec();
    if (UserLoginsRecords) { // IF Login record exist for specific device, then unlock
      UserLoginsRecords.set('banned', false);
      let executeUpdate = await UserLoginsRecords.save();
      console.log('executeUpdate', executeUpdate);
      res.status(200).send("Successfully Unlocked");
    } else { // IF Device not found, send error.
      res.status(400).send("Couldn't find device data")
    }
  } catch (error) {
    console.log('error', error);
    res.status(400).send("Unable to unlock your account!")
  }
})


module.exports = app