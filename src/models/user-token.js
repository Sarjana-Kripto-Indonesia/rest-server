const database = require("../config/database");

const UserToken = database.model("user-token", new database.Schema({
  user_id: String,
  token: String,
  type: String,
  expires_at: Date,
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

module.exports = UserToken;