const { Server } = require('socket.io')
const client = require('../middlewares/socket-client')
const Balances = require('../models/balance')

module.exports = (server) => {
  // initiate server
  const io = new Server(server, {
    path: '/balance/',
    cors: {
      origin: '*'
    }
  })

  // use middleware
  io.use(client)

  // initiate connection
  io.on('connection', async (socket) => {
    console.log('WS-BALANCE connected', socket.id)

    Balances.watch().on('change', (data) => {
      Balances.findOne(data.documentKey._id, (err, balance) => {
        if (balance.uid == socket.locals.uid) {
          socket.emit('balance', {
            id: data.documentKey._id,
            operation: data.operationType,
            data: balance
          })
        }
      })
    })
    
    socket.on('disconnect', (socket) => {
      console.log('WS-BALANCE disconnected', socket.id)
    })

    socket.on('disconnect-client', (data) => {
      socket.disconnect()
    })
  })
}