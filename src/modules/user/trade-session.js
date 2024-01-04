const mongoose = require('mongoose');
const TradeSession = require("../../models/trade-session");


exports.deal = async (req, res, callback) => {
    try {
        console.log('trade');
        let aggregate = [];
        let query = {};
        const uid = res.locals.uid ? res.locals.uid : null;
        query['user_id'] = uid;
        if (req.query.range == 'daily') {
            let current = new Date();
            let y, m, d,start,end;
            y = current.getFullYear();
            m = current.getMonth();
            d = current.getDate();
            start = new Date(y, m, d).getTime();
            end = new Date(y, m, d + 1).getTime();
            query["ended_at"] = { $gte: start, $lt: end };
            delete req.query.range;
        }

        aggregate.push({ $match:query });
        aggregate.push({
            $group: {
                _id: null,
                trades: { $sum: 1 }
            }
        })
        const execute = await TradeSession.aggregate(aggregate);
        return callback({
            success: true,
            data:execute[0]
        })
    } catch (error) {
        return callback({
            success: false,
            msg: error
        })
    }
}