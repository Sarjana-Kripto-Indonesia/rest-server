const mongoose = require('mongoose');
const database = require("../config/database");

const UserProperties = database.model("user-properties", new database.Schema({
    user_id:String,
    key: String,
    value: String,
    description: Object,
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

module.exports = UserProperties;