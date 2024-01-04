const mongoose = require('mongoose');
const database = require("../config/database");

const UserLogs = database.model("user-logs", new database.Schema({
    user: String,
    type: String,
    data: Object,
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

module.exports = UserLogs;