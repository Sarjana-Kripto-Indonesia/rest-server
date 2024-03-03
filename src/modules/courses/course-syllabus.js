const express = require('express')
const app = express.Router()
const mongoose = require('mongoose')
const coursesSyllabus = require('../../models/courses-syllabuses')
const coursesOwnerships = require('../../models/courses-ownerships')

app.get('/', async (req, res) => {
  console.log('get syllabus: /');
  try {
    let aggregate = [];
    let query = {};
    let sorting = {};
    // main query

    const user_id = res?.locals?.user?._id ? mongoose.Types.ObjectId(res.locals.user._id) : null;

    // define params
    const course_id = req.query.course_id ? req.query.course_id : null;
    const qSorting = req.query.sort ? JSON.parse(req.query.sort) : null;
    const page = req.query.page ? parseInt(req.query.page) : 1
    const limit = req.query.limit ? parseInt(req.query.limit) : 10
    const start = ((page - 1) * (limit));

    // match
    query['course_id'] = mongoose.Types.ObjectId(course_id);
    aggregate.push({ $match: query });


    // sorting
    if (qSorting && Object.keys(qSorting).length > 0) {
      for (var key in qSorting) {
        sorting[key] = qSorting[key] === "ascending" ? 1 : -1;
      }
      aggregate.push({ $sort: sorting });
    }

    // Lookup modules
    aggregate.push({
      $lookup: {
        from: "courses-modules",
        localField: "_id",
        foreignField: "syllabus_id",
        as: "modules",
        pipeline: [
          {
            $lookup: {
              from: "courses-quiz-answers",
              let: { module_id: "$_id", user_id },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $eq: ["$module_id", "$$module_id"] },
                        { $eq: ["$user_id", "$$user_id"] }
                      ]
                    }
                  }
                }
              ],
              as: "user_answer"
            }
          }
        ]
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
    let execute = await coursesSyllabus.aggregate(aggregate);

    // Check ownership
    let courseOwnership = await coursesOwnerships.findOne({ course_id: mongoose.Types.ObjectId(course_id), user_id }).exec();
    for (let index = 0; index < execute[0].data.length; index++) {
      let data = execute[0].data[index];
      if (courseOwnership) {
        data?.modules?.forEach((module) => {
          module.quiz_done = module.user_answer.length > 0 ? true : false
          if (module.quiz_done) {
            module.quiz.forEach((quiz, idx) => {
              let currentAnswerIdx = module.user_answer[0].answers[idx].order - 1
              quiz.answers[currentAnswerIdx].chosen = true
            })
          } else {
            // Not answered yet don't show is_correct
            module.quiz.forEach((quiz, idx) => {
              quiz.answers.forEach((currrent) => {
                delete currrent.is_correct
              })
            })
          }
        })
      } else {
        data?.modules.forEach((module) => {
          module.video = module.video.length;
          module.quiz = module.quiz.length;
        })
      }
    }

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
