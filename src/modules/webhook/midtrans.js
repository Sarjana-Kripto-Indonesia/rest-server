const express = require('express')
const app = express.Router()
const mongoose = require('mongoose')
const coursesQuizAnswers = require('../../models/courses-quiz-answers')
const courseModules = require('../../models/courses-modules')
const coursesTransactions = require('../../models/courses-transactions')
const coursesOwnerships = require('../../models/courses-ownerships')
const Webhooks = require("../../models/webhooks");

app.post('/payment', async (req, res) => {
  console.log('webhook payment: /webhook/payment');
  try {
    const { body } = req;
    await Webhooks.create({
      data: body
    })

    const transactionId = body?.order_id || null;

    if (!transactionId) {
      throw new Error("Transaction ID not found")
    }

    const query = { _id: transactionId };
    const update = {
      $push: {
        history_payment: body
      },
      $set: {
        bank: body,
        "payment.status": body.transaction_status,
        "payment.type": body.payment_type
      }
    }

    // Get Transaction
    const getTransaction = await coursesTransactions.findOne(query).exec();

    // Ownership Create When status settlement
    if (body.transaction_status == 'settlement') {
      // Create Ownership
      await coursesOwnerships.create({
        course_id: getTransaction.course_id,
        transaction_id: transactionId,
        user_id: getTransaction.user_id,
        is_reviewed: false,
        is_done: false
      })

      // If there's succeded transaction remove the other for the same course
      await coursesTransactions.deleteMany({
        $and: [
          { course_id: getTransaction.course_id },
          { _id: { $ne: transactionId } }
        ]
      });
    }

    // Update status
    await coursesTransactions.updateOne(query, update);

    res.status(200).json({
      status: true,
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({
      error: true,
      message: error
    })
  }
})

module.exports = app
