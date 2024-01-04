const express = require('express')
const app = express.Router()
const Trades = require('../../models/trading-history')
app.get('/', async (req, res) => {
    console.log('public get-volume: /');
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

        //grouping all match documents 
        aggregate.push({
            $group: {
                _id: null,
                data: { $push: "$$ROOT" },
                total_volume: { $sum: "$amount_usd_filled" },
                count: { $sum: 1 }
            }
        })

        // slice the data depends on the start and limit
        aggregate.push(
            {
                $project: {
                    _id: 1,
                    records: { $slice: ["$data", start, limit] },
                    total_volume: 1,
                    count: 1,
                }
            }
        )

        // access the DB
        let execute = await Trades.aggregate(aggregate);
        console.log(execute);

        res.status(200).json({
            success: true,
            // data: execute.length > 0 ? execute[0].records : [],
            // count: execute.length > 0 ? execute[0].count : 0,
            total_volume: execute.length > 0 ? execute[0].total_volume : 0,
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
