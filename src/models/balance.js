const database = require('../config/database')

const Balance = database.model('Balances', new database.Schema({
  user_id: String,
  uid: String,
  type: String,
  description: String,
  debt: Number,
  credit: Number,
  tx_hash: String,
  reference: {
    type: {
      type: String,
      default: null
    },
    id: {
      type: String,
      default: null
    }
  },
  status: Number // 0 => Pending or Process, 1 => Done, 2 => Rejected
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

module.exports = Balance
