const mongoose = require('mongoose');
const Setups = require("../../models/setups")
const AdvancedSetups = require("../../models/advanced-setups")
const Exchanges = require("../../models/exchanges")
const TradeSessions = require("../../models/trade-session")
const Redis = require("../../services/redis")
const UtilBotsAllowance = require("../../utils/bots-allowance");
const UtilTrades = require("../../utils/trades");
const grpcUtil = require("../../utils/grpc");




// START OF AUTOMATED BOTS
exports.create = async (req, res, callback) => {
  try {
    console.log('create-bot');
    // console.log(req);
    const uid = res.locals.uid;
    // Check if there's the same bot on the same exchange
    let checkExistance = await UtilBotsAllowance.checkAllowance({ exchange: req.selected_exchange, target: 'ADVANCED' }, res.locals);
    if (!checkExistance.allowed) {
      return callback({
        error: true,
        message: `Automated Bot and Advance Bot cannot be used simultaneously at the same exchange`
      })
    }

    // normalize the steps if there's string in it, convert to Float
    let normalizedSteps = [];
    let steps = req.strategy.style.steps;
    if (!steps) {
      return callback({
        error: true,
        message: `Steps is not accessible`
      })
    }

    normalizedSteps = steps.map((step, index) => ({
      step: index + 1,
      drop_rate: parseFloat(step.drop_rate),
      multiplier: parseFloat(step.multiplier),
      take_profit: parseFloat(step.take_profit),
      type: step.type
    }));

    req.strategy.style.steps = normalizedSteps;

    // WRITE BOTS SETUP
    let q = {};
    q.user_id = uid;
    // q.user_id = 'user_2';
    q.exchange = req.selected_exchange.toLowerCase();
    // q.exchange = 'demo';
    q.max_concurrent = req.strategy.max_concurrent_trading_pair;
    q.max_usdt = req.strategy.usdt_to_apply;
    q.usdt_per_order = req.strategy.usdt_per_order;
    q.min_trading_volume = req.analysis.minimum_trading_volume;
    q.token_exceptions = req.token_exceptions;
    q.indicator_condition = req.analysis.condition;
    q.indicators = req.analysis.indicators;
    q.style = {
      active: req.strategy.style.active,
      key: req.strategy.style.key,
      name: req.strategy.style.name,
      steps: req.strategy.style.steps
    }

    grpcUtil.clientSetupService.CreateAutomatedSetup(q, (err, response) => {
      if (err) {
        console.log('err create-bot', err);
        return callback({
          success: false,
          error_code: err.code,
          error: err.details,
        })
      } else {
        console.log('create bot', response);
        return callback({
          success: true,
          data: response
        })
      }
    });

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
    console.log('find-bot-setup');
    const uid = res.locals.uid ? res.locals.uid : null;
    const query = { user_id: uid };
    console.log(query)

    if (!uid) {
      return callback({
        success: false,
        msg: "User ID not Defined"
      });
    }

    let q = {};
    q.user_id = uid
    console.log('find-bot-setup q', q);
    grpcUtil.clientSetupService.GetAllAutomatedSetups(q, (err, response) => {
      if (err) {
        console.log('err find-bot', err);
        return callback({
          success: false,
          error_code: err.code,
          error: err.details,
        })
      } else {
        console.log('find bot', response);
        return callback({
          success: true,
          data: response.data
        })
      }
    });
  }
  catch (error) {
    return callback({
      success: false,
      msg: error
    })
  }
}

