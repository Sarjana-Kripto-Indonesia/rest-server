const express = require('express')
const app = express.Router()
const { admin } = require('../../services/firebase')
const { getUserById } = require('../../helpers/user')
const Users = require('../../models/users')
const Bots = require('../../models/bots')
const Trades = require('../../models/trading-history')
const Invoices = require('../../models/invoices')
const Balances = require('../../models/balance')
const { constants } = require('ethers')
const { async } = require('@firebase/util')

app.get('/', async (req, res) => {
  console.log('admin-user: /');
  try {
    let aggregate = [];
    let query = {};
    let sorting = {};

    // define params
    const qSearch = req.query.search ? JSON.parse(req.query.search) : null;
    const qFilter = req.query.filter ? JSON.parse(req.query.filter) : null;
    const qSorting = req.query.sort ? JSON.parse(req.query.sort) : null;
    const page = req.query.page ? parseInt(req.query.page) : 1
    const limit = req.query.limit ? parseInt(req.query.limit) : 10
    const start = ((page - 1) * (limit));


    // automatically convert from obj to find parameter with regex
    if (qSearch) {
      for (let key in qSearch) {
        const searchQuery = qSearch[key].replace(/[^a-zA-Z0-9. ]/g, "")
        query[key] = new RegExp(searchQuery, "i");
      }
    }

    // automatically convert from obj to find parameter without regex
    if (qFilter && Object.keys(qFilter).length > 0) {
      for (let key in qFilter) {
        query[key] = qFilter[key]
      }
    }

    aggregate.push({ $match: query });
    // sorting
    if (qSorting && Object.keys(qSorting).length > 0) {
      for (var key in qSorting) {
        sorting[key] = qSorting[key] === "ascending" ? 1 : -1;
      }
      aggregate.push({ $sort: sorting });

    }

    // lookup user-properties
    aggregate.push({
      $lookup: {
        from: "user-properties",
        localField: "uid",
        foreignField: "user_id",
        as: "user-properties"
      }
    })

    // lookup exchanges
    aggregate.push({
      $lookup: {
        from: "exchanges",
        localField: "uid",
        foreignField: "user_id",
        as: "user-exchanges"
      }
    })

    //grouping all match documents 
    aggregate.push({
      $group: {
        _id: null,
        data: { $push: "$$ROOT" },
        count: { $sum: 1 }
      }
    })

    // slice the data depends on the start and limit
    aggregate.push(
      {
        $project: {
          _id: 1,
          records: { $slice: ["$data", start, limit] },
          count: 1,
        }
      }
    )

    console.log('query', query);
    console.log('sorting', sorting);
    console.log('aggregate', aggregate);

    // access the DB
    let execute = await Users.aggregate(aggregate);
    console.log(execute);

    res.status(200).json({
      success: true,
      data: execute.length > 0 ? execute[0].records : [],
      count: execute.length > 0 ? execute[0].count : 0,
    })

  } catch (error) {
    console.log(error);
    res.status(400).json({
      error: true,
      message: error
    })
  }
});

app.get('/summary', async (req, res) => {

  let query = {};
  // define params
  const qSearch = req.query.search ? JSON.parse(req.query.search) : null;
  const type = req.query.type ? req.query.type : null;
  if (!type) {
    res.status(400).json({
      error: true,
      message: "Please one insert type"
    });
  }
  console.log('type', type);

  try {
    switch (type) {
      case 'total_user':
        let totalUsers = await Users.where().countDocuments();
        res.status(200).json({
          success: true,
          data: totalUsers
        })
        break
      case 'total_bots':
        let totalBots = await Bots.where().countDocuments();
        res.status(200).json({
          success: true,
          data: totalBots
        })
        break
    }   
  } catch (error) {
    console.log(error);
    res.status(400).json({
      error: true,
      message: error
    })
  }
});

