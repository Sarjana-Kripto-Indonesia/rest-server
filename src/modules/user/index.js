const express = require('express');
const app = express.Router();
const { Worker } = require('worker_threads');
const controller = require('./controllers.js');
const Setups = require('./setups.js');
const Exchanges = require('./exchanges.js');
const Formulas = require('./formulas.js');
const Bots = require('./bots.js');
const TradingHistory = require('./trading-history.js');
const TradeSession = require('./trade-session.js');
const UserActions = require('./user-actions.js');
const UserStats = require('./user-stats.js');
const LoginHistories = require('./login-histories.js');
const Notifications = require('./notifications.js');
const { botApi } = require('../../services/bot-api');
const Users = require("../../models/users");

// utils
const grpcUtil = require("../../utils/grpc");
const { async } = require('@firebase/util');

app.get('/dev-connection-test', async (req, res) => {
  try {
    return res.status(200).json({ msg: "hello bitZ developers! have fun :)" })
  } catch (err) {
    console.log(err)
    return res.status(400).json({
      status: false,
      message: err
    })
  }
})

// START OF ADVANCED BOTS SETUP
app.post('/advanced-bot', async (req, res) => {
  console.log('advanced-bots');
  try {
    console.log('locals', res.locals);
    let isSubscribeActive = await Users.where({
      uid: res.locals.uid,
      'subscription.id': { $gt: 0 }
    }).countDocuments();
    console.log(isSubscribeActive);

    if (isSubscribeActive > 0) {
      Setups.createAdvanceSetup(req.body, res, function (reply) {
        // console.log(reply);
        if (reply.success) {
          res.status(200).json({ ...reply })
        } else {
          res.status(400).json({ error: true, message: reply.error, data:reply })
        }
      })
    } else {
      res.status(400).json({ error: true, message: "Your subscription is inactive!" })
    }
  } catch (error) {
    console.log(err);
    res.status(400).send(error);
  }
});

app.get('/advanced-bot', async (req, res) => {
  try {
    Setups.getAdvanceSetup(req, res, function (reply) {
      // console.log(reply);
      if (reply.success) {
        res.status(200).json({ success: true, data: reply.data })
      } else {
        res.status(400).json({ error: true, message: reply })
      }
    })
  } catch (err) {
    console.log(err)
    return res.status(400).json({
      status: false,
      message: err
    })
  }
})

app.delete('/advanced-bot', async (req, res) => {
  try {
    console.log('delete/advanced-bot');
    Setups.deleteAdvanceBot(req, res, function (reply) {
      if (reply.success) {
        res.status(200).json({ success: true, data: reply })
      } else {
        res.status(400).json({ error: true, message: reply })
      }
    })
  } catch (err) {
    return res.status(400).json({
      error: true,
      message: err
    })
  }
});

app.put('/advanced-bot', async (req, res) => {
  try {
    console.log('delete/advanced-bot');
    Setups.updateAdvanceBot(req, res, function (reply) {
      if (reply.success) {
        res.status(200).json({ success: true, data: reply })
      } else {
        res.status(400).json({ error: true, message: reply })
      }
    })
  } catch (err) {
    return res.status(400).json({
      error: true,
      message: err
    })
  }
});


// END OF ADVANCED BOTS SETUP
// START OF BOT SETUP
app.post('/bot', async (req, res) => {
  try {
    console.log('locals', res.locals);
    let isSubscribeActive = await Users.where({
      uid: res.locals.uid,
      'subscription.id': { $gt: 0 }
    }).countDocuments();
    console.log(isSubscribeActive);

    if (isSubscribeActive > 0) {
      Setups.create(req.body, res, function (reply) {
        if (reply.success) {
          res.status(200).json({ ok: true, data: reply })
        } else {
          res.status(400).json({ error: true, data: reply })
        }
      })
    } else {
      res.status(400).json({ error: true, message: "Your subscription is inactive!" })
    }
  } catch (error) {
    console.log(err);
    res.status(400).send(error);
  }
});

app.put('/bot', async (req, res) => {
  Setups.update(req, res, function (reply) {
    if (reply.success) {
      res.status(200).json({ ok: true, data: reply })
    } else {
      res.status(400).json({ error: true, data: reply })
    }
  })
});

app.delete('/bot', async (req, res) => {
  Setups.delete(req, res, function (reply) {
    if (reply.success) {
      res.status(200).json({ ok: true, data: reply })
    } else {
      res.status(400).json({ error: true, data: reply })
    }
  })
});


