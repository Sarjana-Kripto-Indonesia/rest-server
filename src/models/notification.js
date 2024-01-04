const database = require("../config/database");

const Notification = database.model("user-notifications", new database.Schema({
    id: String,
    user_id: String,
    topic: String,
    severity: String,
    code: Number,
    title:String,
    message: String,
    read: Boolean,
    resolved: Boolean,
    read_at: Number,
    action:Object
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

module.exports = Notification;

