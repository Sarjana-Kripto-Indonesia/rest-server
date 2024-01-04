const moment = require('moment');
const redis = require('redis');

const client = redis.createClient({
  url: process.env.REDIS_URL
});

const pubSub = redis.createClient({
  url: process.env.REDIS_URL
});


var pingInterval;

/**
 *
 * @returns Connect client to redis
 */
const pubSubInitiate = async (symbol, callback) => {
  const sub = pubSub.duplicate();
  await sub.connect();
  await sub.subscribe(symbol.toString(), (message) => {
    let result = JSON.parse(message)
    let currentPrice = parseFloat(result.k.c)
    callback(currentPrice);
  });
}



const initiate = async () => {
  client.on('connect', () => {
    console.log("REDIS CONNECT")

    pingInterval = setInterval(() => {
      setKey("PROCESS", "PING", true)
    }, 5000)
  });
  client.on('reconnecting', () => {
    console.log("REDIS RECONNECTING")
  });
  client.on('ready', () => {
    console.log("REDIS READY")
  });
  client.on('error', err => {
    console.log('REDIS Error ' + err);
    clearInterval(pingInterval)
  });
  return await client.connect()
}

/**
 * Set key to object
 * @param {String} prefix
 * @param {String} key
 * @param {Object} data
 * @param {Number} ttl time to live in seconds utc
 */
const setKey = async (prefix, key, data, ttl) => {
  try {
    const stringData = JSON.stringify(data);
    if (!ttl) {
      ttl = 86400 * 30 // 30 days
    }

    await client.set(`${prefix}_${key}`, stringData, {
      EX: ttl
    })

    return {
      success: true,
      key,
      data
    };
  } catch (error) {
    console.log(error)
    return {
      success: false,
      err: error
    }
  }

}

/**
 * @param {String} prefix
 * @param {String} key
 */
const fetchKey = async (prefix, key) => {
  try {
    const stringData = await client.get(`${prefix}_${key}`)
    return {
      success: true,
      key: `${prefix}_${key}`,
      data: JSON.parse(stringData)
    }
  } catch (error) {
    console.log(error)
    return {
      success: false,
      err: error
    }
  }
}

/**
 * @param {String} prefix
 * @param {String} key
 */
const delKey = async (prefix, key) => {
  try {
    const stringData = await client.del(`${prefix}_${key}`)
    if (stringData == 1) {
      return {
        success: true
      }
    } else {
      return {
        success: false
      }
    }

  } catch (error) {
    console.log(error)
    return {
      success: false,
      err: error
    }
  }
}


module.exports = {
  initiate,
  pubSubInitiate,
  setKey,
  fetchKey,
  delKey
}