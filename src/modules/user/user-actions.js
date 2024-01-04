const mongoose = require('mongoose');
const UserActions = require("../../models/user-actions");
const Bots = require("../../models/bots");
const Setups = require('./setups.js');
const AdvancedSetups = require("../../models/advanced-setups")
const BotsInactive = require("../../models/bots-inactive");
const UtilTrades = require("../../utils/trades");
const grpcUtil = require("../../utils/grpc");


exports.create = async (req, res, callback) => {
  try {
    console.log('create-action');
    console.log(req);
    let query = {
      ref: req.id ? mongoose.Types.ObjectId(req.id) : null,
      user_id: res.locals.uid,
      action: req.action ? req.action : null,
      status: req.status ? req.status : null,
      message: req.message ? req.action : null,
      details: req.details
    }

    console.log('query', query);

    let execute = await UserActions.create(query);
    return callback({
      success: true,
      msg: "Ok"

    })
  }
  catch (error) {
    return callback({
      success: false,
      msg: error
    })
  }
}

exports.setAction = async (req, res, callback) => {
  console.log('setAction');
  console.log('query', req.query);
  console.log('body', req.body);

  try {
    const AVAILABLE_ACTION = ['averaging', 'force_sell', 'paused', 'blacklisted', 'continue', 'delete']; //MAKE SURE TO EDIT THE MODELS ASWELL
    let query = {};
    let market = req.query.market ? req.query.market : 'spot' 

    if (!req.body.key) throw "Couldn't find any key action";

    query._id = req.query.id ? mongoose.Types.ObjectId(req.query.id) : null;
    if (!query._id) throw "Couldn't find bot id";

    let key = AVAILABLE_ACTION.indexOf(req.body.key);
    if (key < 0) throw "Current update key is not allowed";

    let keyToUpdate = req.body.key ? req.body.key : null;
    if (!keyToUpdate) throw "Couldn't find key to update";

    let update = {};
    update[req.body.key] = "value" in req.body ? req.body.value : true;

    const object_id = req.query.id ? req.query.id : null;
    const user_id = res.locals.uid ? res.locals.uid : null;
    let q = { object_id, user_id };

    console.log('action-q', q);

    switch (keyToUpdate) {
      case 'force_sell':
        if (market == 'spot') {
          grpcUtil.clientBotService.ForceSell(q, (err, response) => {
            if (err) {
              console.log('err force sell', err);
              return callback({
                success: false,
                msg: err
              })
            } else {
              return callback({
                success: true,
                data: response
              })
            }
          })
          break;
        }
        else {
          grpcUtil.clientBotService.FuturesForceSell(q, (err, response) => {
            if (err) {
              console.log('err force sell', err);
              return callback({
                success: false,
                msg: err
              })
            } else {
              return callback({
                success: true,
                data: response
              })
            }
          })
          break;
        }
      case 'paused':
        if (market == 'spot') {
          grpcUtil.clientBotService.PauseBot(q, (err, response) => {
            if (err) {
              console.log('err paused', err);
              return callback({
                success: false,
                msg: err
              })
            } else {
              return callback({
                success: true,
                data: response
              })
            }
          })
          break;
         } 
        else {
          grpcUtil.clientBotService.FuturesPauseBot(q, (err, response) => {
            if (err) {
              console.log('err paused', err);
              return callback({
                success: false,
                msg: err
              })
            } else {
              return callback({
                success: true,
                data: response
              })
            }
          })
          break;
        }

      case 'continue':
        if (market == 'spot') { 
          grpcUtil.clientBotService.ContinueBot(q, (err, response) => {
            if (err) {
              console.log('err continue', err);
              return callback({
                success: false,
                msg: err
              })
              // })
            } else {
              return callback({
                success: true,
                data: response
              })
            }
          })
          break;
        }
        else {
          grpcUtil.clientBotService.FuturesContinueBot(q, (err, response) => {
            if (err) {
              console.log('err continue', err);
              return callback({
                success: false,
                msg: err
              })
              // })
            } else {
              return callback({
                success: true,
                data: response
              })
            }
          })
          break;
        }
        
      case 'delete':
        if (market === 'spot') { 
          const update_token_exceptions = req.body.token_exception ? req.body.token_exception : null;
          q.update_token_exceptions = update_token_exceptions;
          grpcUtil.clientBotService.DeleteBot(q, (err, response) => {
            if (err) {
              console.log('err delete', err);
              return callback({
                success: false,
                msg: err
              })
            } else {
              return callback({
                success: true,
                data: response
              })
            }
          })
          break;
        }
        else {
          const update_token_exceptions = req.body.token_exception ? req.body.token_exception : null;
          q.update_token_exceptions = update_token_exceptions;
          grpcUtil.clientBotService.FuturesContinueBot(q, (err, response) => {
            if (err) {
              console.log('err delete', err);
              return callback({
                success: false,
                msg: err
              })
            } else {
              return callback({
                success: true,
                data: response
              })
            }
          })
          break;
        }
      default:
        return callback({
          success: false,
          msg: ""
        })
    }
  } catch (error) {
    console.log('error', error);
    return callback({
      success: false,
      msg: error
    })
  }

}

