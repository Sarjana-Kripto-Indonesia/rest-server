const redis = require('../config/redis')

const initialize = async (symbol, callback) => {
  const sub = redis.duplicate()
  await sub.connect()
  await sub.subscribe(symbol.toString(), (message) => {
    let result = JSON.parse(message)
    let currentPrice = parseFloat(result.k.c)

    callback(currentPrice)
  })
}

module.exports = {
  initialize
}