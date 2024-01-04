// connections.js
const SocketConnections = [];
const SocketNotificationConnections = [];

const BroadcastSocket = (data, event, user_id) => {
  SocketConnections.forEach((conn) => {
    if (user_id === conn.userId || user_id == 'ALL') {
      conn.socket.emit(event, data);
    }
  });
}

const AddSocketConnection = (conn) => {
  let exsConn = SocketConnections.find(c => conn.id === c.id); // TODO: id
  if (!exsConn) {
    SocketConnections.push(conn);
  }
}

const RemoveSocketConnection = (conn) => {
  let exsConn = SocketConnections.find(c => conn.id === c.id); // TODO: id
  if (exsConn) {
    SocketConnections.splice(SocketConnections.indexOf(exsConn), 1);
  }
}

module.exports = {
  BroadcastSocket,
  AddSocketConnection,
  RemoveSocketConnection
}