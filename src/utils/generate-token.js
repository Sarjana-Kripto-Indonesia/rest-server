const { randomBytes } = require("crypto");
const moment = require("moment")
const UserToken = require("../models/user-token");

async function generateToken(user_id, type = 'user-verification', lifetime_in_seconds = 3600) {
  const buffer = randomBytes(48)
  const token = buffer.toString('hex');
  const expires_at = moment().add(lifetime_in_seconds, 'seconds').toISOString()


  await UserToken.create({
    user_id,
    type,
    token,
    expires_at
  })

  return token;
}

module.exports = generateToken