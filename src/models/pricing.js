const database = require('../config/database');

const Pricings = database.model('pricings', new database.Schema({
    id: Number,
    name: String,
    price: Number,
    cicle: Number,
    tier: Number,
    recommended: Boolean,
    config: Object
}, {
    timestamps: {},
    toJSON: {
        transform: (doc, ret) => {
            delete ret.__v;
        },
    },
}));

module.exports = Pricings;