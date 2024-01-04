const mongoose = require('mongoose');
const moment = require('moment')
const TradingHistory = require("../../models/trading-history");
const Setups = require("../../models/setups")
const Trades = require('../../models/trading-history')
const grpcUtil = require("../../utils/grpc");

const daysOfThisMonth = () => {
  let year = new Date().getFullYear();
  let month = new Date().getMonth() + 1;
  return new Date(year, month, 0).getDate();
};
const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

exports.find = async (req, res, callback) => {
  try {
    console.log('find-trading-history');
    console.log('req query', req.query);
    const timezone = req.headers['timezone'] ? req.headers['timezone'] : null;
    const uid = res.locals.uid ? res.locals.uid : null;
    const setup_id = req.query.setup_id ? req.query.setup_id : '';
    const type = req.query.type ? req.query.type : null;
    const query = { user_id: uid };
    const sorting = { created_at: -1 };
    let page = req.query.page ? parseInt(req.query.page) : 1
    const limit = req.query.limit ? parseInt(req.query.limit) : 10



    if (!timezone) {
      throw "Timezone is not defined";
    }

    if (!uid) {
      return callback({
        success: false,
        msg: "User ID not Defined"
      });
    }

    let symbol = null;
    if (req.query.search) {
      let search = JSON.parse(JSON.stringify(req.query.search));
      for (let key in search) {
        if (key == 'symbol') {
          symbol = search[key]
        }
        query[key] = search[key]
      }
    }

    // MAP DATES
    let dateTemp = [];
    if (req.query.dates) {

      // IF ONLY ONE DAY SELECTED ADD END DATE AUTOMATICALLY
      if (req.query.dates.length == 1) {
        let start = new Date(req.query.dates[0]);
        let end = new Date(start.setDate(start.getDate() + 1));
        let toString = `${end.getFullYear()}-${end.getMonth() + 1}-${end.getDate()}`
        req.query.dates.push(toString);
      }

      for (let date of req.query.dates) {
        dateTemp.push(date)
      }
    }
    
    let q = {
      "user_id": uid,
      "setup_id" : setup_id,
      "exchange": query.exchange ? query.exchange : '',
      "bot_type": type,
      "name":query.bot_name ? query.bot_name :  '',
      "symbol" : query.symbol ? query.symbol : '',
      "page": page,
      "limit": limit,
      "dates": dateTemp,
      "timezone": timezone
    }

    console.log('trading-history find q', q)
    grpcUtil.clientProfitService.GetTradingHistoryByFilters(q, (err, response) => {
      if (err) {
        return callback({
          success: false,
          error_code: err.code,
          error: err.details,
        })
      } else {
        // console.log('trading-history res', response);
        return callback({
          success: true,
          data: response.trades,
          count: response.count || response.trades.length
        })
      }
    })
  }
  catch (error) {
    console.log(error)
    return callback({
      success: false,
      msg: error
    })
  }
}

exports.profitReport = async (req, res, callback) => {
  try {
    console.log("------PROFIT REPORT------");
    const timezone = req.headers['timezone'] ? req.headers['timezone'] : null;
    if (!timezone) throw "Timezone is not defined";
    const uid = res.locals.uid ? res.locals.uid : null;
    let q = {};
    q.user_id = uid;
    q.timezone = timezone;
    q.dates = req.query.dates ? req.query.dates : [];
    q.bot_type = req.query.type ? req.query.type : '';
    q.exchange = req.query.exchange ? req.query.exchange : '';
    q.market = req.query.market ? req.query.market : '';
    q.page = req.query.page ? parseInt(req.query.page) : 0;
    q.limit = req.query.limit ? parseInt(req.query.limit) : 0;
    if (req.query.sort_by && req.query.sort_order) {
      q.sort_by = req.query.sort_by;
      q.sort_order = req.query.sort_order;
    }

    console.log('daily-profit q', q);
    grpcUtil.clientProfitService.GetDailyProfits(q, (err, response) => {
      if (err) {
        return callback({
          success: false,
          error_code: err.code,
          error: err.details,
        })
      } else {
        console.log('res daily-profit', response)
        return callback({
          success: true,
          data: response.records,
          count: response.count,
          timezone: response.timezone
        })
      }
    })



  } catch (error) {
    console.log(error);
    return callback({
      success: false,
      msg: error
    })
  }
}