app.get('/total-trading-volume', async (req, res) => {
  console.log('admin-user: /total-trading-volume');
  try {
    let aggregate = [];
    let query = {};
    let sorting = {};

    // define params
    const qSearch = req.query.search ? JSON.parse(req.query.search) : null;
    const qFilter = req.query.filter ? JSON.parse(req.query.filter) : null;
    const qSorting = req.query.sort ? JSON.parse(req.query.sort) : null;
    const page = req.query.page ? parseInt(req.query.page) : 1
    const limit = req.query.limit ? parseInt(req.query.limit) : 10
    const start = ((page - 1) * (limit));


    // automatically convert from obj to find parameter with regex
    if (qSearch) {
      for (let key in qSearch) {
        const searchQuery = qSearch[key].replace(/[^a-zA-Z0-9. ]/g, "")
        query[key] = new RegExp(searchQuery, "i");
      }
    }

    // automatically convert from obj to find parameter without regex
    if (qFilter && Object.keys(qFilter).length > 0) {
      for (let key in qFilter) {
        query[key] = qFilter[key]
      }
    }

    aggregate.push({ $match: query });
    // sorting
    if (qSorting && Object.keys(qSorting).length > 0) {
      for (var key in qSorting) {
        sorting[key] = qSorting[key] === "ascending" ? 1 : -1;
      }
      aggregate.push({ $sort: sorting });
    }

    //grouping all match documents 
    aggregate.push({
      $group: {
        _id: null,
        data: { $push: "$$ROOT" },
        trading_volume: { $sum: "$amount_usd_filled" },
        count: { $sum: 1 }
      }
    })

    // slice the data depends on the start and limit
    aggregate.push(
      {
        $project: {
          _id: 1,
          records: { $slice: ["$data", start, limit] },
          trading_volume: 1,
          count: 1,
        }
      }
    )

    // access the DB
    let execute = await Trades.aggregate(aggregate);
    console.log(execute);

    res.status(200).json({
      success: true,
      data: execute.length > 0 ? execute[0].records : [],
      count: execute.length > 0 ? execute[0].count : 0,
      total_trading_volume: execute.length > 0 ? execute[0].trading_volume : 0,
    })
  } catch (error) {
    console.log(error);
    res.status(400).json({
      error: true,
      message: error
    })
  }
})

app.get('/total-subscription-earning', async (req, res) => {
  console.log('admin-user: /total-subscription-earning');
  try {
    let aggregate = [];
    let query = {};
    let sorting = {};
    // main query
    query['payment.paid'] = true;
    query['payment.method'] = {$nin:['free', 'trial']};

    // define params
    const qSearch = req.query.search ? JSON.parse(req.query.search) : null;
    const qFilter = req.query.filter ? JSON.parse(req.query.filter) : null;
    const qSorting = req.query.sort ? JSON.parse(req.query.sort) : null;
    const page = req.query.page ? parseInt(req.query.page) : 1
    const limit = req.query.limit ? parseInt(req.query.limit) : 10
    const start = ((page - 1) * (limit));


    // automatically convert from obj to find parameter with regex
    if (qSearch) {
      for (let key in qSearch) {
        const searchQuery = qSearch[key].replace(/[^a-zA-Z0-9. ]/g, "")
        query[key] = new RegExp(searchQuery, "i");
      }
    }

    // automatically convert from obj to find parameter without regex
    if (qFilter && Object.keys(qFilter).length > 0) {
      for (let key in qFilter) {
        query[key] = qFilter[key]
      }
    }

    aggregate.push({ $match: query });
    // sorting
    if (qSorting && Object.keys(qSorting).length > 0) {
      for (var key in qSorting) {
        sorting[key] = qSorting[key] === "ascending" ? 1 : -1;
      }
      aggregate.push({ $sort: sorting });
    }

    //grouping all match documents 
    aggregate.push({
      $group: {
        _id: null,
        data: { $push: "$$ROOT" },
        subtotal: { $sum: "$totals.subtotal" },
        discount: { $sum: "$totals.discount" },
        total: { $sum: "$totals.total" },
        count: { $sum: 1 }
      }
    })

    // slice the data depends on the start and limit
    aggregate.push(
      {
        $project: {
          _id: 1,
          records: { $slice: ["$data", start, limit] },
          subtotal: 1,
          discount: 1,
          total: 1,
          count: 1,
        }
      }
    )

    // access the DB
    console.log(query);
    let execute = await Invoices.aggregate(aggregate);
    console.log(execute);

    res.status(200).json({
      success: true,
      data: execute.length > 0 ? execute[0].records : [],
      count: execute.length > 0 ? execute[0].count : 0,
      subtotal: execute.length > 0 ? execute[0].subtotal : 0,
      discount: execute.length > 0 ? execute[0].discount : 0,
      total: execute.length > 0 ? execute[0].total : 0,
    })
  } catch (error) {
    console.log(error);
    res.status(400).json({
      error: true,
      message: error
    })
  }
})

