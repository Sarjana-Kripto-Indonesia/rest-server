const database = require("../config/database");

const AdvancedSetups = database.model("advanced-setups", new database.Schema({
    user_id: String,
    symbol: String,
    type: String,
    exchange: String,
    controller_id: String,
    active:false,
    code:Number,
    analysis: {
        condition: String,
        indicators: Array
    },
    strategy: {
        usdt_per_order: Number,
        usdt_to_apply: Number,
        steps: Array,
        style:String
    },
    message:String,
    name: String,
    total_allocated: Number
}, {
    timestamps: {
        created_at: "created_at",
        updated_at: "updated_at",
    },
    toJSON: {
        transform: (doc, ret) => {
            delete ret.__v;
        },
    },
}));

module.exports = AdvancedSetups;