exports.profitAllExchange = async (req, res, callback) => {
  try {
    // Get user Setups, put it as a variable to loop
    const getSetups = await Setups.find({ user_id: res.locals.uid }).exec();
    if (getSetups.length == 0) {
      return callback({
        success: true,
        data: []
      })
    }

    // Variable to collect all the profit report from this user
    let result = [];

    // Loop on each bot setup to get the profit on each setup
    for (const setup of getSetups) {
      let startDate = new Date(setup.updated_at).valueOf()  // Convert to UNIX timestamp
      let aggregate = [];
      let query = {};

      query['exchange'] = { '$regex': setup.selected_exchange ? setup.selected_exchange.toLowerCase() : null, '$options': 'i' }
      // query.exchange = setup.selected_exchange ? setup.selected_exchange.toLowerCase() : null;     // Selected Exchange to calculate
      // query.executed_at = { $gt: startDate }      // Get → start from the updated_at in the setup
      query.side = "SELL"                           // Only SELL (profit)
      query.user_id = res.locals.uid                // Current User Key


      aggregate.push({ $match: query });
      aggregate.push({
        $group: {
          _id: null,
          profit: { $sum: '$pnl' }
        }
      })

      // Execute the database, to get the PNL using grouping
      let calculateProfit = await Trades.aggregate(aggregate).exec();

      // Push the result to profit collector ↑
      if (calculateProfit.length > 0) {
        result.push({ exchange: setup.selected_exchange, profit: calculateProfit[0].profit })
      } else {
        result.push({ exchange: setup.selected_exchange, profit: 0 })
      }
    }

    return callback({
      success: true,
      data: result
    })
  } catch (error) {
    console.log('err-profitAllExchange', error);
    return callback({
      error: false,
      msg: error
    })
  }
}

exports.profit = async (req, res, callback) => {
  try {
    console.log('get-user-profit');
    const query = {};
    const sorting = {};
    let aggregate = [];


    if (req.query.sorting) {
      let sortingParam = JSON.parse(req.query.sorting);

      for (let key in sortingParam) {
        sorting[key] = sortingParam[key] == "ascending" ? 1 : -1
      }
      aggregate.push({ $sort: sorting })
      delete req.query.sorting;
    }

    if (req.query) {
      for (let key in req.query) {
        query[key] = req.query[key];
        if (key == 'range') {
          let current = new Date();
          let y, m, d, start, end;
          y = current.getFullYear();
          m = current.getMonth();
          d = current.getDate();
          if (req.query[key] == 'daily') {
            start = new Date(y, m, d).getTime();
            end = new Date(y, m, d + 1).getTime();
            query["created_at"] = { $gte: start, $lt: end };
            delete query.range;
          }
        }
        if (key == 'start_date' || key == 'end_date') {
          console.log(req.query.start_date);
          let start = req.query.start_date ? parseInt(req.query.start_date) : null;
          let end = req.query.end_date ? parseInt(req.query.end_date) : null;
          query["created_at"] = { $gte: start, $lt: end };
        }
        if (key == 'onlyUser') {
          const uid = res.locals.uid ? res.locals.uid : null;
          query['user_id'] = uid;
          delete query.onlyUser;
        }
        if (key == 'exchange') {
          const exchange = query[key].toLowerCase().includes("demo") ? 'demo' : query[key].toLowerCase()
          query['exchange'] = { '$regex': exchange ? exchange : null, '$options': 'i' }
        }
      }
      delete query.start_date
      delete query.end_date
      aggregate.push({ $match: query })

      console.log("[get-user-profit] query ", query)
    }

    aggregate.push({
      $group: {
        _id: null,
        total_pnl: { $sum: "$pnl" },
        data: { $push: "$$ROOT" }
      }
    })
    const execute = await TradingHistory.aggregate(aggregate);
    let profit = 0;
    let data = null;
    if (execute.length > 0) {
      profit = execute[0].total_pnl
      data = execute[0].data
    }

    return callback({
      success: true,
      data: { profit, data }
    })

  } catch (error) {
    console.log(error)
    return callback({
      success: false,
      msg: error
    })
  }
}