exports.setAnalysis = async (req, res, callback) => {
  try {
    let query = {};
    query._id = req.query.id ? mongoose.Types.ObjectId(req.query.id) : null;
    if (!query._id) throw "Couldn't find bot id";
    let update = req.body;
    console.log('query', query);
    console.log('update', update);
    const execute = await Bots.findOneAndUpdate(query, update);
    console.log('execute', execute);

    return callback({
      success: true,
      data: execute
    })

  } catch (error) {
    return callback({
      success: false,
      msg: error
    })
  }
}

exports.deleteInactiveAdvancedBot = async (req, res, callback) => {
  try {
    console.log('delete inactive advanced bot');
    console.log(req.query);
    const id = mongoose.Types.ObjectId(req.query.id);
    const user_id = res.locals.uid ? res.locals.uid : null;
    if (!user_id) {
      return callback({ error: true, message: "Couldn't find user ID" })
    }

    const query = { _id: id };

    let q = {};
    q.object_id = req.query.id;
    q.user_id = user_id;
    q.update_token_exceptions = false
    console.log('inactive advanced bot delete q', q)
    grpcUtil.clientBotService.DeleteBot(q, (err, response) => {
      if (err) {
        console.log('err client-user-balance', err);
        return callback({
          success: false,
          error_code: err.code,
          error: err.details,
        })
      } else {
        console.log('res advanced bot delete', response);
        return callback({
          success: true,
          data: response
        })
        }
    })
  } catch (error) {
    return callback({
      error: true,
      message: error
    })
  }
}
exports.find = async (req, res, callback) => {
  try {
    let query = {};
    if (req) {
      for (let key in req) {

      }
    }
    let execute = await UserActions.find(query)
    return callback({
      success: true,
      data: execute
    })
  } catch (error) {
    return callback({
      success: false,
      msg: error
    })
  }
}


// FUTURES
exports.deleteInactiveFuturesBot = async (req, res, callback) => {
  try {
    console.log('delete inactive  bot');
    const id = mongoose.Types.ObjectId(req.query.id);
    const user_id = res.locals.uid ? res.locals.uid : null;
    if (!user_id) {
      return callback({ error: true, message: "Couldn't find user ID" })
    }
    const query = { _id: id };
    let q = {};
    q.object_id = req.query.id;
    q.user_id = user_id;
    q.update_token_exceptions = false
    console.log('futures advanced bot delete q', q)
    grpcUtil.clientBotService.FuturesDeleteBot(q, (err, response) => {
      if (err) {
        console.log('err delete futures bot', err);
        return callback({
          success: false,
          error_code: err.code,
          error: err.details,
        })
      } else {
        console.log('res delete futures bot', response);
        return callback({
          success: true,
          data: response
        })
      }
    })
  } catch (error) {
    return callback({
      error: true,
      message: error
    })
  }
}