const database = require("../config/database");
const mongoose = require('mongoose')

const referralHistories = database.model("referrals-histories", new database.Schema({
  from: { type: mongoose.Types.ObjectId, ref: 'Users' },
  to: { type: mongoose.Types.ObjectId, ref: 'Users' },
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

module.exports = referralHistories;