app.get('/bot', async (req, res) => {
  Setups.find(req.params, res, function (reply) {
    if (reply.success) {
      res.status(200).json(reply);
    } else {
      res.status(400).json({ error: true, data: reply })
    }
  })
});

app.get('/bot-user', async (req, res) => {
  console.log('(get) bot-user', req.query);
  const uid = res.locals.uid;
  const type = req.query.type ? req.query.type : null;
  const exchange = req.query.exchange ? req.query.exchange : '';
  const status = req.query.status ? req.query.status : "ACTIVE";
  let query = { user_id: uid };

  if (exchange) {
    query.exchange = exchange;
  }

  if (type) {
    if (type == 'ADVANCED') {
      query.type = { $ne: "AUTOMATED" }
      query.paused = { $ne: true }
    } else {
      query.type = type;
      query.paused = { $ne: true }
    }
  } else {
    query.type = { $eq: "AUTOMATED" }
  }

  query.status = status;
  /**
   * @param {setup_id, user_id}
   */

  let setupId = req.query.setup_id ? req.query.setup_id : null;
  if (type == 'AUTOMATED') {
    let q = { setup_id: setupId, user_id: uid }; //uncomment when deployed
    console.log('GetBotsBySetupId q', q)
    grpcUtil.clientBotService.GetBotsBySetupId(q, (err, response) => {
      if (err) {
        console.log('err client-user-balance', err);
        res.status(400).json({
          success: false,
          error_code: err.code,
          error: err.details,
        })
      } else {
        res.status(200).json({ data: response.bots, pairs: [] })
      }
    })
  } else {
    let paused = status == 'ACTIVE' ? false : true;
    let q = { user_id: uid, type, name: '', exchange, symbol: '', paused }; //uncomment when deployed
    console.log('GetBotsByFilters q', q)
    grpcUtil.clientBotService.GetBotsByFilters(q, (err, response) => {
      if (err) {
        console.log('err get bots by filter', err);
        res.status(400).json({
          success: false,
          error_code: err.code,
          error: err.details,
        })
      } else {
        res.status(200).json({ data: response.bots, pairs: [] })
      }
    })
  }
})

app.get('/bot-check-symbol', async (req, res) => {
  Bots.checkSymbol(req.query, res, function (reply) {
    if (reply.success) {
      res.status(200).json(reply);
    } else {
      res.status(400).json({ error: reply.error, message: reply.message })
    }
  })
})

app.get('/bot-check-allowance', async (req, res) => {
  Bots.checkAllowance(req.query, res, function (reply) {
    if (reply.success) {
      res.status(200).json(reply);
    } else {
      res.status(400).json({ error: reply.error, message: reply.message })
    }
  })
})
// END OF BOT SETUP

// START OF EXCHANGE
app.post('/exchange', async (req, res) => {
  try {
    console.log('locals', res.locals);
    let isSubscribeActive = await Users.where({
      uid: res.locals.uid,
      'subscription.id': { $gt: 0 }
    }).countDocuments();
    console.log(isSubscribeActive);

    if (isSubscribeActive > 0) {
      Exchanges.create(req.body, res, function (reply) {
        if (reply.success) {
          res.status(200).json({ ok: true })
        } else {
          res.status(400).json({ error: true, data: reply })
        }
      })
    } else {
      res.status(400).json({ error: true, message: "Your subscription is inactive!" })
    }
  } catch (error) {
    console.log(err);
    res.status(400).send(error);
  }

});
app.put('/exchange', async (req, res) => {
  Exchanges.update(req, res, function (reply) {
    console.log(reply);
    res.send({ ok: true })
  })
});
app.get('/exchange', async (req, res) => {
  console.log('exchange-get', req.params);
  Exchanges.find(req.params, res, function (reply) {
    if (reply.success) {
      res.status(200).json(reply);
    } else {
      res.status(400).json({ error: "Couldn't find any exchange" })
    }
  })
});

app.delete('/exchange', async (req, res) => {
  try {
    console.log('delete/exchange');
    Exchanges.delete(req, res, function (reply) {
      if (reply.success) {
        res.status(200).json({ success: true, data: reply })
      } else {
        res.status(400).json({ error: true, message: reply.message })
      }
    })
  } catch (err) {
    return res.status(400).json({
      error: true,
      message: err
    })
  }
});

app.get('/exchange-exist', async (req, res) => {
  Exchanges.findOne(req.query, res, function (reply) {
    if (reply.success) {
      res.status(200).json(reply);
    } else {
      res.status(400).json({ error: "Couldn't find any exchange" })
    }
  })
})
// END OF EXCHANGE

