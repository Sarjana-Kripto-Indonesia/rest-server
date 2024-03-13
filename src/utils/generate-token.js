const { randomBytes } = require("crypto");
const moment = require("moment")
const UserToken = require("../models/user-token");

async function generateToken(user_id, type = 'user-verification') {
  const buffer = randomBytes(48)
  const token = buffer.toString('hex');
  const expires_at = moment().add(3600, 'seconds').toISOString()


  await UserToken.create({
    user_id,
    type,
    token,
    expires_at
  })

  return token;
}

module.exports = generateToken