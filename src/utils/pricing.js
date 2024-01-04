const TradeSessions = require("../models/trade-session");
const Pricing = require("../models/pricing");

exports.getPricing = () => {
    return new Promise((resolve, reject) => {
        Pricing.find().exec()
            .then((res) => {
                resolve(res);
            })
            .catch((err) => {
                reject(err)
            })
    })
}
