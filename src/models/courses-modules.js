const database = require("../config/database");
const mongoose = require('mongoose')

const courseModules = database.model("courses-modules", new database.Schema({
    syllabus_id: {type:mongoose.Types.ObjectId, ref: 'courses-syllabuses'},
    name: String,
    desc: Object,
    videos: Array,
    quiz: Array,
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

module.exports = courseModules;