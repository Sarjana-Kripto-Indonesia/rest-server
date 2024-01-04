const { Server } = require('socket.io')
const Bots = require('../modules/user/bots')
const PubSub = require("../services/redis-pubsub")

module.exports = (server) => {
  // initiate socket server
  const io = new Server(server, {
    path: '/active-position/',
    cors: {
      origin: '*'
    }
  })

  io.on('connection', async (socket) => {
    let token = socket.handshake.query.bearer_token ? socket.handshake.query.bearer_token : false
    
    if (!token) return socket.disconnect()
    let uid = ''
    
    try {
      let decodedToken = await admin.auth().verifyIdToken(token)
      uid = decodedToken.user_id
    } catch (error) { 
      return socket.disconnect()
    }
  
    socket.on('fetch-position', (data) => {
      let positionsArray = []
      let activePositions = {}
      let symbols = [];
      let query = { user_id: uid, exchange: data.exchange };
      if (data.symbol) {
        query.symbol = data.symbol;
      }
      if (data.sorting) {
        query.sorting = data.sorting;
      }
      Bots.findByUser(query, function (reply) {
        let index = 0
        reply.data.forEach((val) => {
          let tempObj = {}
          tempObj._id = val._id.toString();
          tempObj.bot_id = val.bot_id;
          tempObj.pair_from = val.symbol.substr(0, val.symbol.length - 4)
          tempObj.pair_to = val.symbol.substr(-4)
          tempObj.symbol = val.symbol
          tempObj.price = {
            value: 0,
            percentage: 0
          }
          tempObj.quantity = 0
          tempObj.profit = {
            value: 0,
            percentage: 0
          }
          tempObj.average = 0
          tempObj.logo = '/default.png'
          tempObj.status = val.status
          tempObj.grid_profit = val.grid_profit
          if (val.positions.length > 0) {
            let quantity = 0
            let amountUsd = 0
            for (let position of val.positions) {
              quantity += position.quantity
              amountUsd += position.amount_usd
            }
            tempObj.average = amountUsd / quantity
            symbols.push({ name: val.symbol, index: index, average: tempObj.average, amountUsd: amountUsd, pair: val.symbol, quantity: quantity, grid_profit })
          } else {
            symbols.push({ name: val.symbol, index: index, average: 0, amountUsd: 0, pair: val.symbol, quantity: 0, grid_profit:0 })
          }
          activePositions[val.symbol] = tempObj
          index++
        })

        for (let symbol of symbols) {
          PubSub.initialize(`bz_kline_${symbol.pair}`, function (reply) {
            // REPLY equal to CurrentPrice Float from PubSub each Pair
            let pnlPercentage = symbol.average == 0 ? 0 : (((reply - symbol.average) / symbol.average))
            let pnl = pnlPercentage * symbol.amountUsd
            socket.emit('current_price', { name: symbol.name, index: symbol.index, priceValue: reply, pnl: pnl.toFixed(3), pnlPercentage: pnlPercentage.toFixed(3), quantity: symbol.quantity.toFixed(4) })
          })
        }

        for (let pair in activePositions) {
          positionsArray.push(activePositions[pair])
        }

        socket.emit('positions', {data:positionsArray, pairs:reply.pairs})
      })
    })

    
    socket.on('disconnect', (socket) => {
      console.log(`socket.io disconnected: ${socket.id}`)
    })

    socket.on('disconnect-client', (data) => {
      socket.disconnect()
    })
  })
}