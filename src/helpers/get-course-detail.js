const Courses = require('../models/courses');
const coursesTransactions = require('../models/courses-transactions')
const coursesOwnerships = require('../models/courses-ownerships')
const mongoose = require('mongoose')

module.exports = async (user_id, course_id) => {
console.log('helper get detail course');
  try {
    let aggregate = [];
    let query = {
        _id: mongoose.Types.ObjectId(course_id)
    };
      

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

    // Get ratings and attendees
    aggregate.push({
      $lookup: {
        from: "courses-ownerships",
        localField: "_id",
        foreignField: "course_id",
        as: "attendees"
      }
    })

    // Get Completion
    if (user_id) {
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
    }



    // access the DB
    let execute = await Courses.aggregate(aggregate);
    let selectedCourse = execute.length > 0 ? execute[0] : {}
    selectedCourse.attendees_count = selectedCourse?.attendees?.length || 0


    if (user_id) {
      // Check ownership
      let courseOwnership = await coursesOwnerships.findOne({ course_id: mongoose.Types.ObjectId(course_id), user_id }).exec();
      if (courseOwnership) {
        selectedCourse.is_bought = true;
        //  Check quiz status
        if (selectedCourse.syllabus_detail.length > 0) {
          selectedCourse.syllabus_detail.forEach((syllabus) => {
            syllabus.modules.forEach((module) => {
              module.quiz_done = (module.user_answer.length > 0 || module.quiz?.length == 0) ? true : false
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
        }


        //Check is_done = all module finished


      } else {
        selectedCourse.is_bought = false;
        if (selectedCourse.syllabus_detail && selectedCourse.syllabus_detail.length > 0) {
          selectedCourse.syllabus_detail.forEach((syllabus) => {
            syllabus.modules.forEach((module) => {
              module.video = module.video.length;
              module.quiz = module.quiz.length;
            })
          })
        }

      }


    } else {
      selectedCourse.is_bought = false;
      if (selectedCourse.syllabus_detail.length > 0) {
        selectedCourse.syllabus_detail.forEach((syllabus) => {
          syllabus.modules.forEach((module) => {
            module.video = module.video.length;
            module.quiz = module.quiz.length;
          })
        })
      }
    }

    // * Calculate is done (all quiz answered)
    let isDone = true
    if (selectedCourse.syllabus_detail && selectedCourse.syllabus_detail.length > 0) {
      for (let index = 0; index < selectedCourse.syllabus_detail.length; index++) {
        const syllabus = selectedCourse.syllabus_detail[index];
        const any_not_done = syllabus.modules?.some((module) => !module?.quiz_done)
        if (any_not_done) {
          isDone = false
          break
        }
      }
    }

    selectedCourse.is_done = isDone
    return selectedCourse;
  } catch (error) {
    console.log(error);
    res.status(400).json({
      error: true,
      message: error
    })
  }
}