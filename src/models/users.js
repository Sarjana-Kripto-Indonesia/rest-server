const mongoose = require('mongoose')
const database = require('../config/database')

const Users = database.model('Users', new database.Schema({
  // _id: mongoose.Schema.Types.ObjectId,
  name: String,
  password: String,
  email: String,
  is_verified: {
    type: Boolean,
    default: false
  },
  deletedAt: Date,
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  toJSON: {
    transform: (doc, ret) => {
      delete ret.__v
    }
  }
}))

module.exports = Users