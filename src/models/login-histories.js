const database = require("../config/database");

const LoginHistories = database.model("login-histories", new database.Schema({
    id: String,
    user_id: String,
    ip: String,
    user_agent: String
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

module.exports = LoginHistories;

