const database = require("../config/database");
const mongoose = require('mongoose')

const coursesTransactions = database.model("courses-transactions", new database.Schema({
  course_id: { type: mongoose.Types.ObjectId, ref: 'Courses' },
  user_id: { type: mongoose.Types.ObjectId, ref: 'Users' },
  payment: Object,
  history_payment: Array,
  course: Object,
  type: String,
  order_id: String,
  content: String,
  bank: Object,
  token: Object,
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

module.exports = coursesTransactions;