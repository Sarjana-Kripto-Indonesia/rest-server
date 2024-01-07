const database = require("../config/database");
const mongoose = require('mongoose')

const coursesReviews = database.model("courses-reviews", new database.Schema({
    course_id: {type:mongoose.Types.ObjectId, ref: 'Courses'},
    user_id: String,
    rating: Number,
    comment: String,
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

module.exports = coursesReviews;