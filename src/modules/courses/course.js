const express = require('express')
const app = express.Router()
const Courses = require('../../models/courses');
const coursesTransactions = require('../../models/courses-transactions')
const coursesOwnerships = require('../../models/courses-ownerships')
const mongoose = require('mongoose')


app.get('/', async (req, res) => {
  console.log('get all courses: /');
  try {
    let aggregate = [];
    let query = {};
    let sorting = {};
    // main query

    // current user
    const user_id = res.locals?.user?._id ? mongoose.Types.ObjectId(res.locals.user._id) : null;

    // define params
    const qSearch = req.query.search ? JSON.parse(req.query.search) : null;
    const qFilter = req.query.filter ? JSON.parse(req.query.filter) : null;
    const qSorting = req.query.sort ? JSON.parse(req.query.sort) : null;
    const page = req.query.page ? parseInt(req.query.page) : 1
    const limit = req.query.limit ? parseInt(req.query.limit) : 10
    const is_mine = req.query.is_mine ? req.query.is_mine : 0
    
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
        if (key === '_id') {
          query[key] = mongoose.Types.ObjectId(qFilter[key]);
        } else {
          query[key] = qFilter[key]
        }

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

    // check ownership
    if (user_id && is_mine) {
      aggregate.push({
        $lookup: {
          from: "courses-ownerships",
          let: { course_id: "$_id", user_id },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$course_id", "$$course_id"] },
                    { $eq: ["$user_id", "$$user_id"] }
                  ]
                }
              }
            }
          ],
          as: "ownership"
        }
      })

      aggregate.push({
        $addFields: {
          is_bought: {$gt:[{$size:"$ownership"}, 0]}
        }
      })
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
    let execute = await Courses.aggregate(aggregate);
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
})


module.exports = app
