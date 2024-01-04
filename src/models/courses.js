const database = require("../config/database");

const courses = database.model("courses", new database.Schema({
    name: String,
    price: Object,
    status: String,
    level: String,
    banner: String,
    subtitle: Array,
    desc: String,
    social: Object,
    Syllabus: Array,
    skill: Array,
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

module.exports = courses;