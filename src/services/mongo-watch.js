/**
 * Connection.js
 * Module to initiate watch mongo
 */
const Bots = require('../models/bots')
const AdvancedSetups = require('../models/advanced-setups')
const Notifications = require('../models/notification')
const Balances = require('../models/balance')
const { BroadcastSocket, AddSocketConnection, RemoveSocketConnection } = require('./connection');

/**
 *
 * @param {*} data
 * @returns user_id by operation type
 */
const getUserIdByOperationType = (data) => {
  switch (data.operationType) {
    case 'insert':
      return data.fullDocument.user_id
    case 'update':
      return data.fullDocument.user_id
    case 'replace':
      return data.fullDocument.user_id
    case 'delete':
      return 'ALL'
  }
}

const getNotificationSeverity = (data) => {
  switch (data.fullDocument.severity) {
    case 'low':
      return 'low'
    case 'medium':
      return 'low'
    case 'high':
      return 'high'
    case 'fatal':
      return 'high'
    default:
      return 'low'
  }
}

const checkImportantNotification = (event, user_id) => {
  let query = {
    user_id: user_id,
    severity: { $in: ['high', 'fatal'] },
    resolved: false
  }
  Notifications.find(query, (err, reply) => {
    if (reply) {
      BroadcastSocket(reply, event, user_id);      
    }
  })
}
/**
 * Adding property
 * @param {*} data
 * @returns normalized data
 */
const normalizeBot = (data) => {
  let tempObj = {}
  tempObj.grid_profit = data.grid_profit;
  tempObj._id = data._id.toString();
  tempObj.bot_id = data.bot_id;
  tempObj.pair_from = data.symbol.substr(0, data.symbol.length - 4)
  tempObj.pair_to = data.symbol.substr(-4)
  tempObj.symbol = data.symbol
  tempObj.exchange = data.exchange
  tempObj.name = data.name ? data.name : ''
  tempObj.type = data.type ? data.type : ''
  tempObj.price = {
    value: 0,
    percentage: 0
  }
  tempObj.quantity = 0
  tempObj.profit = {
    value: 0,
    percentage: 0
  }
  tempObj.average = 0;
  tempObj.logo = '/default.png';
  tempObj.status = data.status;
  if (data.positions.length > 0) {
    let quantity = 0
    let amountUsd = 0
    for (let position of data.positions) {
      quantity += position.quantity
      amountUsd += position.amount_usd
    }
    tempObj.average = amountUsd / quantity
    tempObj.amountUsd = amountUsd
    tempObj.quantity = quantity
  } else {
    tempObj.average = 0
    tempObj.amountUsd = 0
    tempObj.quantity = 0
  }

  return { ...data, ...tempObj }
}

Bots.watch(undefined, { fullDocument: 'updateLookup', fullDocumentBeforeChange: 'whenAvailable' }).on('change', (data) => {
  try {
    let user_id = getUserIdByOperationType(data)
    let payload = data
    let main_event = "bots"
    let event = data.operationType
    // console.log('data watch change on bots', data);

    // MAP DATA TO RETURN
    switch (event) {
      case 'insert':
        payload = normalizeBot(data.fullDocument)
        main_event = data.fullDocument.type !== 'AUTOMATED' ? 'advanced-bots' : 'bots'
        break
      case 'update':
        payload = normalizeBot(data.fullDocument)
        main_event = data.fullDocument.type !== 'AUTOMATED' ? 'advanced-bots' : 'bots'
        break
      case 'delete':
        payload = data.documentKey._id
        break
      default:
        payload = data
        break
    }

    // console.log("BROADCAST EVENT: ", `${main_event}-${event}`, user_id)
    BroadcastSocket(payload, `${main_event}-${event}`, user_id);
  } catch (err) {
    console.log("Bots watch error", err)
  }

});

Notifications.watch(undefined, { fullDocument: 'updateLookup', fullDocumentBeforeChange: 'whenAvailable' }).on('change', (data) => {
  try {
    let user_id = getUserIdByOperationType(data)
    let payload = data
    let main_event = "notification"
    let severity = getNotificationSeverity(data);
    if (severity == 'high') {
      checkImportantNotification(`${main_event}-${severity}`, user_id);
    } else{
      BroadcastSocket(payload, `${main_event}-${severity}`, user_id);
    }
  } catch (err) {
    console.log("Notification watch error", err)
  }

});
AdvancedSetups.watch(undefined, { fullDocument: 'updateLookup', fullDocumentBeforeChange: 'whenAvailable' }).on('change', (data) => {
  try {
    let user_id = getUserIdByOperationType(data)
    let payload = data
    let event = data.operationType

    // MAP DATA TO RETURN
    switch (event) {
      case 'insert':
        payload = data.fullDocument
        break
      case 'update':
        payload = data.fullDocument
        break
      case 'delete':
        payload = data.documentKey._id
        break
      default:
        payload = data
        break
    }

    // console.log("BROADCAST EVENT: ", `advanced-setups-${event}`, user_id)
    BroadcastSocket(payload, `advanced-setups-${event}`, user_id);
  } catch (err) {
    console.log("AdvancedSetups watch error", err)
  }
});

Balances.watch().on('change', (data) => {
  try {
    console.log('balances watch data', data);
    let payload = data
    let event = data.operationType

    // MAP DATA TO RETURN
    switch (event) {
      case 'insert':
        payload = data.fullDocument
        break
      default:
        payload = data
        break
    }
    console.log("balance watch", payload);
    if (payload.type == 'deposit') {
      Notifications.create({
        "user_id": payload.uid,
        "topic": "deposit_balance",
        "severity": "low",
        "code": 20001,
        "title": "Deposit Received",
        "message": `Deposit received $${payload.credit}`,
        "read": false,
        "resolved": true,
        "read_at": 0,
      }, async (err, data) => {
        if (err) {
          console.log('err balance watch deposit', err);
        }
        if (data) {
          console.log(data);
          console.log('successfully added new balance deposit notification')
        }
      })
    }
  } catch (err) {
    console.log("Balances watch error", err)
  }
});
module.exports = {
}