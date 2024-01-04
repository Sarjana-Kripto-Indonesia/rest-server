const database = require('../config/database')

const Users = database.model('Users', new database.Schema({
  uid: String,
  display_name: String,
  email: String,
  email_verified: Boolean,
  photo_url: String,
  wallet_va: String,
  wallet: String,
  referral: {
    code: {
      type: String,
      default: null
    },
    user_id: {
      type: String,
      default: null
    }
  },
  subscription: {
    id: {
      type: Number,
      default: 0
    },
    start: {
      type: Date,
      default: null
    },
    end: {
      type: Date,
      default: null
    },
    trial: {
      type: Boolean,
      default: false
    },
    max_smart_trade_bot: {
      type: Number,
      default: 0
    },
    max_exchange: {
      type: Number,
      default: 0
    },
    max_dca_bot: {
      type: Number,
      default: 0
    },
    max_grid_bot: {
      type: Number,
      default: 0
    },
    profit_share: {
      type: Number,
      default: 0
    },
    automated_bot: {
      type: Boolean,
      default: false
    },
    referral_discount: {
      type: Number,
      default: 0
    },
    referral_rewards: {
      type: Number,
      default: 0
    },
    tier: {
      type: Number,
      default: 0
    },
    plan_name: {
      type: String,
      default: ""
    }
  },
  otp: {
    method: {
      type: String,
      default: 'none'
    },
    code: {
      type: String,
      default: null
    },
    uses: {
      type: String,
      default: null
    },
    expired_at: {
      type: Date,
      default: null
    }
  },
  balance: 0,
  locked: false,
  timezone: String
}, {
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
}))

module.exports = Users