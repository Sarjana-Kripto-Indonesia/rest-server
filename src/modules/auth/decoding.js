
const jwt = require('jsonwebtoken');
const secretKey = 'thisIsOurSecret'; // Replace with your actual secret key
const Users = require('../../models/users');

const determineBypass = (currentPath, method) => {
  let isBypass = false

  if (method !== 'GET') return false

  // /courses
  if (currentPath.length == 2 && currentPath[1].includes('courses')) {
    isBypass = true
  }

  // /courses/detail
  if (currentPath.length == 4 && currentPath[1].includes('courses') && currentPath[2].includes('detail')) {
    isBypass = true
  }

  // /courses/review
  if ((currentPath.length == 4 || currentPath.length == 3) && currentPath[1].includes('courses') && currentPath[2].includes('review')) {
    isBypass = true
  }

  return isBypass
}

const decodeSessionTokenMiddleware = async (req, res, next) => {
  let currentPath = req.originalUrl.split("/")
  const method = req.method
  const isBypass = determineBypass(currentPath, method)
  const sessionToken = req.headers.authorization && req.headers.authorization.split(' ')[1];

  if (sessionToken) {
    try {
      const decoded = jwt.verify(sessionToken, secretKey);
      req.user = decoded;

      const user = await Users.findOne({ email: req.user.email }).select('-password').exec();
      res.locals.user = user

      next();
    } catch (error) {
      if (isBypass) return next()
      // Handle token verification error
      console.error(error);
      return res.status(401).json({ message: 'Invalid session token' });
    }
  } else {
    if (isBypass) return next()
    return res.status(401).json({ message: 'Session token not provided' });
  }
};

module.exports = { decodeSessionTokenMiddleware };