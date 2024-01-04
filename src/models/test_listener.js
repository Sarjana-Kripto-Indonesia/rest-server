const database = require('../config/database')

const Listener = database.model('Listener', new database.Schema({
    value: String,
}))

module.exports = Listener