const firebaseApi = (req, res, next) => {
  const authHeader = req.headers['authorization'] ? req.headers['authorization'].toString() : false

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const idToken = authHeader.substring(7, authHeader.length)
    
    admin.auth().verifyIdToken(idToken).then((decodedToken) => {
      if (decodedToken.email != 'adhy1702@gmail.com' || typeof(decodedToken.admin) == 'undefined' || !decodedToken.admin) {
        res.status(400).json({
          authorized: false,
          message: 'You\'re not admin'
        })
      } else {
        res.locals.email = decodedToken.email
        res.locals.uid = decodedToken.uid

        next()
      }
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