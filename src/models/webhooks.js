const database = require("../config/database");
const mongoose = require('mongoose')

const Webhooks = database.model("webhooks", new database.Schema({
    data: Object
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

module.exports = Webhooks;