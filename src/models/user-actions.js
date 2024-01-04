const mongoose = require('mongoose');
const database = require("../config/database");

const UserActions = database.model("user-actions", new database.Schema({
    ref:{type: mongoose.Schema.Types.ObjectId, ref: 'bots'},
    user_id: String,
    action: String,
    status: String,
    message: String,
    details: Object
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

module.exports = UserActions;