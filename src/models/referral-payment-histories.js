const database = require("../config/database");
const mongoose = require('mongoose')

const referralPaymentHistories = database.model("referral-transaction-histories", new database.Schema({
    course_id: { type: mongoose.Types.ObjectId, ref: 'Courses' },
    user_id: { type: mongoose.Types.ObjectId, ref: 'Users' },
    referral_record: { type: mongoose.Types.ObjectId, ref: 'ReferralsHistories' },
    course_transaction: { type: mongoose.Types.ObjectId, ref: 'CoursesTransactions' },
    shared_point: Number,
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

module.exports = referralPaymentHistories;