const Bots = require("../../models/bots");
const BotsInactive = require("../../models/bots-inactive");
const UtilTrades = require("../../utils/trades");
const UtilBotsAllowance = require("../../utils/bots-allowance");
const mongoose = require('mongoose');
const grpcUtil = require("../../utils/grpc");

exports.find = async (req, res, callback) => {
  try {
    console.log('/user/bot find');
    let uid = res.locals.uid;
    let controller_id = req.query.controller_id;
    let execute = await Bots.find({ user_id: uid, controller_id: controller_id });
    return callback({
      success: true,
      data: execute
    })
  }
  catch (error) {
    return callback({
      success: false,
      msg: error
    })
  }
}

exports.findOne = async (req, res, callback) => {
  try {
    console.log('/user/bot find one');
    let uid = res.locals.uid;
    const id = req.query.id ? mongoose.Types.ObjectId(req.query.id) : null;
    if (!id) {
      return callback({
        success: false,
        data: "Couldn't find any ID"
      })
    }
    let q = { user_id: uid, _id: id }
    console.log('q', q);

    // grpcUtil.clientBotService.GetBotsBySetupId(q, (err, result) => { 
    //   if (err) {
    //     console.log('error find active position detail', err);
    //   } else {
    //     console.log(result);
    //   }
    // })
    
    let execute = await Bots.findOne(q);
    console.log(execute);
    let totalAmount = UtilTrades.calculateAmount(execute.positions);
    let totalQuantity = UtilTrades.calculateQuantity(execute.positions);
    let totalStep = UtilTrades.calculateStep(execute.positions);
    let totalBuy = UtilTrades.calculateBuy(execute.positions);

    Promise.all([totalAmount, totalQuantity, totalStep, totalBuy])
      .then(([totalAmount, totalQuantity, totalStep, totalBuy]) => {
        let average = totalAmount / totalQuantity;
        execute = { ...execute._doc, total_amount: totalAmount, total_quantity: totalQuantity, average, total_buy_amount: totalBuy, total_step: totalStep };
        return callback({
          success: true,
          data: execute
        })
      });
  } catch (error) {
    console.log(error);
    return callback({
      success: false,
      msg: "Couldn't find position detail!"
    })
  }
}

exports.findByUser = async (params, callback) => {
  try {
    console.log('params findByUser', params);
    let query = params;
    let sorting = {};
    if (params.symbol) {
      query.symbol = params.symbol
    }

    if (params.sorting) {
      let sortingParam = params.sorting;
      for (let key in sortingParam) {
        sorting[key] = sortingParam[key] == "ascending" ? 1 : -1
      }
    }

    let execute;
    if (query.status == "ACTIVE") {
      delete query.status;
      execute = await Bots.find(query).sort(sorting);
    } else {
      delete query.status;
      execute = await BotsInactive.find(query).sort(sorting);
    }


    let tempPair = [];
    return callback({
      success: true,
      data: execute,
      pairs: tempPair ? tempPair : []
    })
  } catch (error) {
    return callback({
      error: true,
      message: error
    })
  }
}


exports.availablePair = (params) => {
  return new Promise(async (resolve, reject) => {
    try {
      console.log(params);
      const availablePair = await Bots.find({ exchange: params.exchange }).distinct('symbol');
      resolve(availablePair)
    } catch (error) {
      reject(error);
    }
  })
}

exports.checkSymbol = async (params, res, callback) => {
  try {
    console.log('Check creating bot allowance', params);
    let user_id = res.locals.uid ? res.locals.uid : null;
    let symbol = params.symbol ? params.symbol : null;
    let exchange = params.exchange ? params.exchange : null;
    if (!user_id) {
      return callback({ error: true, message: "Couldnt't find user ID" })
    } else if (!symbol || !exchange) {
      return callback({ error: true, message: "Parameter is invalid" })
    }
    let check = await UtilBotsAllowance.checkSymbol({ symbol, exchange }, res.locals)
    return callback(check)
  } catch (error) {
    console.log(error);
    return callback({
      error: true,
      message: error
    })
  }
}

exports.checkAllowance = async (params, res, callback) => {
  try {
    let checkExistance = await UtilBotsAllowance.checkAllowance({ exchange: params.exchange, target: params.target }, res.locals);
    return callback(checkExistance)
  } catch (error) {
    console.log(error);
    return callback({
      error: true,
      message: error
    })
  }
}