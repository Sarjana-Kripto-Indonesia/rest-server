const moment = require('moment')

/**
 * Generate referral code
 * 
 * @returns string
 */
const generateReferralCode = () => {
  const charSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let randomString = ''
  
  for (let i = 0; i < 6; i++) {
    const randomPos = Math.floor(Math.random() * charSet.length)
    randomString += charSet.substring(randomPos, randomPos + 1)
  }
  
  return randomString
}

const generatePromoCode = () => {
  const charSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let randomString = ''
  
  for (let i = 0; i < 6; i++) {
    const randomPos = Math.floor(Math.random() * charSet.length)
    randomString += charSet.substring(randomPos, randomPos + 1)
  }
  
  return randomString
}

/**
 * Generate invoice number(id)
 * 
 * @returns string
 */
const generateInvoiceId = () => {
  const charSet = '0123456789'
  let randomString = ''
  
  for (let i = 0; i < 6; i++) {
    const randomPos = Math.floor(Math.random() * charSet.length)
    randomString += charSet.substring(randomPos, randomPos + 1)
  }
  
  return `INV-${moment().format('YYYYMMDD')}-${randomString}`
}

const generateOtp = () => {
  const charSet = '0123456789'
  let randomString = ''
  
  for (let i = 0; i < 6; i++) {
    const randomPos = Math.floor(Math.random() * charSet.length)
    randomString += charSet.substring(randomPos, randomPos + 1)
  }
  
  return randomString
}

/**
 * This method used for generating the telegram session token
 * @returns string
 */
const generateTelegramToken = () => {
  const charSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let randomString = ''
  
  for (let i = 0; i < 32; i++) {
    const randomPos = Math.floor(Math.random() * charSet.length)
    randomString += charSet.substring(randomPos, randomPos + 1)
  }
  
  return randomString
}

module.exports = {
  generateInvoiceId,
  generateReferralCode,
  generatePromoCode,
  generateOtp,
  generateTelegramToken
}