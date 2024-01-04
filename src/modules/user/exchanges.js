const mongoose = require('mongoose');
const Exchanges = require("../../models/exchanges")
const fernet = require('fernet');
let secret = new fernet.Secret(process.env.FERNET_SECRET);
const grpcUtil = require("../../utils/grpc");

exports.create = async (req, res, callback) => {
  try {
    console.log('create-exchange');
    let uid = res.locals.uid;
    let encryptedApi = req.api_key;
    let encryptedSecret = req.secret_key;
    let encryptedPassphrase = req.passphrase;
    let q = {
      exchange: req.exchange_name,
      user_id: uid,
      api_key: encryptedApi,
      secret_key: encryptedSecret,
      passphrase: encryptedPassphrase
    }
    grpcUtil.clientExchangeService.SaveAPIKeys(q, (err, response) => {
      if (err) {
        console.log(err)
        return callback({
          success: false,
          error_code: err.code,
          error: err.details,
        })
      } else {
        console.log(response)
        return callback({
          success: true,
          data: response
        })
      }
    })
  }
  catch (error) {
    return callback({
      success: false,
      msg: error
    })
  }
}

exports.update = async (req, res, callback) => {
  console.log('exchange-update body', req.body)
  try {
    const id = req.query.id
    if (!id) {
      return callback({
        success: false,
        msg: "Exchange ID is not valid or not exist!"
      })
    }

    let api_key = req.body.api_key ? req.body.api_key : '';
    let secret_key = req.body.secret_key ? req.body.secret_key : '';
    let passphrase = req.body.passphrase ? req.body.passphrase : '';

    let q = {
      id,
      user_id: res.locals.uid,
      api_key,
      secret_key,
      passphrase
    }

    console.log('q', q);

    grpcUtil.clientExchangeService.UpdateAPIKeys(q, (err, response) => {
      if (err) {
        console.log(err)
        return callback({
          success: false,
          error_code: err.code,
          error: err.details,
        })
      } else {
        console.log(response)
        return callback({
          success: true,
          data: response
        })
      }
    })
  }
  catch (error) {
    return callback({
      success: false,
      msg: error
    })
  }
}

exports.find = async (req, res, callback) => {
  try {
    let uid = res.locals.uid;
    let q = { user_id: uid };
    grpcUtil.clientExchangeService.GetExchanges(q, (err, response) => {
      if (err) {
        console.log('error get exchange', err)
        if (err.error == "Couldn't find any exchange") {
          return callback({
            success: true,
            data: []
          })
        } else {
          return callback({
            success: false,
            error_code: err.code,
            error: err.details,
          })
        }
      } else {
        return callback({
          success: true,
          data: response.exchanges
        })
      }
    })
  } catch (error) {
    return callback({
      success: false,
      msg: error
    })
  }
}

exports.findOne = async (req, res, callback) => {
  try {
    let uid = res.locals.uid;
    let exchange_name = req.exchange_name ? req.exchange_name : null;
    let execute = await Exchanges.findOne({ user_id: uid, exchange_name })
    if (execute) {
      return callback({
        success: true,
        data: execute
      })
    } else {
      return callback({
        success: false,
        msg: "Couldn't find any exchange setup"
      });
    }
  }
  catch (error) {
    return callback({
      success: false,
      msg: "Couldn't find any exchange setup"
    })
  }
}

exports.delete = async (req, res, callback) => {
  try {
    console.log("DELETE EXCHANGE");
    console.log(req.query.id);
    // const id = mongoose.Types.ObjectId(req.query.id);
    const id = req.query.id ? req.query.id : null;
    if (!id) {
      return callback({
        success: false,
        msg: "Exchange ID is not valid or not exist!"
      })
    }
    const query = { id: id, user_id: res.locals.uid };
    console.log(query);
    grpcUtil.clientExchangeService.DeleteAPIKeys(query, (err, response) => {
      console.log('err', err)
      console.log('response', response)
      if (err) {
        return callback({
          success: false,
          error_code: err.code,
          error: err.details,
        })
      } else {
        return callback({
          success: true,
          data: response
        })
      }
    })
  }
  catch (error) {
    return callback({
      success: false,
      msg: error
    })
  }
}