// START OF BOTS SETUP
app.get('/active-position', async (req, res) => {
  Bots.find(req, res, function (reply) {
    if (reply.success) {
      res.status(200).json(reply);
    } else {
      res.status(400).json(reply)
    }
  })
});
app.get('/active-position-detail', async (req, res) => {
  let market = req.query.market ? req.query.market : 'spot';
  let object_id = req.query.id ? req.query.id : null;
  let user_id = res.locals.uid ? res.locals.uid : null;
  if (!object_id) {
    res.status(400).json({
      error: true,
      message: 'Object ID is not defined'
    })
  }

  if (!user_id) { 
    res.status(400).json({
      error: true,
      message: 'User ID is not defined'
    })
  }
  
  let q = { object_id, user_id };
  if (market == 'spot') {
    grpcUtil.clientBotService.GetBotById(q, (err, response) => {
      console.log('response', response);
      if (err) {
        console.log('err client-user-balance', err);
        res.status(400).json({
          success: false,
          error_code: err.code,
          error: err.details,
        })
      } else {
        res.status(200).json({ data: response, pairs: [] })
      }
    })
  } else {
    grpcUtil.clientBotService.GetFuturesBotById(q, (err, response) => {
      console.log('response', response);
      if (err) {
        console.log('err client-user-balance', err);
        res.status(400).json({
          success: false,
          error_code: err.code,
          error: err.details,
        })
      } else {
        // console.log('GetBotsByFilters', response)
        res.status(200).json({ data: response, pairs: [] })
      }
    })
  }
});
app.get('/formula', async (req, res) => {
  Formulas.find(req.params, res, function (reply) {
    if (reply.success) {
      res.status(200).json(reply);
    } else {
      res.status(400).json(reply);
    }
  })
})
// END OF BOTS SETUP

// START OF TRADING HISTORY
app.get('/trading-history', async (req, res) => {
  TradingHistory.find(req, res, function (reply) {
    if (reply.success) {
      res.status(200).json(reply);
    } else {
      res.status(400).json(reply);
    }
  })
});
app.get('/chart', async (req, res) => {
  TradingHistory.chart(req, res, function (reply) {
    if (reply.success) {
      res.status(200).json(reply);
    } else {
      res.status(400).json(reply);
    }
  })
})

app.get('/profit', async (req, res) => {
  TradingHistory.profit(req, res, function (reply) {
    if (reply.success) {
      res.status(200).json(reply);
    } else {
      res.status(400).json(reply);
    }
  })
})



app.get('/profit-report', async (req, res) => {
  TradingHistory.profitReport(req, res, function (reply) {
    if (reply.success) {
      res.status(200).json(reply);
    } else {
      res.status(400).json(reply);
    }
  })
})

app.get('/profit-all-exchange', async (req, res) => {
  TradingHistory.profitAllExchange(req, res, function (reply) {
    if (reply.success) {
      res.status(200).json(reply);
    } else {
      res.status(400).json(reply);
    }
  });
})
// END OF TRADING HISTORY

// START OF TRADE SESSION
app.get('/deal', async (req, res) => {
  TradingHistory.dailyDeals(req, res, function (reply) {
    if (reply.success) {
      res.status(200).json(reply);
    } else {
      res.status(400).json(reply);
    }
  })
})
// END OF TRADE SESSION

// START OF USER STATS (BOT API PROXY)
app.post('/validate-user-exchange', async (req, res) => {
  UserStats.verifyExchangeParams(req.body, res, function (reply) {
    if (reply.success) {
      res.status(200).json(reply);
    } else {
      res.status(reply.statusCode).json(reply);
    }
  })
});

app.get('/available-tokens', async (req, res) => {
  UserStats.getAvailableToken(req, res, function (reply) {
    if (reply.success) {
      res.status(200).json(reply);
    } else {
      res.status(reply.statusCode).json(reply);
    }
  })
})

