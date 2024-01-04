const cron = require('node-cron');
const Notification = require('../models/notification')
const { BroadcastSocket, AddSocketConnection, RemoveSocketConnection } = require('./connection');

const checkImportantNotification = () => {
    let pipeline = [];
    let query = {
        severity: { $in: ['high', 'fatal'] },
        resolved: false
    }
    pipeline.push({ $match: query });
    pipeline.push({
        $group: {
            _id: "$user_id",
            data: {$push:"$$ROOT"}
        }
    })
    Notification.aggregate(pipeline, (err, reply) => {
        if (err) {
            console.log('error check cron', err)
        } else { 
            reply.forEach((val) => {
                BroadcastSocket(val.data, `notification-high`, val._id);
            })
        }
    })
}


module.exports = () => {
    cron.schedule('*/10 * * * * *', () => {
        checkImportantNotification();
    });
}