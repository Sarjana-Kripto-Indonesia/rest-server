const express = require('express')
const mongoose = require('mongoose')
const midtransClient = require('midtrans-client');
const app = express.Router()
const Courses = require('../../models/courses')
const coursesTransactions = require('../../models/courses-transactions');
const Users = require('../../models/users');
const snap = new midtransClient.Snap({
  isProduction: false,
  serverKey: 'SB-Mid-server-xKyCOvyiM2QR4r-alOgLGrjK',
  clientKey: 'SB-Mid-client-Gk6495kwINKCvAyo',
});


app.get('/user-transaction', async (req, res) => {
  console.log('get all transactions: /user-transaction');
  try {
    let aggregate = [];
    let query = {};
    let sorting = {};
    // main query

    // define params
    const qSearch = req.query.search ? JSON.parse(req.query.search) : null;
    const qFilter = req.query.filter ? JSON.parse(req.query.filter) : null;
    const qSorting = req.query.sort ? JSON.parse(req.query.sort) : null;
    const page = req.query.page ? parseInt(req.query.page) : 1
    const limit = req.query.limit ? parseInt(req.query.limit) : 10
    const start = ((page - 1) * (limit));
    const is_mine = req.query.is_mine ? 1 : 0


    // special cases
    if (is_mine) {
      query['user_id'] =
        res.locals.user._id ? mongoose.Types.ObjectId(res.locals.user._id) : null
    }

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
        count: { $sum: 1 }
      }
    })

    // slice the data depends on the start and limit
    aggregate.push(
      {
        $project: {
          _id: 1,
          data: { $slice: ["$data", start, limit] },
          count: 1,
        }
      }
    )
    // access the DB
    let execute = await coursesTransactions.aggregate(aggregate);
    console.log(execute);

    res.status(200).json({
      success: true,
      data: execute.length > 0 ? execute[0].data : [],
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

app.get('/invoice/:transaction_id', async (req, res) => {
  console.log('get invoice: /invoice/:transaction_id');
  try {
    let aggregate = [];
    let query = {};
    let sorting = {};
    // main query

    // define params
    const transaction_id = req?.params?.transaction_id ? mongoose.Types.ObjectId(req?.params?.transaction_id) : null
    const user_id = res?.locals?.user?._id ? mongoose.Types.ObjectId(res.locals.user._id) : null

    // if no transaction_id
    if (!transaction_id) {
      return res.status(400).json({
        error: true,
        message: "Transaction ID not found"
      })
    }

    // special cases
    query['_id'] =
      transaction_id
    qurey['user_id'] = user_id
    aggregate.push({ $match: query });

    // access the DB
    let execute = await coursesTransactions.aggregate(aggregate);
    console.log(execute);

    res.status(200).json({
      success: true,
      data: execute[0]
    })
  } catch (error) {
    console.log(error);
    res.status(400).json({
      error: true,
      message: error
    })
  }
});

app.post('/buy-course', async (req, res) => {
  console.log('post transaction: /');
  console.log(res.locals.user);
  try {
    // Body
    let course_id = req.body.course_id ? mongoose.Types.ObjectId(req.body.course_id) : null;
    let callback_url = req.body.callback_url ? req.body.callback_url : null;
    if (!course_id) return res.status(400).json({
      error: true,
      message: "Please provide course ID"
    });

    // Check if course exist
    let getCourse = await Courses.findOne({ _id: course_id }).exec();
    if (!getCourse) return res.status(400).json({
      error: true,
      message: "Couldn't find existing course to proceed"
    })
    let discountPrice = getCourse.price.disc ? parseFloat(getCourse.price.disc) : 0;
    let coursePrice = getCourse.price.value - discountPrice

    // Get customer detail
    const user_id = mongoose.Types.ObjectId(res.locals.user._id)
    const user = await Users.findOne({ _id: user_id })
    const customer_details = {
      "first_name": user.name,
      "last_name": "",
      "email": user.email
    }

    // Payment Gateway
    const order_id = `CRS-${res.locals.user._id.toString().slice(-5)}${req.body.course_id.slice(-5)}${Date.now()}`
    const transactionDetails = {
      // order_id: `${createPayment._id}`, // Cant do this homie
      order_id,
      gross_amount: coursePrice,
    };

    const callbacks = {
      "finish": callback_url || "https://dev-web-apps.vercel.app/"
    }

    const transactionToken = await snap.createTransaction({ transaction_details: transactionDetails, callbacks, customer_details });
    console.log('transactionToken', transactionToken);

    // Log the status of the transaction
    // const transactionStatus = await snap.transaction.status(transactionToken);
    // console.log('Transaction Status:', transactionStatus);

    // Payment Create
    let createPayment = await coursesTransactions.create({
      course_id: course_id,
      user_id: res.locals.user._id,
      payment: {
        price: coursePrice ? coursePrice : 0,
        status: null
      },
      history_payment: [],
      course: getCourse,
      type: "class",
      content: `Payment for course ${getCourse.name}`,
      bank: { type: "BCA", number: 331021312312 },
      token: transactionToken,
      deletedAt: null,
      order_id
    });

    console.log('createPayment', createPayment)
    res.status(200).json({
      success: true,
      transactionToken
    })

  } catch (error) {
    console.log('error guys');
    console.log(error);
    res.status(400).json({
      error: true,
      message: error.message ? error.message : 'transaction error'
    })
  }
})



module.exports = app
