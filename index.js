require('dotenv').config()

// Initiate db
require('./src/models')

// GLOBAL LIBRARY
const express = require('express')
const cors = require('cors')
const app = express()
const bodyParser = require('body-parser')
var cron = require('node-cron');
const xlsx = require('node-xlsx').default;                       // EXCEL READER
const fernet = require('fernet');                                   //  FERNET
const useragent = require('express-useragent');                     // USER AGENT
let secret = new fernet.Secret(process.env.FERNET_SECRET);
global.token = new fernet.Token({ secret: secret, time: Date.parse(1) })
const http = require('http');
const server = http.createServer(app);                             // SOCKET IO
const axios = require('axios')

// GLOBAL NOT LIBRARY
const DefaultFormula = require('./src/models/formula');

// INITIATE REDIS
// const Redis = require("./src/services/redis")
// Redis.initiate()


// START SOCKET IO
const { Server } = require('socket.io')

// require('./src/ws/realtime-update')(server)
// require('./src/ws/notification')(server)


// MIDDLEWARES
app.use(useragent.express());
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(bodyParser.raw())
app.use(cors());
app.set('trust proxy', true)

// GEN INFO
const port = process.env.PORT || 4000
server.listen(port, () => {
  console.log(`Server up and running on port ${port}`)
})
app.get('/info', (req, res) => {
  const package = require('./package.json')
  const metadata = {
    name: package.name,
    description: package.description,
    version: package.version,
  }
  res.status(200).send(metadata)
})

// ADD DEFAULT FORMULA TO DB
app.post('/upload-formula', async (req, res) => {
  var obj = xlsx.parse(__dirname + '/formula.xlsx')[0]; // parses a file
  console.log('PROCESSING EXCEL');
  let formulaObj = {
    conservative: {
      key: 'A',
      name: 'Conservative',
      steps: []
    },
    moderate: {
      key: 'B',
      name: 'Moderate',
      steps: []
    },
    aggresive: {
      key: 'C',
      name: 'Aggresive',
      steps: []
    },
    very_aggresive: {
      key: 'D',
      name: 'Very Aggresive',
      steps: []
    },
  }

  let currentFormula = null;
  let indexToSkip = null;
  for (let i = 0; i < obj.data.length; i++) {
    if (indexToSkip == i) continue;
    let row = obj.data[i];
    if (row.length == 1) {
      currentFormula = row[0].toString().toLowerCase();
      indexToSkip = i++;
      continue;
    } else {
      let step = row[0];
      let dropRate = row[1];
      let multiplier = row[2];
      let profit = (parseFloat(row[3]) * 100).toFixed(2);
      let tempObj = {
        step: parseInt(step),
        drop_rate: parseFloat(dropRate),
        multiplier: parseFloat(multiplier),
        take_profit: parseFloat(profit),
        type: step < 5 ? 'DCA' : 'GRID',
      }
      formulaObj[currentFormula].steps.push(tempObj)
    }
  }
  try {
    for (let objKey in formulaObj) {
      let value = formulaObj[objKey];
      let res = await DefaultFormula.create({
        key: value.key,
        name: value.name,
        steps: value.steps,
        active: false
      })
    }
    res.status(200).send({ ok: true });
  } catch (error) {
    console.log('ERROR');
    console.log(error);
  }
})

require('./src/services/queue')

// User authorization
app.use('/user/auth', require('./src/modules/user/auth'))

// Start of Courses
app.use('/courses', require('./src/modules/courses/get'))
// app.get('/courses', async (req, res) => {
//   res.status(200).send({ ok: true });
// })
// End of Courses


// END-POINT WITH MIDDLEWARE
// app.use('/user/subscription', firebaseApi, require('./src/modules/user/subscription'))
// app.use('/user/profile', firebaseApi, require('./src/modules/user/profile'))
// app.use('/user/balance', firebaseApi, require('./src/modules/user/balance'))
// app.use('/user/referral', firebaseApi, require('./src/modules/user/referral'))
// app.use('/user', firebaseApi, require('./src/modules/user/index'))

// Endpoint without middleware
app.use('/pricing', require('./src/modules/pricing'))

// admin
// app.use('/admin/promo-codes', adminApi, require('./src/modules/admin/promo-codes'));
app.use('/admin/promo-codes', require('./src/modules/admin/promo-codes'));
// app.use('/admin/users', adminApi, require('./src/modules/admin/users'));
app.use('/admin/users', require('./src/modules/admin/users'));
app.use('/admin/balances', require('./src/modules/admin/balances'));


// public
app.use('/public/newsletter', require('./src/modules/public/newsletter'))
app.use('/public/volume', require('./src/modules/public/volume'))
app.get('/public/cryptowatch', async (req, res) => {
  const params = req.query

  axios.get(`https://api.cryptowat.ch/markets/${params.exchange}/${params.from}${params.to}/ohlc`, {
    params: params.data,
    headers: {
      "X-CW-API-Key": process.env.CRYPTOWATCH_API_KEY,
    }
  })
    .then(result => {
      return res.status(200).send(result.data)
    }).catch(err => {
      console.log("!!!! CRYPTOWATCH API ERR: ", err)
      return res.status(400).send(err)
    })
})

const { writeNotification } = require('./src/services/queue')
app.post('/test-queue', async (req, res) => {
  console.log("TEST QUEUE");
  await writeNotification({
    id: 'notif-xxxxxx',
    user_id: 'y6tjp7UetsaTETH8Werv3Ftysm63',
    topic: 'user_error_subscription',
    severity: 'low',
    code: 1000,
    message: 'User subscription has ended',
    read: false,
    resolved: false,
    read_at: -1
  });
  res.status(200).json({ ok: true });
})
/**
 * Bull Arena UI
 *
 * This is a web ui for monitoring queue backed by Bull and Bee Queue
 * For information please refers to: https://github.com/bee-queue/arena
 *
 * WARNING: THIS IS FOR DEVELOPMENT ONLY, DON'T USED FOR PRODUCTION
 * SINCE BULL ARENA DO NOT HAVE AUTHENTICATION METHOD!!!
 */
const Arena = require('bull-arena')
const Bee = require('bee-queue')

const arenaQueueOptions = {
  hostId: 'WORKER',
  type: 'bee',
  redis: {
    url: process.env.REDIS_URL
  }
}

const arenaConfig = Arena({
  Bee,
  queues: [{
    ...arenaQueueOptions,
    name: 'telegram_queue'
  }, {
    ...arenaQueueOptions,
    name: 'email_queue'
  }, {
    ...arenaQueueOptions,
    name: 'notification_queue'
  }, {
    ...arenaQueueOptions,
    name: 'log_queue'
  }, {
    ...arenaQueueOptions,
    name: 'newsletters'
  }, {
    ...arenaQueueOptions,
    name: 'balance_notification_queue'
  }, {
    ...arenaQueueOptions,
    name: 'balance_notification_queue_resolve'
  }, {
    ...arenaQueueOptions,
    name: 'withdraw_queue'
  }
  ],
}, {
  basePath: '/queue',
  disableListen: true
})


// NOTE: COMMENT HERE FOR PRODUCTION
app.use('/monitor', arenaConfig)

// INITIALIZE MONGO WATCH
// require("./src/services/mongo-watch")

// INITIALIZE CRON JOB
require("./src/services/cron-notification")()