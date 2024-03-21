const express = require('express')
const mongoose = require('mongoose')
const app = express.Router()
const Courses = require('../../models/courses')
const coursesTransactions = require('../../models/courses-transactions');
const Users = require('../../models/users');
const ReferralHistories = require('../../models/referrals-histories');


app.get('/history', async (req, res) => {
  console.log('get all referral record: /history');
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


    // get mine only
    query['to'] = res.locals.user._id ? mongoose.Types.ObjectId(res.locals.user._id) : null

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

    aggregate.push({
      $lookup: {
        from: "courses-transactions",
        let: { userId: "$from" }, // Define variable to hold the value of "from" field
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$user_id", "$$userId"] }, // Match documents where user_id matches "from"
                  { $eq: ["$payment.status", "settlement"] } // Match documents with payment.status = 'settlement'
                ]
              }
            }
          }
        ],
        as: "transactions"
      }
    });

    aggregate.push({
      $lookup: {
        from: "users",
        localField: "from",
        foreignField: "_id",
        as: "user"
      }
    });

    aggregate.push({ $unwind: "$user" })

    aggregate.push({
      $addFields: { transaction_length: { $size: "$transactions" }}
    })

    aggregate.push({
      $project: {
        user_id:"$user._id",
        name:"$user.name",
        created_at:"$user.created_at",
        course_purchases:"$transaction_length",
        subscription_purchases:null,
        article_purchases:null
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
          data: { $slice: ["$data", start, limit] },
          count: 1,
        }
      }
    )
    // access the DB
    let execute = await ReferralHistories.aggregate(aggregate);
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

app.post('/disable-referral', async (req, res) => {
  console.log('disable-referral')
  try {
    // Client detail
    const user_id = mongoose.Types.ObjectId(res.locals.user._id)
    const disabledReferral = Users.updateOne({ _id: user_id }, { $set: { referral_set: true } });
    console.log('disabledReferral');

    return res.status(200).json({ message: "Successfully disable referral pop-up" })
  } catch (error) {
    console.log({ error })
    return res.status(401).json({ message: error.message });
  }
})

app.post('/set-referral', async (req, res) => {
  console.log('set-referral')
  try {
    const { referral } = req.body;
    // Client detail
    const user_id = mongoose.Types.ObjectId(res.locals.user._id)

    // Find referral exist
    const findReferred = await Users.findOne({ referral });
    if (!findReferred) return res.status(400).json({ message: "Referral not found" })

    const setRefferalStatus = await Users.updateOne({ _id: createUser._id }, { $set: { referral_set: true } })
    const createHistories = await ReferralHistories.create({
      from: user_id,
      to: findReferred._id
    });
    
    return res.status(200).json({ message: "Successfully added referral" })
  } catch (error) {
    console.log({ error })
    return res.status(401).json({ message: error.message });
  }
})


module.exports = app
