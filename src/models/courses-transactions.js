const database = require("../config/database");
const mongoose = require('mongoose')

const coursesTransactions = database.model("courses-transactions", new database.Schema({
    course_id: {type:mongoose.Types.ObjectId, ref: 'Courses'},
    payment: Object,
    history_payment: Array,
    course: Object,
    type: String,
    content: String,
    bank: Object,
    deletedAt:Date
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

module.exports = coursesTransactions;