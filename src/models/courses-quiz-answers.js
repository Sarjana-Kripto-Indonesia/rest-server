const database = require("../config/database");
const mongoose = require('mongoose')

const coursesQuizAnswers = database.model("courses-quiz-answers", new database.Schema({
    module_id: {type:mongoose.Types.ObjectId, ref: 'CoursesModules'},
    user_id:{type:mongoose.Types.ObjectId, ref:'Users'},
    answers: Array,
    total_correct: Number,
    total_wrong: Number,
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

module.exports = coursesQuizAnswers;