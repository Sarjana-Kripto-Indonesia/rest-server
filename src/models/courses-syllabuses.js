const database = require("../config/database");
const mongoose = require('mongoose')

const coursesSyllabus = database.model("courses-syllabuses", new database.Schema({
    course_id: {type:mongoose.Types.ObjectId, ref: 'Courses'},
    name: String,
    desc: Number,
    order: Number,
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

module.exports = coursesSyllabus;