app.get('/user-exchange-balance', async (req, res) => {
  let exchange = req.query.exchange ? req.query.exchange.toLowerCase() : 'binance';
  let token = req.query.token ? req.query.token : null;
  let market = req.query.market ? req.query.market.toLowerCase() : 'spot';
  if (exchange.includes('demo')) {
    exchange = 'demo'
  }
  console.log('exchange', exchange);
  try {
    if (token) {
      let q = { exchange, user_id: res.locals.uid }
      // let q = { exchange:'demo', user_id: 'user_1' }
      if (market == 'spot') {
        grpcUtil.clientExchangeService.GetBalances(q, (err, response) => {
          if (err) {
            console.log('err client-user-balance spot', err);
            res.status(400).json({
              success: false,
              error_code: err.code,
              error: err.details,
            })
          } else {
            console.log(response)
            res.status(200).json({
              success: true,
              data: {
                free_usdt: response.free_usdt,
                equivalent_usdt: response.equivalent_usdt
              }
            })
          }
        }) 
      } else {
        grpcUtil.clientExchangeService.FuturesGetBalances(q, (err, response) => {
          if (err) {
            console.log('err client-user-balance futures', err);
            res.status(400).json({
              success: false,
              error_code: err.code,
              error: err.details,
            })
          } else {
            console.log(response)
            res.status(200).json({
              success: true,
              data: {
                free_usdt: response.free_usdt,
                equivalent_usdt: response.equivalent_usdt
              }
            })
          }
        })
      }
    } else {
      throw ({ message: "User token not available!" })
    }
  } catch (error) {
    console.log('catch', error);
    res.status(400).json({
      success: false,
      error: error
    })
  }
})

// END OF USER STATS (BOT API PROXY)

// START OF USING ACTIONS
app.put('/action', async (req, res) => {
  console.log('user-action');
  UserActions.setAction(req, res, function (reply) {
    console.log(reply);
    res.send(reply);
  })
});

app.put('/analysis', async (req, res) => {
  UserActions.setAnalysis(req, res, function (reply) {
    console.log(reply);
    res.send(reply);
  })
});
app.delete('/inactive-advanced-bot', async (req, res) => {
  try {
    UserActions.deleteInactiveAdvancedBot(req, res, function (reply) {
      if (reply.success) {
        res.status(200).json({ success: true, data: "Successfully Deleted" });
      } else {
        res.status(400).json(reply);
      }
    })
  } catch (error) {
    console.log('/inactive-advanced-bot error', error);
    res.status(400).json({ error: true })
  }
});

// END OF USING ACTIONS

// START OF LOGIN HISTORIES
app.post('/login-histories', async (req, res) => {
  // CHECK USER SUBSCRIPTION STATUS BEFORE CONTINUE
  try {
    console.log('locals', res.locals);
    let isSubscribeActive = await Users.where({
      uid: res.locals.uid,
      'subscription.id': { $gt: 0 }
    }).countDocuments();
    console.log(isSubscribeActive);

    if (isSubscribeActive > 0) {
      LoginHistories.create(req.body, res, function (reply) {
        if (reply.success) {
          res.status(200).json(reply);
        } else {
          res.status(400).json(reply);
        }
      })
    } else {
      res.status(400).json({ error: true, message: "Your subscription is inactive!" })
    }
  } catch (error) {
    console.log(err);
    res.status(400).send(error);
  }
})

app.get('/login-histories', async (req, res) => {
  LoginHistories.find(req, res, function (reply) {
    if (reply.success) {
      res.status(200).json(reply);
    } else {
      res.status(400).json(reply);
    }
  })
})
// END OF LOGIN HISTORIES

app.get('/controller', async (req, res) => {
  controller.getControllers(req, function (reply) {
    res.send(reply);
  })
})

// START OF NOTIFICATION
app.get('/user-notifications', async (req, res) => {
  Notifications.find(req, res, function (reply) {
    if (reply.success) {
      res.status(200).json(reply)
    } else {
      res.status(400).json(reply)
    }
  })
})
// END OF NOTIFICATION


// FUTURES EXCHANGE SETUP
app.post('/futures-exchange', async (req, res) => {
  try {
    let isSubscribeActive = await Users.where({
      uid: res.locals.uid,
      'subscription.id': { $gt: 0 }
    }).countDocuments();
    console.log(isSubscribeActive);

    if (isSubscribeActive > 0) {
      Exchanges.createFutures(req.body, res, function (reply) {
        if (reply.success) {
          res.status(200).json({ ok: true })
        } else {
          res.status(400).json({ error: true, data: reply })
        }
      })
    } else {
      res.status(400).json({ error: true, message: "Your subscription is inactive!" })
    }
  } catch (error) {
    console.log(err);
    res.status(400).send(error);
  }

});
app.put('/futures-exchange', async (req, res) => {
  Exchanges.updateFutures(req, res, function (reply) {
    console.log(reply);
    res.send({ ok: true })
  })
});
app.get('/futures-exchange', async (req, res) => {
  console.log('futures-exchange-get', req.params);
  Exchanges.findFutures(req.params, res, function (reply) {
    if (reply.success) {
      res.status(200).json(reply);
    } else {
      res.status(400).json({ error: "Couldn't find any exchange" })
    }
  })
});

