
const jwt = require('jsonwebtoken');
const secretKey = 'thisIsOurSecret'; // Replace with your actual secret key

const decodeSessionTokenMiddleware = (req, res, next) => {
  const sessionToken = req.headers.authorization && req.headers.authorization.split(' ')[1];

  if (sessionToken) {
    try {
      const decoded = jwt.verify(sessionToken, secretKey);
      req.user = decoded;
      console.log('DECODED!!!', decoded);
      next();
    } catch (error) {
      // Handle token verification error
      console.error(error);
      return res.status(401).json({ message: 'Invalid session token' });
    }
  } else {
    return res.status(401).json({ message: 'Session token not provided' });
  }
};

module.exports = { decodeSessionTokenMiddleware };