exports.dailyDeals = async (req, res, callback) => {
  try {
    console.log('get-user-daily-deals');
    console.log(req.query);
    const uid = res.locals.uid ? res.locals.uid : null;
    const query = { user_id: uid };
    let aggregate = [];
    if (req.query) {
      for (let key in req.query) {
        query[key] = req.query[key];
        if (key == 'start_date' || key == 'end_date') {
          console.log(req.query.start_date);
          let start = req.query.start_date ? parseInt(req.query.start_date) : null;
          let end = req.query.end_date ? parseInt(req.query.end_date) : null;
          query["created_at"] = { $gte: start, $lt: end };
        }
        if (key == 'onlyUser') {
          const uid = res.locals.uid ? res.locals.uid : null;
          query['user_id'] = uid;
          delete query.onlyUser;
        }
        if (key == 'exchange') {
          const exchange = query[key].toLowerCase().includes("demo") ? 'demo' : query[key].toLowerCase()
          query['exchange'] = { '$regex': exchange ? exchange : null, '$options': 'i' }
        }
      }
      delete query.start_date
      delete query.end_date
      query.side = "SELL";
      aggregate.push({ $match: query })
    }

    aggregate.push({
      $group: {
        _id: null,
        total_deals: { $sum: 1 }
      }
    })

    console.log('aggregate', aggregate);
    console.log('query', query);
    const execute = await TradingHistory.aggregate(aggregate);
    let total_deals = 0;
    if (execute.length > 0) {
      total_deals = execute[0].total_deals
    }
    return callback({
      success: true,
      data: total_deals
    })

  } catch (error) {
    console.log(error)
    return callback({
      success: false,
      msg: error
    })
  }
}

exports.chart = async (req, res, callback) => {
  try {
    const daysLength = daysOfThisMonth();
    let aggregate = [];
    const timezone = req.headers['timezone'] ? req.headers['timezone'] : null;
    if (!timezone) throw "Timezone is not defined";
    const uid = res.locals.uid ? res.locals.uid : null;
    const exchange = req.query.exchange ? req.query.exchange.toLowerCase() : null;
    const style = req.query.style ? req.query.style : null;
    const startdate = req.query.startdate ? parseInt(req.query.startdate) : null;
    const enddate = req.query.enddate ? parseInt(req.query.enddate) : null;
    const market = req.query.market ? req.query.market : '';

    let q = {
      user_id: uid,
      timezone,
      start_date: startdate,
      end_date: enddate,
      style,
      exchange,
      market
    }
    console.log('profit-chart q', q);
    grpcUtil.clientProfitService.GetProfitChart(q, (err, response) => {
      if (err) {
        console.log('err', response);
        return callback({
          success: false,
          error_code: err.code,
          error: err.details,
        })
      } else {
        console.log('profit-chart res', response);
        return callback({
          success: true,
          categories: response.categories,
          series: response.series
        })
      }
    })

  } catch (error) {
    console.log(error)
    return callback({
      success: false,
      msg: error
    })
  }
}

// FUTURES
exports.futuresFind = async (req, res, callback) => {
  try {
    console.log('(get) - futures find trading history');
    const timezone = req.headers['timezone'] ? req.headers['timezone'] : null;
    const uid = res.locals.uid ? res.locals.uid : null;
    const setup_id = req.query.setup_id ? req.query.setup_id : '';
    const type = req.query.type ? req.query.type : null;
    const query = { user_id: uid };
    const sorting = { created_at: -1 };
    let page = req.query.page ? parseInt(req.query.page) : 1
    const limit = req.query.limit ? parseInt(req.query.limit) : 10



    if (!timezone) {
      throw "Timezone is not defined";
    }

    if (!uid) {
      return callback({
        success: false,
        msg: "User ID not Defined"
      });
    }

    let symbol = null;
    if (req.query.search) {
      let search = JSON.parse(JSON.stringify(req.query.search));
      for (let key in search) {
        if (key == 'symbol') {
          symbol = search[key]
        }
        query[key] = search[key]
      }
    }

    // MAP DATES
    let dateTemp = [];
    if (req.query.dates) {

      // IF ONLY ONE DAY SELECTED ADD END DATE AUTOMATICALLY
      if (req.query.dates.length == 1) {
        let start = new Date(req.query.dates[0]);
        let end = new Date(start.setDate(start.getDate() + 1));
        let toString = `${end.getFullYear()}-${end.getMonth() + 1}-${end.getDate()}`
        req.query.dates.push(toString);
      }

      for (let date of req.query.dates) {
        dateTemp.push(date)
      }
    }

    let q = {
      "user_id": uid,
      "setup_id": setup_id,
      "exchange": query.exchange ? query.exchange : '',
      "bot_type": type,
      "name": query.bot_name ? query.bot_name : '',
      "symbol": query.symbol ? query.symbol : '',
      "page": page,
      "limit": limit,
      "dates": dateTemp,
      "timezone": timezone
    }

    console.log('trading-history find q', q)
    grpcUtil.clientProfitService.GetFuturesTradingHistoryByFilters(q, (err, response) => {
      if (err) {
        return callback({
          success: false,
          error_code: err.code,
          error: err.details,
        })
      } else {
        // console.log('trading-history res', response);
        return callback({
          success: true,
          data: response.trades,
          count: response.count || response.trades.length
        })
      }
    })
  }
  catch (error) {
    console.log(error)
    return callback({
      success: false,
      msg: error
    })
  }
}
