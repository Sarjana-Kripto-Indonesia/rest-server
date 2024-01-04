const { Server } = require('socket.io')
const client = require('../middlewares/socket-client')
const { firebase } = require("../services/firebase")

const { AddSocketConnection, RemoveSocketConnection } = require('../services/connection')

module.exports = (server) => {
  // initiate server
  const io = new Server(server, {
    path: '/realtime-update',
    cors: {
      origin: '*'
    }
  })

  // use middleware
  io.use(client)

  // initiate connection
  io.on('connection', async (socket) => {
    // console.log('WS-realtime-update connected', socket.id)
    const token = socket.handshake.auth.token
    const decodedToken = await admin.auth().verifyIdToken(token)
    const userId = decodedToken.uid

    AddSocketConnection({
      userId: userId,
      socket: socket,
      id: socket.id,
    });

    socket.on('disconnect', (socket) => {
      // console.log('WS-realtime-update disconnected', socket.id)
      RemoveSocketConnection(socket);
    })

    socket.on('disconnect-client', (data) => {
      socket.disconnect()
      RemoveSocketConnection(socket);
    })
  })
}