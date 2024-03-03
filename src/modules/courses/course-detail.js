const express = require('express')
const app = express.Router()
const Courses = require('../../models/courses');
const coursesTransactions = require('../../models/courses-transactions')
const coursesOwnerships = require('../../models/courses-ownerships')
const mongoose = require('mongoose')

// Additional Function
const removeIsCorrect = (data) => {
  if (Array.isArray(data)) {
    data.forEach((item, index) => {
      data[index] = removeIsCorrect(item);
    });
  } else if (typeof data === 'object' && data !== null) {
    for (const key in data) {
      if (key === 'is_correct') {
        delete data[key];
      } else {
        data[key] = removeIsCorrect(data[key]);
      }
    }
  }
  return data;
};

app.get('/:course_id', async (req, res) => {
  console.log('get course detail: /:course_id');
  try {
    let aggregate = [];
    let query = {
      _id: mongoose.Types.ObjectId(req.params.course_id)
    };
    
    const user_id = res.locals.user._id ? mongoose.Types.ObjectId(res.locals.user._id) : null;
      
      

    aggregate.push({ $match: query });

    // Lookup modules
    aggregate.push({
      $lookup: {
        from: "courses-syllabuses",
        localField: "_id",
        foreignField: "course_id",
        as: "syllabus_detail",
        pipeline: [
          {
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
          }
        ]
      },
    })

    // access the DB
    let execute = await Courses.aggregate(aggregate);
    let selectedCourse = execute.length > 0 ? execute[0] : {}
      
      
    // Check ownership
    if (user_id) {
      let courseOwnership = await coursesOwnerships.findOne({ course_id: mongoose.Types.ObjectId(req.params.course_id), user_id }).exec();
      if (courseOwnership) {
        selectedCourse.is_bought = true;
        //  Check quiz status
            selectedCourse.syllabus_detail.forEach((syllabus) => {
                syllabus.modules.forEach((module) => {
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
            })
        //  
      } else {
        selectedCourse.is_bought = false;
        selectedCourse.syllabus_detail.forEach((syllabus) => {
            syllabus.modules.forEach((module) => {
              module.video = module.video.length;
              module.quiz = module.quiz.length;
            })
        })
      }
    }

      

    res.status(200).json({
      success: true,
      data: selectedCourse,
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
