const mongoose = require('mongoose');
const database = require("../config/database");

const UserLogs = database.model("user-logins", new database.Schema({
    uid: String,
    ip: String,
    geo: Object,
    userAgent: Object,
    banned:Boolean,
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