const Bots = require("../models/bots");

exports.checkSymbol = (params, locals) => {
  return new Promise(async (resolve, reject) => {
    console.log('checkSymbol')
    try {
      // check if symbol already exist in advanced bots
      let query = {
        user_id: locals.uid,
        symbol: params.symbol,
        exchange: params.exchange.toLowerCase().includes('demo') ? 'demo' : params.exchange.toLowerCase(),
        type: { $ne: 'AUTOMATED' },
        paused: false
      }

      console.log('query', query);
      let botCount = await Bots.where(query).countDocuments();
      console.log('botCount', botCount);

      if (botCount > 0) {
        return resolve({
          success: true,
          allowed: false
        })
      } else {
        return resolve({
          success: true,
          allowed: true
        })
      }
    } catch (error) {
      console.log('error bots allowance', error);
      reject(error)
    }
  })
}

exports.checkAllowance = (params, locals) => {
  return new Promise(async (resolve, reject) => {
    console.log('checkAllowance')
    try {
      let query = {
        user_id: locals.uid,
        exchange: params.exchange.toLowerCase().includes('demo') ? 'demo' : params.exchange.toLowerCase(),
        type: params.target == 'AUTOMATED' ? 'AUTOMATED' : { $ne: 'AUTOMATED' }
      }

      if (params.target) {
        if (params.target == 'ADVANCED') {
          query.type = { $ne: "AUTOMATED" }
          query.paused = { $ne: true }
        } else {
          query.type = params.target;
          query.paused = { $ne: true }
        }
      } else {
        query.type = { $eq: "AUTOMATED" }
      }

      console.log('query', query);
      let botCount = await Bots.where(query).countDocuments();
      console.log('botCount', botCount);

      if (botCount > 0) {
        return resolve({
          success: true,
          allowed: false
        })
      } else {
        return resolve({
          success: true,
          allowed: true
        })
      }
    } catch (error) {
      console.log('error bots allowance', error);
      reject(error)
    }
  })
}