exports.update = async (req, res, callback) => {
  try {
    const uid = res.locals.uid;
    const id = mongoose.Types.ObjectId(req.query.id);
    const query = { _id: id };
    const update = req.body;
    console.log('query')
    console.log(query);


    // normalize the steps if there's string in it, convert to Float
    let normalizedSteps = [];
    if (update.strategy && update.strategy.style) {
      let steps = update.strategy.style.steps;
      if (!steps) {
        return callback({
          error: true,
          message: `Steps is not accessible`
        })
      }
      normalizedSteps = steps.map((step, index) => ({
        step: index + 1,
        drop_rate: parseFloat(step.drop_rate),
        multiplier: parseFloat(step.multiplier),
        take_profit: parseFloat(step.take_profit),
        type: step.type
      }));

      update.strategy.style.steps = normalizedSteps;
    }


    let q = {};
    q.user_id = uid;
    // q.user_id = 'user_2';
    console.log('update-bot-setup update', update);
    q.setup_id = req.query.setup_id ? req.query.setup_id : update.setup_id;
    q.update = {
      max_concurrent: parseInt(update.strategy.max_concurrent_trading_pair),
      max_usdt: parseInt(update.strategy.usdt_to_apply),
      usdt_per_order: parseInt(update.strategy.usdt_per_order),
      min_trading_volume: parseInt(update.analysis.minimum_trading_volume),
      token_exceptions: update.token_exceptions ? update.token_exceptions : [],
      indicator_condition: update.analysis.condition,
      indicators:update.analysis.indicators ? update.analysis.indicators : [],
      style:update.strategy.style
    };

    console.log('UPDATE-BOT-SETUP q',q)
    grpcUtil.clientSetupService.UpdateAutomatedSetup(q, (err, response) => {
      if (err) {
        console.log('err update-bot', err);
        return callback({
          success: false,
          error_code: err.code,
          error: err.details,
        })
      } else {
        console.log('update bot', response);
        return callback({
          success: true,
          data: response
        })
      }
    });
  }
  catch (error) {
    return callback({
      success: false,
      msg: error
    })
  }
}

exports.delete = async (req, res, callback) => {
  try {
    const uid = res.locals.uid ? res.locals.uid : null;
    let q = {};
    // q.user_id = 'user_2';
    q.user_id = uid;
    q.setup_id = req.query.setup_id;
    console.log("DELETE-BOT-SETUP", q);
    grpcUtil.clientSetupService.DeleteAutomatedSetup(q, (err, response) => {
      if (err) {
        console.log('err delete-bot', err);
        return callback({
          success: false,
          error_code: err.code,
          error: err.details,
        })
      } else {
        console.log('delete bot', response);
        return callback({
          success: true,
          data: response.data
        })
      }
    });
  }
  catch (error) {
    return callback({
      success: false,
      msg: error
    })
  }
}
// END OF AUTOMATED BOTS

// START OF ADVANCED BOTS
exports.createAdvanceSetup = async (req, res, callback) => {
  try {
    console.log('create-advanced-bot');
    const uid = res.locals.uid;

    // Check if there's the same bot on the same exchange
    let checkExistance = await UtilBotsAllowance.checkAllowance({ exchange: req.exchange, target: 'AUTOMATED' }, res.locals);
    if (!checkExistance.allowed) {
      return callback({
        error: true,
        message: `Automated Bot and Advance Bot cannot be used simultaneously at the same exchange`
      })
    }
    // Check specific symbol
    let checkSymbol = await UtilBotsAllowance.checkSymbol({symbol:req.symbol, exchange:req.exchange}, res.locals)
    if (!checkSymbol.allowed) {
      return callback({
        error: true,
        message: `${req.symbol} Bot is already exist, you can't create another one`
      })
    }

    // // Check is exchange exist
    // let checkExchange = await Exchanges.findOne({ user_id: uid, exchange_name: req.exchange }).exec();
    // if(!checkExchange){
    //   return callback({
    //     error: true,
    //     message: `${req.exchange} is not registered on your exchange`
    //   })
    // }

    // normalize the steps if there's string in it, convert to Float
    let normalizedSteps = [];
    let steps = req.strategy.steps;
    if (!steps) {
      return callback({
        error: true,
        message: `Steps is not accessible`
      })
    }

    normalizedSteps = steps.map((step, index) => ({
      step: index + 1,
      drop_rate: parseFloat(step.drop_rate),
      multiplier: parseFloat(step.multiplier),
      take_profit: parseFloat(step.take_profit),
      type: step.type
    }));


    req.strategy.steps = normalizedSteps;

    // WRITE BOTS SETUP
    let q = {};
    q.user_id = uid;
    // q.user_id = 'user_2';
    q.exchange = req.selected_exchange.toLowerCase();
    // q.exchange = 'demo';
    q.type = req.type;
    q.symbol = req.symbol;
    q.analysis = req.analysis;
    q.strategy = req.strategy;
    q.name = req.name;
    console.log('create-advanced-bot q', q);

    grpcUtil.clientSetupService.CreateAdvancedSetup(q, (err, response) => {
      if (err) {
        console.log('err create-advanced-bot', err);
        return callback({
          success: false,
          error_code: err.code,
          error: err.details,
        })
      } else {
        console.log('create advanced bot', response);
        return callback({
          success: true,
          data: response
        })
      }
    });
  }
  catch (error) {
    return callback({
      success: false,
      message: error
    })
  }
}

