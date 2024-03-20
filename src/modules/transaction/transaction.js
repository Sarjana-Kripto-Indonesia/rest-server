const express = require('express')
const mongoose = require('mongoose')
const midtransClient = require('midtrans-client');
const app = express.Router()
const Courses = require('../../models/courses')
const coursesTransactions = require('../../models/courses-transactions');
const Users = require('../../models/users');
const getTransactionCourse = require('../../services/get-transaction-course');
const getReferralHistories = require('../../services/get-referral-histories');

const snap = new midtransClient.Snap({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});


app.get('/user-transaction', async (req, res) => {
  console.log('get all transactions: /user-transaction');
  try {
    const type = req.query.type ? req.query.type : "buy";
    let data, count
    if (type == 'buy') {
      const transaction = await getTransactionCourse(req, res);
      data = transaction.length > 0 ? transaction[0].data : [];
      count = transaction.length > 0 ? transaction[0].count : 0;
      
    } else if (type == 'referral') {
      const histories = await getReferralHistories(req, res);
      data = histories.length > 0 ? histories[0].data : [];
      count = histories.length > 0 ? histories[0].count : 0;
    }

    res.status(200).json({
      success: true,
      data,
      count
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
