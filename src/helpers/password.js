const crypto = require('crypto')
const appConfig = require('../config/app')

let config = {
  hashBytes: 32,
  iterations: 29000,
  algo: 'sha256',
  encoding: 'base64'
}

/**
 * Format base64 string
 * 
 * @param {string} base64String Base64 standard string
 */
const base64format = (base64String) => {
  return base64String.replace(/=/g, '').replace(/\+/g, '.')
}

/**
 * Generate password
 * 
 * @param {string} password Decrypted string of password
 * @param {string} salt Unique chars
 */
const generate = (password, salt) => {
  const encodedSalt = base64format(Buffer.from(salt, 'utf-8').toString(config.encoding))
  const hash = crypto.pbkdf2Sync(
    password,
    salt,
    config.iterations,
    config.hashBytes,
    config.algo
  )
  
  // returning formated string
  return `$pbkdf2-${config.algo}$${config.iterations}$${encodedSalt}$${base64format(hash.toString(config.encoding))}`
}

/**
 * Verify password
 * 
 * @param {string} password Decrypted string of password
 * @param {string} format Encrypted string of password
 */
const verify = (password, format) => {
  const parts = format.split('$')
  const iterations = +parts[2]
  const algo = parts[1].split('-')[1]
  const hash = crypto.pbkdf2Sync(
    password,
    Buffer.from(parts[3].replace(/\./g, '+') + '='.repeat(parts[3].length % 3),
    config.encoding),
    iterations,
    config.hashBytes, algo
  ).toString(config.encoding)

  return parts[4] == base64format(hash)
}

/**
 * Generate random password
 */
const generateRandomPassword = () => {
  const charSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let randomString = ''
  
  for (let i = 0; i < appConfig.password.length; i++) {
    const randomPoz = Math.floor(Math.random() * charSet.length)
    randomString += charSet.substring(randomPoz, randomPoz + 1)
  }
  
  return randomString
}

module.exports = { generate, verify, generateRandomPassword }