exports.getAdvanceSetup = async (req, res, callback) => {
  try {
    console.log('get-advance-setup');
    const uid = res.locals.uid ? res.locals.uid : null;
    const _id = req.query.id ? mongoose.Types.ObjectId(req.query.id) : null;
    const type = req.query.type ? req.query.type : null;



    if (!uid) {
      return callback({
        success: false,
        msg: "User ID not Defined"
      });
    }

    let query = { user_id: uid };
    if (_id) {
      query._id = _id;
    }

    // QUERY BY TYPE
    if (type) {
      query.type = type;
    } else {
      query.type = "ADVANCED";
    }

    let q = {};
    q.user_id = uid;
    // q.user_id = 'user_2';
    console.log('get-advance-setup q', q);
    grpcUtil.clientSetupService.GetAllAdvancedSetups(q, (err, response) => {
      if (err) {
        console.log('err create-advanced-bot', err);
        return callback({
          success: false,
          error_code: err.code,
          error: err.details,
        })
      } else {
        console.log('create advanced bot', response);
        return callback({
          success: true,
          data: response.data
        })
      }
    });
    // const execute = await AdvancedSetups.find(query);
    // console.log(execute);

    // return callback({
    //   success: true,
    //   data: execute
    // })
  }
  catch (error) {
    return callback({
      success: false,
      msg: error
    })
  }
}

exports.updateAdvanceBot = async (req, res, callback) => {
  try {
    console.log("update-advance-bot");
    const uid = res.locals.uid ? res.locals.uid : null;
    const _id = req.query.id ? mongoose.Types.ObjectId(req.query.id) : null;
    if (!_id) {
      return callback({ error: true, message: "Couldn't find setup ID!" });
    }

    if (!uid) {
      return callback({
        success: false,
        msg: "User ID not Defined"
      });
    }

    const query = { _id };
    const update = req.body;

    console.log('query')
    console.log(query);


    // normalize the steps if there's string in it, convert to Float
    let normalizedSteps = [];
    let steps = update.strategy.steps;
    if (!steps) {
      return callback({
        error: true,
        message: `Steps is not accessible`
      })
    }

    normalizedSteps = steps.map((step, index) => ({
      step: index + 1,
      drop_rate: parseFloat(step.drop_rate),
      multiplier: parseFloat(step.multiplier),
      take_profit: parseFloat(step.take_profit),
      type: step.type
    }));


    update.strategy.steps = normalizedSteps;

    console.log('update');
    console.log(update);
    let q = {};
    q.setup_id = req.query.setup_id;
    q.user_id = uid;
    q.analysis = update.analysis;
    q.strategy = update.strategy;
    q.name = update.name;
    console.log("update-advance-bot q", q);
    grpcUtil.clientSetupService.UpdateAdvancedSetup(q, (err, response) => {
      if (err) {
        console.log('err update-advanced-bot', err);
        return callback({
          success: false,
          error_code: err.code,
          error: err.details,
        })
      } else {
        console.log('update advanced bot', response);
        return callback({
          success: true,
          data: response
        })
      }
    });
  }
  catch (error) {
    console.log('error update advance bot', error)
    return callback({
      success: false,
      msg: error
    })
  }
}


exports.deleteAdvanceBot = async (req, res, callback) => {
  try {
    console.log("DELETE-advanced-bot");
    console.log(req);
    const uid = res.locals.uid ? res.locals.uid : null;
    const _id = req.query.id ? mongoose.Types.ObjectId(req.query.id) : null;
    if (!_id) {
      return callback({ error: true, message: "Couldn't find setup ID!" });
    }

    let q = {};
    q.user_id = uid;
    q.setup_id = req.query.setup_id;
    console.log("DELETE-advanced-bot q", q);
    grpcUtil.clientSetupService.DeleteAdvancedSetup(q, (err, response) => {
      if (err) {
        console.log('err update-bot', err);
        return callback({
          success: false,
          error_code: err.code,
          error: err.details,
        })
      } else {
        console.log('update bot', response);
        return callback({
          success: true,
          data: response
        })
      }
    });
  }
  catch (error) {
    console.log(error);
    return callback({
      success: false,
      msg: error
    })
  }
}
// END OF ADVANCED BOTS


