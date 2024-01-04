const TradeSessions = require("../models/trade-session");
const Setups = require("../models/setups");
const AdvancedSetups = require("../models/advanced-setups")

exports.calculateAmount = (array) => {
    return new Promise((resolve, reject) => {
        console.log('Calculate Amount');
        if (array.length == 0) resolve(0);
        let totalAmount = 0;
        array.forEach((val) => {
            totalAmount += val.amount_usd;
        })
        resolve(totalAmount);
    })
}

exports.calculateQuantity = (array) => {
    return new Promise((resolve, reject) => {
        console.log('Calculate Quantity');
        if (array.length == 0) resolve(0);
        let totalQty = 0;
        array.forEach((val) => {
            totalQty += val.quantity;
        })
        resolve(totalQty);
    })
}

exports.calculateStep = (array) => {
    return new Promise((resolve, reject) => {
        console.log('Calculate Step');
        if (array.length == 0) resolve(0);
        let totalStep = array.length;
        resolve(totalStep);
    })
}

exports.calculateBuy = (array) => {
    return new Promise((resolve, reject) => {
        console.log('Calculate Buy');
        if (array.length == 0) resolve(0);
        let totalBuy = 0;
        array.forEach((val) => {
            if (val.side == "BUY") {
                totalBuy++                
            }
        })
        resolve(totalBuy);
    })
}

exports.deleteTradeSession = (query, type) => {
    return new Promise(async (resolve, reject) => {
        console.log('in Promise');
        try {
            // find the setup (AUTOMATED or ADVANCED)
            let setup = null;
            let qTrade = null;

            // create deletion query. trade-sessions {user_id, exchange, bot_type}
            if (type == 'AUTOMATED') {
                setup = await Setups.findOne(query);
                qTrade = { user_id: setup.user_id, exchange: setup.selected_exchange.toLowerCase(), bot_type: 'AUTOMATED' }
            } else {
                setup = await AdvancedSetups.findOne(query);
                qTrade = { user_id: setup.user_id, exchange: setup.selected_exchange.toLowerCase(), bot_type: setup.type }
            }
            console.log('setup', setup);

            // if setup not exist, reject
            if (!setup) {
                reject(false)
            }

            // delete trade-sessions depends on qTrade query ↑
            console.log('qTrade', qTrade);
            let executeDelete = await TradeSessions.deleteMany(qTrade);
            console.log('executeDelete', executeDelete);
            console.log('quit Promise');
            resolve(true);
        } catch (error) {
            console.log('error in Promise', error);
            reject(false)
        }
    })
}