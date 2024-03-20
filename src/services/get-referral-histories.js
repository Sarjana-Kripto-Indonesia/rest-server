const ReferralHistories = require('../models/referrals-histories');
const mongoose = require('mongoose')

module.exports = (req, res) => {
    return new Promise(async (resolve, reject) => {
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

            return resolve(execute);
        } catch (error) {
            console.log(error);
            res.status(400).json({
            error: true,
            message: error
            })
        }
    })  
}