const Mailjet = require('node-mailjet');

const mailjet = new Mailjet({
  apiKey: process.env.MAILJET_PUBLIC_KEY || 'fe44a210a392e87c4f822864797d49c1',
  apiSecret: process.env.MAILJET_PRIVATE_KEY || '9d6331a5b6cfd52595c1c0756e57fde9'
});

module.exports = mailjet