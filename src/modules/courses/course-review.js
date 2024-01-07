const express = require('express')
const app = express.Router()
const mongoose = require('mongoose')
const coursesReviews = require('../../models/courses-reviews')
app.post('/', async (req, res) => {
    console.log('create review: /');
    try {
        // body
        const course = req.body.course ? req.body.course : null;
        const user_id = req.body.user_id ? req.body.user_id : null;
        const rating = req.body.rating ? req.body.rating : null;
        const comment = req.body.comment ? req.body.comment : null;

        // validator
        if (!course || !user_id) {
            return res.status(400).json({
                error: true,
                message:'Please provide course and user_id'
            })
        }

        if (rating > 5 || rating < 0) {
            return res.status(400).json({
                error: true,
                message:'Rating supposed to be between 1 - 5'
            })
        }

        // access the DB
        coursesReviews.create({
            course_id: course,
            user_id: user_id,
            rating: rating,
            comment: comment,
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

app.get('/', async (req, res) => {
console.log('get all reviews: /');
    try {
        let aggregate = [];
        let query = {};
        let sorting = {};
        // main query

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
        let execute = await coursesReviews.aggregate(aggregate);

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