app.get('/total-profit', async (req, res) => {
  console.log('admin-user: /total-profit');
  try {
    let aggregate = [];
    let query = {};
    let sorting = {};
    // main query
    query.side = 'SELL';

    // define params
    const qSearch = req.query.search ? JSON.parse(req.query.search) : null;
    const qFilter = req.query.filter ? JSON.parse(req.query.filter) : null;
    const qSorting = req.query.sort ? JSON.parse(req.query.sort) : null;
    const page = req.query.page ? parseInt(req.query.page) : 1
    const limit = req.query.limit ? parseInt(req.query.limit) : 10
    const start = ((page - 1) * (limit));

    // automatically convert from obj to find parameter with regex
    if (qSearch) {
      for (let key in qSearch) {
        const searchQuery = qSearch[key].replace(/[^a-zA-Z0-9. ]/g, "")
        query[key] = new RegExp(searchQuery, "i");
      }
    }

    // automatically convert from obj to find parameter without regex
    if (qFilter && Object.keys(qFilter).length > 0) {
      for (let key in qFilter) {
        query[key] = qFilter[key]
      }
    }
    aggregate.push({ $match: query });

    // sorting
    if (qSorting && Object.keys(qSorting).length > 0) {
      for (var key in qSorting) {
        sorting[key] = qSorting[key] === "ascending" ? 1 : -1;
      }
      aggregate.push({ $sort: sorting });
    }

    aggregate.push({ $match: query });
    // sorting
    if (qSorting && Object.keys(qSorting).length > 0) {
      for (var key in qSorting) {
        sorting[key] = qSorting[key] === "ascending" ? 1 : -1;
      }
      aggregate.push({ $sort: sorting });
    }

    //grouping all match documents 
    aggregate.push({
      $group: {
        _id: null,
        data: { $push: "$$ROOT" },
        total_profit: { $sum: "$pnl" },
        count: { $sum: 1 }
      }
    })

    // slice the data depends on the start and limit
    aggregate.push(
      {
        $project: {
          _id: 1,
          records: { $slice: ["$data", start, limit] },
          total_profit: 1,
          count: 1,
        }
      }
    )

    console.log(aggregate[0]);
    console.log(aggregate[1]);
    console.log(aggregate[2]);
    // access the DB
    let execute = await Trades.aggregate(aggregate);
    console.log(execute);

    res.status(200).json({
      success: true,
      data: execute.length > 0 ? execute[0].records : [],
      count: execute.length > 0 ? execute[0].count : 0,
      total_profit: execute.length > 0 ? execute[0].total_profit : 0,
    })
  } catch (error) { 
    console.log(error);
    res.status(400).json({
      error: true,
      message: error
    })
  }
})