// START OF FUTURES BOTS
exports.createFuturesSetup = async (req, res, callback) => {
  try {
    console.log('create-futures-bot');

    const user_id = res.locals.uid;
    if (!user_id) {
      return callback({
        success: false,
        message:"USER ID is not defined"
      })
    }
    // WRITE BOTS SETUP
    let q = {};
    q.user_id = user_id;
    q.exchange = req.selected_exchange.toLowerCase();
    q.type = req.type;
    q.symbol = req.symbol;
    q.analysis = req.analysis;
    q.strategy = req.strategy;
    q.name = req.name;
    console.log('create-futures-bot q', q);

    grpcUtil.clientSetupService.CreateFuturesSetup(q, (err, response) => {
      if (err) {
        console.log('err create-futures-bot', err);
        return callback({
          success: false,
          error_code: err.code,
          error: err.details,
        })
      } else {
        console.log('create futures bot', response);
        return callback({
          success: true,
          data: response
        })
      }
    });
  }
  catch (error) {
    return callback({
      success: false,
      message: error
    })
  }
}

exports.findAllFutures = async (req, res, callback) => {
  try {
    console.log('findAllFuturesBot');
    const user_id = res.locals.uid ? res.locals.uid : null;

    if (!user_id) {
      return callback({
        success: false,
        msg: "User ID not Defined"
      });
    }

    let q = {user_id};
    console.log('get-all futures bot', q);
    grpcUtil.clientSetupService.GetAllFuturesSetups(q, (err, response) => {
      if (err) {
        console.log('err get-all futures bot', err);
        return callback({
          success: false,
          error_code: err.code,
          error: err.details,
        })
      } else {
        console.log('create get-all futures bot', response);
        return callback({
          success: true,
          data: response.data
        })
      }
    });
  }
  catch (error) {
    return callback({
      success: false,
      msg: error
    })
  }
}

exports.updateFuturesSetup = async (req, res, callback) => {
  try {
    console.log("update-futures-bot");
    const setup_id = req.query.id ? mongoose.Types.ObjectId(req.query.id) : null;
    const user_id = res.locals.uid ? res.locals.uid : null;
    const analysis = req.body.analysis ? req.body.analysis : null;
    const strategy = req.body.strategy ? req.body.strategy : null;
    const name = req.body.name ? req.body.name : '';
    if (!setup_id) {
      return callback({ error: true, message: "Couldn't find setup ID!" });
    }

    if (!user_id) {
      return callback({
        success: false,
        msg: "User ID not Defined"
      });
    }
    let q = { setup_id, user_id, analysis, strategy, name };
    
    console.log("update-futures-bot q", q);
    grpcUtil.clientSetupService.UpdateFuturesSetup(q, (err, response) => {
      if (err) {
        console.log('err update-advanced-bot', err);
        return callback({
          success: false,
          error_code: err.code,
          error: err.details,
        })
      } else {
        console.log('update advanced bot', response);
        return callback({
          success: true,
          data: response
        })
      }
    });
  }
  catch (error) {
    console.log('error update advance bot', error)
    return callback({
      success: false,
      msg: error
    })
  }
}


exports.deleteFuturesBot = async (req, res, callback) => {
  try {
    console.log("DELETE-futures-bot");
    const user_id = res.locals.uid ? res.locals.uid : null;
    const setup_id = req.query.id ? mongoose.Types.ObjectId(req.query.id) : null;

    if (!user_id) {
      return callback({
        success: false,
        msg: "User ID not Defined"
      });
    }

    if (!setup_id) {
      return callback({ error: true, message: "Couldn't find setup ID!" });
    }

    let q = { user_id, setup_id };
    
    console.log("DELETE-futures-bot q", q);
    grpcUtil.clientSetupService.DeleteFuturesSetup(q, (err, response) => {
      if (err) {
        console.log('err delete futures-bot', err);
        return callback({
          success: false,
          error_code: err.code,
          error: err.details,
        })
      } else {
        console.log('delete futures bot', response);
        return callback({
          success: true,
          data: response
        })
      }
    });
  }
  catch (error) {
    console.log(error);
    return callback({
      success: false,
      msg: error
    })
  }
}
// END OF FUTURES BOTS
