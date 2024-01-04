//dependencies
const path = require('path');
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

//path to our proto file
const EXCHANGE_PROTO_FILE = path.join(__dirname, "../proto/exchange.proto");
const BOT_PROTO_FILE = path.join(__dirname, "../proto/bot.proto");
const SETUP_PROTO_FILE = path.join(__dirname, "../proto/setup.proto");
const PROFIT_PROTO_FILE = path.join(__dirname, "../proto/profit.proto");

const exchangeServiceUrl = `${process.env.EXCHANGE_SERVICE_URL}`;
const botServiceUrl = `${process.env.BOT_AND_SETUP_SERVICE_URL}`;
const setupServiceUrl = `${process.env.BOT_AND_SETUP_SERVICE_URL}`;

//options needed for loading Proto file
const options = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
};

const exchangePkgDefs = protoLoader.loadSync(EXCHANGE_PROTO_FILE, options);
const botPkgDefs = protoLoader.loadSync(BOT_PROTO_FILE, options);
const setupPkgDefs = protoLoader.loadSync(SETUP_PROTO_FILE, options);
const profitPkgDefs = protoLoader.loadSync(PROFIT_PROTO_FILE, options);

//load Definition into gRPC
const ExchangeService = grpc.loadPackageDefinition(exchangePkgDefs).ExchangeService;
const BotService = grpc.loadPackageDefinition(botPkgDefs).BotService;
const SetupService = grpc.loadPackageDefinition(setupPkgDefs).SetupService;
const ProfitService = grpc.loadPackageDefinition(profitPkgDefs).ProfitService;

//create the Client
const clientExchangeService = new ExchangeService(
  exchangeServiceUrl,
  grpc.credentials.createInsecure()
);

const clientBotService = new BotService(
  botServiceUrl,
  grpc.credentials.createInsecure()
);

const clientSetupService = new SetupService(
  setupServiceUrl,
  grpc.credentials.createInsecure()
);

const clientProfitService = new ProfitService(
  exchangeServiceUrl,
  grpc.credentials.createInsecure()
);

module.exports = {
  clientExchangeService,
  clientBotService,
  clientSetupService,
  clientProfitService
}