app.delete('/futures-exchange', async (req, res) => {
  try {
    console.log('delete/futures-exchange');
    Exchanges.deleteFutures(req, res, function (reply) {
      if (reply.success) {
        res.status(200).json({ success: true, data: reply })
      } else {
        res.status(400).json({ error: true, message: reply.message })
      }
    })
  } catch (err) {
    return res.status(400).json({
      error: true,
      message: err
    })
  }
});

// FUTURES USER BOTS
app.get('/futures-bot-user', async (req, res) => { 
  console.log('(get) futures-bot-user', req.query);
  try {
    const user_id = res.locals.uid;
    const type = req.query.type ? req.query.type : null;
    const name = req.query.name ? req.query.name : null;
    const exchange = req.query.exchange ? req.query.exchange : '';
    const symbol = req.query.symbol ? req.query.symbol : ''
    const status = req.query.status ? req.query.status : "ACTIVE";
    const paused = status == 'ACTIVE' ? false : true;

    let q = { user_id, type, name, exchange, symbol, paused };
    grpcUtil.clientBotService.GetFuturesBotsByFilters(q, (err, response) => {
      if (err) {
        console.log('err get futures-bot-user', err);
        res.status(400).json({
          success: false,
          error_code: err.code,
          error: err.details,
        })
      } else {
        res.status(200).json({ data: response.bots, pairs: [] })
      }
    })
  } catch (err) {
    console.log(err)
    return res.status(400).json({ status: false, message: err })
  }

})

// FUTURES TRADING HISTORY
app.get('/futures-trading-history', async (req, res) => {
  TradingHistory.futuresFind(req, res, function (reply) {
    if (reply.success) {
      res.status(200).json(reply);
    } else {
      res.status(400).json(reply);
    }
  })
});

// START OF FUTURES BOTS SETUP
app.post('/futures-bot', async (req, res) => {
  console.log('advanced-bots');
  try {
    console.log('locals', res.locals);
    let isSubscribeActive = await Users.where({
      uid: res.locals.uid,
      'subscription.id': { $gt: 0 }
    }).countDocuments();
    console.log(isSubscribeActive);

    if (isSubscribeActive > 0) {
      Setups.createFuturesSetup(req.body, res, function (reply) {
        // console.log(reply);
        if (reply.success) {
          res.status(200).json({ ...reply })
        } else {
          res.status(400).json({ error: true, message: reply.error, data: reply })
        }
      })
    } else {
      res.status(400).json({ error: true, message: "Your subscription is inactive!" })
    }
  } catch (error) {
    console.log(err);
    res.status(400).send(error);
  }
});


app.get('/futures-bot', async (req, res) => {
  try {
    Setups.findAllFutures(req, res, function (reply) {
      // console.log(reply);
      if (reply.success) {
        res.status(200).json({ success: true, data: reply.data })
      } else {
        res.status(400).json({ error: true, message: reply })
      }
    })
  } catch (err) {
    console.log(err)
    return res.status(400).json({
      status: false,
      message: err
    })
  }
})

app.delete('/futures-bot', async (req, res) => {
  try {
    console.log('delete/futures-bot');
    Setups.deleteFuturesBot(req, res, function (reply) {
      if (reply.success) {
        res.status(200).json({ success: true, data: reply })
      } else {
        res.status(400).json({ error: true, message: reply })
      }
    })
  } catch (err) {
    return res.status(400).json({
      error: true,
      message: err
    })
  }
});

app.put('/futures-bot', async (req, res) => {
  try {
    console.log('update/futures-bot');
    Setups.updateFuturesSetup(req, res, function (reply) {
      if (reply.success) {
        res.status(200).json({ success: true, data: reply })
      } else {
        res.status(400).json({ error: true, message: reply })
      }
    })
  } catch (err) {
    return res.status(400).json({
      error: true,
      message: err
    })
  }
});

// FUTURES USER ACTION
app.delete('/inactive-futures-bot', async (req, res) => {
  try {
    UserActions.deleteInactiveFuturesBot(req, res, function (reply) {
      if (reply.success) {
        res.status(200).json({ success: true, data: "Successfully Deleted" });
      } else {
        res.status(400).json(reply);
      }
    })
  } catch (error) {
    console.log('/inactive-advanced-bot error', error);
    res.status(400).json({ error: true })
  }
});
module.exports = app