app.get('/total-profit-share', async (req, res) => {
  console.log('admin-user: /total-profit-share');
  try {
    let aggregate = [];
    let query = {};
    let sorting = {};
    // main query
    query.type = 'profit_share';

    // define params
    const qSearch = req.query.search ? JSON.parse(req.query.search) : null;
    const qFilter = req.query.filter ? JSON.parse(req.query.filter) : null;
    const qSorting = req.query.sort ? JSON.parse(req.query.sort) : null;
    const page = req.query.page ? parseInt(req.query.page) : 1
    const limit = req.query.limit ? parseInt(req.query.limit) : 10
    const start = ((page - 1) * (limit));


    // automatically convert from obj to find parameter with regex
    if (qSearch) {
      for (let key in qSearch) {
        const searchQuery = qSearch[key].replace(/[^a-zA-Z0-9. ]/g, "")
        query[key] = new RegExp(searchQuery, "i");
      }
    }

    // automatically convert from obj to find parameter without regex
    if (qFilter && Object.keys(qFilter).length > 0) {
      for (let key in qFilter) {
        query[key] = qFilter[key]
      }
    }

    aggregate.push({ $match: query });
    // sorting
    if (qSorting && Object.keys(qSorting).length > 0) {
      for (var key in qSorting) {
        sorting[key] = qSorting[key] === "ascending" ? 1 : -1;
      }
      aggregate.push({ $sort: sorting });
    }

    //grouping all match documents 
    aggregate.push({
      $group: {
        _id: null,
        data: { $push: "$$ROOT" },
        total_earning: { $sum: "$debt" },
        count: { $sum: 1 }
      }
    })

    // slice the data depends on the start and limit
    aggregate.push(
      {
        $project: {
          _id: 1,
          records: { $slice: ["$data", start, limit] },
          total_earning: 1,
          count: 1,
        }
      }
    )

    // access the DB
    let execute = await Balances.aggregate(aggregate);
    console.log(execute);

    res.status(200).json({
      success: true,
      data: execute.length > 0 ? execute[0].records : [],
      count: execute.length > 0 ? execute[0].count : 0,
      total_earning: execute.length > 0 ? execute[0].total_earning : 0,
    })
  } catch (error) {
    console.log(error);
    res.status(400).json({
      error: true,
      message: error
    })
  }
})

app.get('/:uid/balance-detail', async (req, res) => {
  console.log('admin-user: /:uid/balance-detail');
  console.log('req.params', req.params);

  try {
    let aggregate = [];
    let query = {};
    let sorting = {};
    // main query
    query.uid = req.params.uid ? req.params.uid : null;
    if (req.query.type) {
      query.type = req.query.type
    }
    if (!req.params.uid) {
      res.status(400).json({
        error: true,
        message:"Please provide user ID"
      })
    }

    // define params
    const qSearch = req.query.search ? JSON.parse(req.query.search) : null;
    const qFilter = req.query.filter ? JSON.parse(req.query.filter) : null;
    const qSorting = req.query.sort ? JSON.parse(req.query.sort) : null;
    const page = req.query.page ? parseInt(req.query.page) : 1
    const limit = req.query.limit ? parseInt(req.query.limit) : 10
    const start = ((page - 1) * (limit));


    // automatically convert from obj to find parameter with regex
    if (qSearch) {
      for (let key in qSearch) {
        const searchQuery = qSearch[key].replace(/[^a-zA-Z0-9. ]/g, "")
        query[key] = new RegExp(searchQuery, "i");
      }
    }

    // automatically convert from obj to find parameter without regex
    if (qFilter && Object.keys(qFilter).length > 0) {
      for (let key in qFilter) {
        query[key] = qFilter[key]
      }
    }

    aggregate.push({ $match: query });
    // sorting
    if (qSorting && Object.keys(qSorting).length > 0) {
      for (var key in qSorting) {
        sorting[key] = qSorting[key] === "ascending" ? 1 : -1;
      }
      aggregate.push({ $sort: sorting });
    }

    //grouping all match documents 
    aggregate.push({
      $group: {
        _id: null,
        data: { $push: "$$ROOT" },
        credit: { $sum: "$credit" },
        debt: { $sum: "$debt" },
        count: { $sum: 1 }
      }
    })

    // slice the data depends on the start and limit
    aggregate.push(
      {
        $project: {
          _id: 1,
          records: { $slice: ["$data", start, limit] },
          credit: 1,
          debt: 1,
          count: 1,
        }
      }
    )

    // access the DB
    console.log(query);
    let execute = await Balances.aggregate(aggregate);
    console.log(execute);

    res.status(200).json({
      success: true,
      data: execute.length > 0 ? execute[0].records : [],
      count: execute.length > 0 ? execute[0].count : 0,
      total_credit: execute.length > 0 ? execute[0].credit : 0,
      total_debt: execute.length > 0 ? execute[0].debt : 0,
    })
  } catch (error) {
    console.log(error);
    res.status(400).json({
      error: true,
      message: error
    })
  }
})

