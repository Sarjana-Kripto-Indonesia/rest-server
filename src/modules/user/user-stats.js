const fernet = require('fernet');                                 //  FERNET
let secret = new fernet.Secret(process.env.FERNET_SECRET);
const Exchanges = require("../../models/exchanges")
const { botApi } = require('../../services/bot-api');
const grpcUtil = require("../../utils/grpc");

exports.verifyExchangeParams = async (req, res, callback) => {
  try {
    console.log('VALIDATING EXCHANGE USER')
    console.log(req);
    // GET RELATED USER API AND SECRET

    // PROCESS BOT API
    let url = `/client/api-keys/verify/${req.exchange_name.toLowerCase()}`;
    let data = { ...req };
    delete data.exchange_name;
    console.log(data);
    botApi.post(url, data).then((result) => {
      return callback({
        success: true,
        data: result.data
      })
    }).catch((err) => {
      return callback({
        success: false,
        statusCode: err.response.status,
        message: err.response.statusText
      })
    })
  } catch (error) {
    console.log(error);
    return callback({
      success: false,
      statusCode: 400,
      error: error,
    })
  }
}
exports.getAvailableToken = async (req, res, callback) => {
  try {
    console.log('GET AVAILABLE TOKEN')
    console.log(req.query.exchange);
    let market = req.query.market ? req.query.market : 'spot'

    if (req.query.exchange.includes('Demo')) {
      req.query.exchange = 'Binance'
    }

    // PROCESS BOT API
    let q = { exchange: req.query.exchange.toLowerCase(), minimum_volume: 0 };
    if (market == 'spot') {
      grpcUtil.clientExchangeService.Symbols(q, (err, response) => {
        if (err) {
          return callback({
            success: false,
            error_code: err.code,
            error: err.details,
          })
        }
        return callback({
          success: true,
          data: {
            result: response.symbols,
            exchange: response.exchange
          }
        })
      })
    } else {
      grpcUtil.clientExchangeService.FuturesSymbols(q, (err, response) => {
        if (err) {
          return callback({
            success: false,
            error_code: err.code,
            error: err.details,
          })
        }
        return callback({
          success: true,
          data: {
            result: response.symbols,
            exchange: response.exchange
          }
        })
      })
    }
  } catch (error) {
    console.log(error);
    return callback({
      success: false,
      statusCode: 400,
      error: error,
    })
  }
}

