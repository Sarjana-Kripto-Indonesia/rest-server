const database = require("../config/database");

const BotsInactive = database.model("bots-inactives", new database.Schema({
    bot_id: String,
    active:Boolean,
    active_session_id: String,
    analysis: Object,
    averaging: Boolean,
    averaging_limit: Number,
    averaging_steps: Array,
    controller_id: String,
    created_at: Number,
    current_step: Number,
    exchange: String,
    next_step_drop_rate: String,
    next_step_price:String,
    positions: Array,
    status: String,
    symbol: String,
    take_profit_price: String,
    take_profit_ratio: String,
    updated_at: Number,
    usdt_per_order: Number,
    user_id: String,
    xaveraging: Boolean,
    averaging: Boolean,
    xforce_sell: Boolean,
    force_sell: Boolean,
    xpaused: Boolean,
    paused: Boolean,
    xblacklisted: Boolean,
    blacklisted: Boolean,
    xanalysis: Object,
    xaveraging_steps: Object,
    grid_profit: Number,
    name: String,
    type:String,
}, {
    timestamps: {
        deletedAt: "deleted_at",
    },
    toJSON: {
        transform: (doc, ret) => {
            delete ret._id;
            delete ret.__v;
        },
    },
}));

module.exports = BotsInactive;
