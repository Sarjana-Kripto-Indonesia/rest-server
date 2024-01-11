const express = require('express')
const app = express.Router()
const mongoose = require('mongoose')
const coursesModule = require('../../models/courses-modules')

app.get('/', async (req, res) => {
console.log('get module: /');
    try {
        let aggregate = [];
        let query = {};
        let sorting = {};
        // main query

        // define params
        const syllabus_id = req.query.syllabus_id ? req.query.syllabus_id : null;
        const qSorting = req.query.sort ? JSON.parse(req.query.sort) : null;
        const page = req.query.page ? parseInt(req.query.page) : 1
        const limit = req.query.limit ? parseInt(req.query.limit) : 10
        const start = ((page - 1) * (limit));

        // match
        query['syllabus_id'] = mongoose.Types.ObjectId(syllabus_id);
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
        let execute = await coursesModule.aggregate(aggregate);

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
