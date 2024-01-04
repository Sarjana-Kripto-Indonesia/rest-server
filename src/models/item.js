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

const attributeSchema = new database.Schema({
  trait_type: String,
  value: String
}, subSchemaOptions)

const Item = database.model('Item', new database.Schema({
  token_id: String,
  collection_address: String,
  product_id: String,
  group: String,
  name: String,
  description: String,
  image: String,
  image_thumb: String,
  revealed: Boolean,
  rarity: Number,
  owner: String,
  attributes: [attributeSchema],
}, shemaOptions))

module.exports = Item