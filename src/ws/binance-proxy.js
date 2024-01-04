const { Server } = require('socket.io')
const WebSocket = require('ws');
const Bots = require('../modules/user/bots')
const PubSub = require("../services/redis-pubsub")
module.exports = (server, ioBinance) => {
    console.log('binance proxy');
    // initiate socket server
    ioBinance.on('connection', async (socket) => {
        console.log("CONNECTED TO SOCKET");
        console.log(socket.id + " connected");
        console.log('---------BINANCE PROXY---------');
        let symbol = socket.handshake.query.symbol ? socket.handshake.query.symbol : false;
        console.log(symbol);    
        if (!symbol) return;
        let ws = new WebSocket(`wss://stream.binance.com/ws/${symbol.toLowerCase()}@ticker`);
        ws.on('message', (data) => {
            console.log(`websocket ${symbol.toLowerCase()}`, data);
            socket.emit(`${symbol}`, data);
        });
    })
}