const { Server } = require('socket.io')
const WebSocket = require('ws');
const Bots = require('../modules/user/bots')
const PubSub = require("../services/redis-pubsub")

module.exports = (server) => {
    console.log('active-position-global');
    // initiate socket server
    const io = new Server(server, {
        path: '/active-position-global/',
        cors: {
            origin: '*'
        }
    });
    io.on('connection', async (socket) => {
        console.log("CONNECTED TO SOCKET");
        console.log(socket.id + " connected");
        console.log('---------BINANCE WEBSOCKET---------')
        let list = await Bots.availablePair({ exchange: "Binance" });
        let listOfSockets = [];

        list.forEach((pair) => {
            let pairToLower = pair ? pair.toLowerCase() : null;
            if (!pairToLower) {
                return
            } else {
                let ws = new WebSocket(`wss://stream.binance.com/ws/${pair.toLowerCase()}@ticker`);
                listOfSockets.push(ws);
                ws.on('message', (data) => {
                    // console.log(`websocket ${pairToLower}`, data);
                    socket.emit("ticker", data);
                });
            }
        });

        socket.on('disconnect-client', (data) => {
            // Disconnect from all binance WebSocket;
            listOfSockets.forEach((socket) => {
                try {
                    socket.close();
                } catch (err) {
                    console.log(`error on disconnect socket: ${err}`);
                }
            })
        })
    })
}