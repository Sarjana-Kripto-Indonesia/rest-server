const mongoose = require('mongoose')
const database = mongoose

// MongoDB connect
database.set('strictQuery', false)
database.connect(process.env.DATABASE_URL)

// listening to connected event
database.connection.on('connected', () => {
  console.log('Connected to MongoDB server')
})

// listening to disconnected event
database.connection.on('disconnected', () => {
  console.log('Disconnected from MongoDB server')
})

// listening to error event
database.connection.on('error', (err) => {
  console.log(err)
})

module.exports = database