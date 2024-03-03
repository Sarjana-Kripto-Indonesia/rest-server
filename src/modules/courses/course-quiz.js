const express = require('express')
const app = express.Router()
const mongoose = require('mongoose')
const coursesQuizAnswers = require('../../models/courses-quiz-answers')
const courseModules = require('../../models/courses-modules')
app.post('/submit', async (req, res) => {
    console.log('submit quiz: /');
    try {
        // payload
        const user_id = res.locals.user._id ? mongoose.Types.ObjectId(res.locals.user._id) : null;
        if (!user_id) return res.status(400).json({ error: true, message: "User not found" });

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
        coursesQuizAnswers.create({
            module_id: moduleId,
            user_id,
            answers,
            total_correct,
            total_wrong
        }, async (err, reply) => {
            if (err) {
                res.status(400).json({
                    error: true,
                    message: err
                })
            }
            if (reply) {
                res.status(200).json({
                    status: true,
                    result: reply
                })
            }
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
