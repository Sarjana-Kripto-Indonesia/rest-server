const database = require("../config/database");

const Exchanges = database.model("Exchanges", new database.Schema({
    user_id: String,
    title: String,
    exchange_name: String,
    api_key: String,
    secret_key: String,
    passphrase:String
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

module.exports = Exchanges;