exports.createFutures = async (req, res, callback) => {
  console.log("CREATE EXCHANGE FUTURES", req);
  try {
    let uid = res.locals.uid;
    let encryptedApi = req.api_key;
    let encryptedSecret = req.secret_key;
    let encryptedPassphrase = req.passphrase;
    let q = {
      exchange: req.exchange_name,
      user_id: uid,
      api_key: encryptedApi,
      secret_key: encryptedSecret,
      passphrase: encryptedPassphrase
    }
    grpcUtil.clientExchangeService.FuturesSaveAPIKeys(q, (err, response) => {
      if (err) {
        console.log(err)
        return callback({
          success: false,
          error_code: err.code,
          error: err.details,
        })
      } else {
        console.log(response)
        return callback({
          success: true,
          data: response
        })
      }
    })
  }
  catch (error) {
    return callback({
      success: false,
      msg: error
    })
  }
}

exports.updateFutures = async (req, res, callback) => {
  console.log("UPDATE EXCHANGE FUTURES", req.body);
  try {
    const id = req.query.id
    if (!id) {
      return callback({
        success: false,
        msg: "Exchange ID is not valid or not exist!"
      })
    }

    let api_key = req.body.api_key ? req.body.api_key : '';
    let secret_key = req.body.secret_key ? req.body.secret_key : '';
    let passphrase = req.body.passphrase ? req.body.passphrase : '';

    let q = {
      id,
      user_id: res.locals.uid,
      api_key,
      secret_key,
      passphrase
    }

    console.log('q', q);

    grpcUtil.clientExchangeService.FuturesUpdateAPIKeys(q, (err, response) => {
      if (err) {
        console.log(err)
        return callback({
          success: false,
          error_code: err.code,
          error: err.details,
        })
      } else {
        console.log(response)
        return callback({
          success: true,
          data: response
        })
      }
    })
  }
  catch (error) {
    return callback({
      success: false,
      msg: error
    })
  }
}
exports.findFutures = async (req, res, callback) => {
  console.log("FIND EXCHANGE FUTURES");
  try {
    let uid = res.locals.uid;
    let q = { user_id: uid };
    grpcUtil.clientExchangeService.FuturesGetExchanges(q, (err, response) => {
      if (err) {
        console.log('error get exchange', err)
        if (err.error == "Couldn't find any exchange") {
          return callback({
            success: true,
            data: []
          })
        } else {
          return callback({
            success: false,
            error_code: err.code,
            error: err.details,
          })
        }
      } else {
        return callback({
          success: true,
          data: response.exchanges
        })
      }
    })
  } catch (error) {
    return callback({
      success: false,
      msg: error
    })
  }
}

exports.deleteFutures = async (req, res, callback) => {
  try {
    console.log("DELETE EXCHANGE FUTURES");
    console.log(req.query.id);
    // const id = mongoose.Types.ObjectId(req.query.id);
    const id = req.query.id ? req.query.id : null;
    if (!id) {
      return callback({
        success: false,
        msg: "Exchange ID is not valid or not exist!"
      })
    }
    const query = { id: id, user_id: res.locals.uid };
    console.log(query);
    grpcUtil.clientExchangeService.FuturesDeleteAPIKeys(query, (err, response) => {
      console.log('err', err)
      console.log('response', response)
      if (err) {
        return callback({
          success: false,
          error_code: err.code,
          error: err.details,
        })
      } else {
        return callback({
          success: true,
          data: response
        })
      }
    })
  }
  catch (error) {
    return callback({
      success: false,
      msg: error
    })
  }
}

