const { Server } = require('socket.io');
const client = require('../middlewares/socket-client');
var cron = require('node-cron');
const Notification = require('../models/notification')
const checkImportantNotification = (socket)=>{
    let query = {
        user_id:socket.locals.uid,
        severity:{$in:['high', 'fatal']},
        resolved:false
    }
    Notification.find(query, (err, reply)=>{
        socket.emit('important-notification',reply );
    })
}


module.exports = (server) => {
    const ioCron = new Server(server, {
        path: '/cron-notification/',
        cors: {
            origin: '*'
        }
    })

    ioCron.use(client)

    // initiate socket server
    ioCron.on('connection', async (socket) => {
        console.log("CONNECTED TO SOCKET CRON NOTIFICATION: "+socket.id);
        console.log();
        
        Notification.watch().on('change', (data) => {
            let query = {
                user_id:socket.locals.uid,
            }
            Notification.find(query, (err, reply) => {
                socket.emit('notification', {uid:socket.locals.uid});
                checkImportantNotification(socket);
            })
        });

        cron.schedule('*/10 * * * * *', () => {
            // FIND ON DB FOR SPECIFIC USER NOTIFICATION, IF THERE'S ANY READ FALSE SEND IT BACK TO CLIENT
            checkImportantNotification(socket);
        });
    })


}