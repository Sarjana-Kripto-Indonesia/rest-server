const database = require("../config/database");

const Setups = database.model("Setups", new database.Schema({
    user_id: String,
    token_exception: Array,
    selected_exchange: String,
    controller_id: String,
    active:false,
    analysis: {
        condition: String,
        indicators: Array,
        minimum_trading_volume:Number
    },
    strategy: {
        max_concurrent_trading_pair: Number,
        usdt_per_order: Number,
        usdt_to_apply: Number,
        style: {
            active: Boolean,
            key: String,
            name:String,
            steps: Array
        }
    }
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

module.exports = Setups;