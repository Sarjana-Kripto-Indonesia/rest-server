const express = require('express')
const mongoose = require('mongoose')
const midtransClient = require('midtrans-client');
const app = express.Router()
const Courses = require('../../models/courses')
const coursesTransactions = require('../../models/courses-transactions')
const coursesOwnerships = require('../../models/courses-ownerships')
const snap = new midtransClient.Snap({
  isProduction: false,
  serverKey: 'SB-Mid-server-xKyCOvyiM2QR4r-alOgLGrjK',
  clientKey: 'SB-Mid-client-Gk6495kwINKCvAyo',
});


app.get('/user-transaction', async (req, res) => {
    console.log('get all transactions: /user-transaction');
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
        const is_mine = req.query.is_mine ?  1 : 0


        // special cases
        if (is_mine) {
            query['user_id'] =
                res.locals.user._id ? mongoose.Types.ObjectId(res.locals.user._id) : null
        }

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

        console.log('aggregate0', aggregate[0])
        console.log('aggregate1', aggregate[1])
        console.log('aggregate2', aggregate[2])
        console.log('aggregate3', aggregate[3])
        // access the DB
        let execute = await coursesTransactions.aggregate(aggregate);
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
});

app.post('/buy-course', async (req, res) => {
    console.log('post transaction: /');
    console.log(res.locals.user);
    try {
        // Body
        let course_id = req.body.course_id ? mongoose.Types.ObjectId(req.body.course_id) : null;
        if (!course_id) return res.status(400).json({
            error: true,
            message:"Please provide course ID"
        });

        // Check if course exist
        let getCourse = await Courses.findOne({ _id: course_id })
        if (!getCourse) return res.status(400).json({
            error: true,
            message:"Couldn't find existing course to proceed"
        })
        let discountPrice = getCourse.price.disc ? parseFloat(getCourse.price.disc) : 0; 
        let coursePrice = getCourse.price.value - discountPrice

        // Payment Gateway


        // Get Price

        // Payment Create
        let createPayment = await coursesTransactions.create({
            course_id: course_id,
            user_id:res.locals.user._id,
            payment: {
                price: coursePrice ? coursePrice : 0,
                status: "success"
            },
            history_payment: [],
            course: getCourse,
            type: "class",
            content: "Payment for course XXXX",
            bank: { type: "BCA", number: 331021312312 },
            deletedAt: null
        });

        console.log('createPayment', createPayment)

        // Ownership Create
        let createOwnership = await coursesOwnerships.create({
            course_id: course_id,
            transaction_id: createPayment._id,
            user_id:res.locals.user._id
        })

        const transactionDetails = {
            order_id: `${res.locals.user._id}-${getCourse._id}}`,
            gross_amount: coursePrice,
        };

        // const transactionToken = await snap.createTransactionToken({ transaction_details: transactionDetails });
        const transactionToken = await snap.createTransaction({ transaction_details: transactionDetails });

        console.log('createOwnership', createOwnership);

        console.log('transactionToken', transactionToken);

         // Log the status of the transaction
        // const transactionStatus = await snap.transaction.status(transactionToken);
        // console.log('Transaction Status:', transactionStatus);

        res.status(200).json({
            success: true,
            transactionToken
        })

    } catch (error) {
        console.log('error guys');
        console.log(error);
        res.status(400).json({
            error: true,
            message: error.message ? error.message : 'transaction error'
        })
    }
})



module.exports = app
