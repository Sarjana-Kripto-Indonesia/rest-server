const database = require('../config/database')

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

const subSchemaOptions = {
  toJSON: {
    transform: (doc, ret) => {
      delete ret._id
      delete ret.__v
    }
  }
}

const Project = database.model('Project', new database.Schema({
  name: String,
  slug: String,
  desc: Array,
  token_name: String,
  token_address: String,
  whitelist_address: String,
  sales_address: String,
  banner: String,
  avatar: String,
  status: String,
  sales_data: Object,
  timeline: Array,
  table_data: Array,
  max_supply: Number,
  videos: Array,
  images: Array,
  official_links: Array
}, shemaOptions))

module.exports = Project