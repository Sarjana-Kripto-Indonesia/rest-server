const database = require('../config/database');

const Purchases = database.model('purchases', new database.Schema({
  invoice_id: String,
  user_id: String,
  plan_id: Number,
  description: String,
  wallet_va: String,
  totals: {
    subtotal: {
      type: Number,
      default: 0
    },
    discount: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      default: 0
    }
  },
  payment: {
    paid: {
      type: Boolean,
      default: false
    },
    date: {
      type: Date,
      default: null
    },
    method: {
      type: String,
      default: null
    }
  },
  active: Boolean
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  toJSON: {
    transform: (doc, ret) => {
      delete ret._id;
      delete ret.__v;
    },
  },
}));

module.exports = Purchases;