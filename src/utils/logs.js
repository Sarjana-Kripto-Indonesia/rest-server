const UserLogs = require("../models/user-logs");
exports.write = (user, type, data) => {
    return new Promise((resolve, reject) => {
        UserLogs.create({
            user, type, data
        }, (err, reply) => {
            if (err) {
                console.log(`Failed to write logs ${user} - ${type}`)
                resolve()
            }
            if (reply) {
                resolve()
            }
        })
    })
}