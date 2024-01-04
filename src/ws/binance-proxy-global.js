const { Server } = require('socket.io')
const WebSocket = require('ws');
const Bots = require('../modules/user/bots')
const PubSub = require("../services/redis-pubsub")
module.exports = (server) => {
    const ioBinance = new Server(server, {
        path: '/binance-proxy/',
        cors: {
            origin: '*'
        }
    })

    console.log('binance proxy global');
    // initiate socket server
    ioBinance.on('connection', async (socket) => {
        console.log("CONNECTED TO SOCKET");
        console.log(socket.id + " connected");
        console.log('---------BINANCE PROXY GLOBAL---------');
        // let ws = new WebSocket(`wss://stream.binance.com/ws/!ticker@arr`);
        let ws = new WebSocket(`wss://stream.bitzenius.com/stream/ticker`);
        ws.on('message', (data) => {
            socket.emit(`binance_ticker`, data);
        });
    })
}