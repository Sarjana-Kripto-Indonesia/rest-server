const express = require('express')
const app = express.Router()
const mongoose = require('mongoose')
const coursesQuizAnswers = require('../../models/courses-quiz-answers')
const courseModules = require('../../models/courses-modules')
const coursesSyllabus = require('../../models/courses-syllabuses')
const coursesOwnerships = require('../../models/courses-ownerships')


app.post('/submit', async (req, res) => {
    console.log('submit quiz: /');
    try {
        // payload
        const user_id = res.locals.user._id ? mongoose.Types.ObjectId(res.locals.user._id) : null;
        if (!user_id) return res.status(400).json({ error: true, message: "User not found" });

        const courseId = req.body.course_id ? mongoose.Types.ObjectId(req.body.course_id) : null;
        const moduleId = req.body.module_id ? req.body.module_id : null;
        let answers = req.body.answers ? req.body.answers : null;


        // get course modules
        const getModule = await courseModules.findOne({ _id: moduleId }).exec();
        if (!getModule) return res.status(400).json({ error: true, message: "Quiz not found" })
        

        // compare quiz array id with user answers
        let total_correct = 0
        let total_wrong = 0
        answers.forEach((answer, idx) => {
            const questionAnswer = getModule?.quiz[idx]?.answers;
            const correctAnswer = questionAnswer.find(element => element.is_correct == true);
            if (answer.order == correctAnswer.order && answer.value.toString() == correctAnswer.value.toString()) {
                answer.is_correct = true
                total_correct++
            } else {
                answer.is_correct = false
                total_wrong++
            }
        })
        
        // post submit along with the grade
        const quizAnswer = await coursesQuizAnswers.create({
            module_id: moduleId,
            user_id,
            answers,
            total_correct,
            total_wrong
        })

        // CHECK IF DONE
        let isCourseAllDone = true;

        // compare module length with existing answers
        const qGetModule = [
            {
                $match: {course_id: courseId}
            },
            {
                $lookup: {
                    from: "courses-modules",
                    localField: "_id",
                    foreignField: "syllabus_id",
                    as: "modules",
                },
            },
            {$unwind:"$modules"},
            
            {$project:{
                "_id":0,
                "module_id":"$modules._id",
                "quizLength": { $size: "$modules.quiz" }
            }},
            {$match:{
                "quizLength":{$gt:0}
            }},
            {
                $group: {
                    _id: "_id",
                    data: {
                        $push: "$$ROOT",
                    },
                },
            },
        ]

        const getModules = await coursesSyllabus.aggregate(qGetModule);


        // get answers of quiz
        if (getModules.length > 0 && getModules[0].data.length > 0) { // check quiz existance
            for (let val of getModules[0].data) {
                const getAnswer = await coursesQuizAnswers.findOne({ module_id: mongoose.Types.ObjectId(val.module_id), user_id}).exec();
                if (!getAnswer) {
                    isCourseAllDone = false
                }
            }
        } else {
            isCourseAllDone = true
        }


        // IF ALL IS ANSWERED THEN SET OWNERHSIP TO IS_DONE
        const setOwnership = await coursesOwnerships.updateOne({course_id:courseId, user_id}, {$set:{is_done:true}})
       
        return res.status(200).json({
            status: true,
            isCourseAllDone,
            reply:quizAnswer,
            modules: getModules
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
