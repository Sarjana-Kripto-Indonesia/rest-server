const database = require("../config/database");

const TradingHistory = database.model("trades", new database.Schema({
  symbol: String,
  side: String,
  user_id: String,
  bot_id: String,
  bot_name: String,
  bot_type: String,
  controller_id: String,
  created_at: Number,
  close_position: Boolean,
  reason: String,
  step: Number,
  exchange: String,
  session: String,
  price: Number,
  amount_coin: Number,
  amount_usd: Number,
  order_id: String,
  requested_at: Number,
  test_result: Object,
  executed_at: Number,
  execution_duration_ms: Number,
  amount_coin_filled: Number,
  amount_usd_filled: Number,
  average_fill_price: Number,
  pnl: Number
}, {
  timestamps: {
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
  toJSON: {
    transform: (doc, ret) => {
      delete ret.__v;
    },
  },
}));

module.exports = TradingHistory;