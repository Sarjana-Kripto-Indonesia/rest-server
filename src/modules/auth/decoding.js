
const jwt = require('jsonwebtoken');
const secretKey = 'thisIsOurSecret'; // Replace with your actual secret key
const Users = require('../../models/users');

const decodeSessionTokenMiddleware = async (req, res, next) => {
  let currentPath = req.originalUrl.split("/")

  const sessionToken = req.headers.authorization && req.headers.authorization.split(' ')[1];

  if (sessionToken) {
    try {
      const decoded = jwt.verify(sessionToken, secretKey);
      req.user = decoded;

      const user = await Users.findOne({ email:req.user.email }).select('-password').exec();
      res.locals.user = user
      
      next();
    } catch (error) {
      if (currentPath.length == 3 && currentPath[1] == 'courses') {
        next();
      }
      // Handle token verification error
      console.error(error);
      return res.status(401).json({ message: 'Invalid session token' });
    }
  } else {
    if (currentPath.length == 3 && currentPath[1] == 'courses') {
      next();
    } else {
      return res.status(401).json({ message: 'Session token not provided' });
    }
  }
};

module.exports = { decodeSessionTokenMiddleware };