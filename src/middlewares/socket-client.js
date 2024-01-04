const client = (socket, next) => {
  const authToken = socket.handshake.auth.token
  
  admin.auth().verifyIdToken(authToken).then((claims) => {
    socket.locals = {
      email: claims.email,
      uid: claims.uid,
      subscription: claims.subscription,
      trial: claims.trial
    }

    next()
  }).catch((error) => {
    console.log(error.message)
    next(new Error('Unauthorized client'))
  })
}

module.exports = client