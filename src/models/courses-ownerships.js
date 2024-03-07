const database = require("../config/database");
const mongoose = require('mongoose')

const coursesOwnerships = database.model("courses-ownerships", new database.Schema({
    course_id: {type:mongoose.Types.ObjectId, ref: 'Courses'},
    transaction_id: {type:mongoose.Types.ObjectId, ref: 'CoursesTransactions'},
    user_id: { type: mongoose.Types.ObjectId, ref: 'Users' },
    is_reviewed: Boolean,
    is_done: Boolean,
    deletedAt: Date
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

module.exports = coursesOwnerships;