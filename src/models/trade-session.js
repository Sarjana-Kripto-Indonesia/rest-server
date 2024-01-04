const database = require("../config/database");

const TradeSession = database.model("trade-sessions", new database.Schema({
    session_id: String,
    user_id: String,
    symbol: String,
    exchange:String,
    bot_type:String,
    started_at: Number,
    ended_at: Number,
    is_active: Boolean,
    positions:Array
}, {
    collection: "trade-sessions",
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

module.exports = TradeSession;