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

const Progress = database.model('Progress', new database.Schema({
  project_id: { type: mongoose.Types.ObjectId, ref: 'Project' },
  video: String,
  image: String,
  name: String,
  date: String,
  desc: Array,
  donwloadables: Array,
}, shemaOptions))

module.exports = Progress