app.get('/:uid/bot-user', async (req, res) => {
  const type = req.query.type ? req.query.type : null;
  const exchange = req.query.exchange ? req.query.exchange : null;

  let query = { };
  query.user_id = req.params.uid ? req.params.uid : null;

  if (!req.params.uid) {
    res.status(400).json({
      error: true,
      message: "Please provide user ID"
    })
  }

  if (exchange) {
    query.exchange = exchange;
  }

  if (type) {
    if (type == 'ADVANCED') {
      query.type = { $ne: "AUTOMATED" }
    } else {
      query.type = type;
    }
  }

  console.log('queryFindBotByUser (ADMIN)', query);

  Bots.findByUser(query, function (reply) {
    let positionsArray = []
    let activePositions = {}
    let index = 0;
    if (!reply) {
      res.status(400).json({ success: false, data: [] });
    } else {
      reply.data.forEach((val) => {
        let tempObj = {}
        tempObj.grid_profit = val.grid_profit;
        tempObj._id = val._id.toString();
        tempObj.bot_id = val.bot_id;
        tempObj.pair_from = val.symbol.substr(0, val.symbol.length - 4)
        tempObj.pair_to = val.symbol.substr(-4)
        tempObj.symbol = val.symbol
        tempObj.exchange = val.exchange
        tempObj.name = val.name ? val.name : ''
        tempObj.type = val.type ? val.type : ''
        tempObj.price = {
          value: 0,
          percentage: 0
        }
        tempObj.quantity = 0
        tempObj.profit = {
          value: 0,
          percentage: 0
        }
        tempObj.average = 0;
        tempObj.logo = '/default.png';
        tempObj.status = val.status;
        if (val.positions.length > 0) {
          let quantity = 0
          let amountUsd = 0
          for (let position of val.positions) {
            quantity += position.quantity
            amountUsd += position.amount_usd
          }
          tempObj.average = amountUsd / quantity
          tempObj.amountUsd = amountUsd
          tempObj.quantity = quantity
        } else {
          tempObj.average = 0
          tempObj.amountUsd = 0
          tempObj.quantity = 0
        }
        activePositions[val.symbol] = tempObj
        index++
      })

      for (let pair in activePositions) {
        positionsArray.push(activePositions[pair])
      }

      res.send({ data: positionsArray, pairs: reply.pairs });
    }

  })
})
// END OF BOT SETUP

app.get('/:userid', (req, res) => {
  res.status(200).json({
    status: true,
    result: 'OK'
  })
})

app.post('/', (req, res) => {
  res.status(200).json({
    status: true,
    result: 'OK'
  })
})

app.put('/:userid', async (req, res) => {
  const user = await getUserById(req.params.userid)

  if (user) {
    const isTrial = req.body.trial
    const isSubscription = req.body.subscription
    const isAdmin = req.body.admin

    admin.auth().getUser(user.uid).then(async(userRecord) => {
      const claims = {
        ...userRecord.customClaims,
        trial: isTrial,
        subscription: isSubscription,
        admin: isAdmin
      }

      await admin.auth().setCustomUserClaims(user.uid, claims)
    })

    res.status(200).json({
      status: true,
      result: 'OK'
    })
  } else {
    res.status(400).json({
      error: true,
      message: 'User not found'
    })
  }
})

app.delete('/:userid', (req, res) => {
  res.status(200).json({
    status: true,
    result: 'OK'
  })
})

module.exports = app