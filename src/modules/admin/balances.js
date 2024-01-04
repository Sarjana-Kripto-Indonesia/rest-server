const express = require('express')
const app = express.Router()
const { admin } = require('../../services/firebase')
const Users = require('../../models/users')
const Bots = require('../../models/bots')
const Trades = require('../../models/trading-history')
const Invoices = require('../../models/invoices')
const Balances = require('../../models/balance')
const { constants } = require('ethers')
const { async } = require('@firebase/util')
const balance = require('../../ws/balance')
const { sendEmail, processWithdraw } = require('../../services/queue')

const {
    getUserById,
    getUserByUid,
    getUserByWalletVa,
    getUserBalanceByUid,
    setUserSubscription
} = require('../../helpers/user')

app.get('/withdraw-request', async (req, res) => {
    console.log('admin-balances: /withdraw-request');

    try {
        let aggregate = [];
        let query = {};
        let sorting = {};

        // pre-defined params
        query['type'] = 'withdraw'

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

        // lookup to user
        aggregate.push({
            $lookup: {
                from: 'users',
                localField: 'uid',
                foreignField: 'uid',
                as: 'user'
            }
        })

        //grouping all match documents 
        aggregate.push({
            $group: {
                _id: null,
                data: { $push: "$$ROOT" },
                total_withdraw: { $sum: "$debt" },
                count: { $sum: 1 }
            }
        })

        // slice the data depends on the start and limit
        aggregate.push(
            {
                $project: {
                    _id: 0,
                    data: { $slice: ["$data", start, limit] },
                    total_withdraw: 1,
                    count: 1,
                }
            }
        )

        console.log('query', query);
        console.log('sorting', sorting);
        console.log('aggregate', aggregate);

        // access the DB
        let execute = await Balances.aggregate(aggregate);
        console.log(execute);

        if (execute.length > 0) {
            let tempData = execute.length > 0 ? execute[0].data : [];
            for (let i = 0; i < tempData.length; i++){
                tempData[i].user_balance = await getUserBalanceByUid(tempData[i].uid);
            }
        }


        res.status(200).json({
            success: true,
            data: execute.length > 0 ? execute[0].data : [],
            total_withdraw: execute.length > 0 ? execute[0].total_withdraw : 0,
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

app.post('/withdraw-process', async (req, res) => {
    console.log('admin-balances (post): /withdraw-process');
    console.log(req.body);
    try {
        const id = req.body.id ? req.body.id : null;
        if (!id) {
            return res.status(400).json({
                error: true,
                message: 'Withdrawal Request ID is not valid.'
            })
        }
        console.log('withdraw doc id', id);

        let doc = await Balances.findById(id).exec();

        if (doc) {
            let user = await Users.findById(doc.user_id).exec()
            let url = 'bitzenius.com';
            doc.set('status', 1)
            doc.set('reference', {
                type: 'crypto',
                id: url
            })
            await doc.save();

            sendEmail({
                to: user.email,
                subject: 'Successful Withdrawal Transfer',
                template: 'balance-withdrawal-success',
                data: {
                    user: {
                        display_name: user.display_name,
                        wallet: user.wallet,
                    },
                    amount: doc.debt,
                    transaction_url: url
                }
            });

            console.log('balance', doc);
            res.status(200).json({
                success: true,
                data: doc
            });
   
        } else {
            return res.status(400).json({
                error: true,
                message: 'Withdrawal Request document is not found.'
            })
        }
    } catch (error) {
        console.log(error);
        res.status(400).json({
            error: true,
            message: error
        })
    }
})
module.exports = app