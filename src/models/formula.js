const database = require("../config/database");

const DefaultFormula = database.model("default-formulas", new database.Schema({
    key: String,
    name: String,
    steps: Array,
    active: Boolean,
}, {
    timestamps: {
        createdAt: "created_at",
        updatedAt: "updated_at",
    },
    toJSON: {
        transform: (doc, ret) => {
            delete ret._id;
            delete ret.__v;
        },
    },
}));

module.exports = DefaultFormula;