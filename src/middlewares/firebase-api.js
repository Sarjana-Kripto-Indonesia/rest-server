const Users = require('../models/users');

const firebaseApi = (req, res, next) => {
  const authHeader = req.headers['authorization'] ? req.headers['authorization'].toString() : false
  const timezone = req.headers['timezone'] ? req.headers['timezone'].toString() : null;
  // console.log(`middleware timezone: ${timezone}`);
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const idToken = authHeader.substring(7, authHeader.length)

    admin.auth().verifyIdToken(idToken).then(async (decodedToken) => {
      // console.log('decodedToken', decodedToken)
      res.locals.email = decodedToken.email
      res.locals.uid = decodedToken.uid
      res.locals.subscription = decodedToken.subscription
      res.locals.trial = decodedToken.trial

      // force email for admin
      res.locals.admin = res.locals.email == 'mas.adisetiawan@gmail.com'

      if (timezone) {
        try {
          let user = await Users.findOne({ uid: decodedToken.uid }).exec();
          if (user && user.timezone != timezone) {
            user.timezone = timezone;
            await user.save();
          }
        } catch (error) {
          console.log('setTimezone middleware error', error);
        }
      }

      next()
    }).catch((error) => {
      res.status(401).json({
        ...error.errorInfo,
        authorized: false
      })

      res.end()
    })
  } else {
    res.status(400).json({
      authorized: false,
      message: 'No token provided!'
    })
  }
}

module.exports = firebaseApi