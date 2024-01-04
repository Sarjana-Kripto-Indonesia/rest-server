const database = require('../config/database')
const mongoose = require('mongoose')

const shemaOptions = {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  toJSON: {
    transform: (doc, ret) => {
      delete ret._id
      delete ret.__v
    }
  }
}

const Listener = database.model('Listener', new database.Schema({
  project_id: { type: mongoose.Types.ObjectId, ref: 'Project' },
  project_name: String,
  event_name: String,
  contract_address: String,
  type: String,
  status: Boolean,
}, shemaOptions))

module.exports = Listener