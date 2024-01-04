const axios = require('axios');

const botApi = axios.create({
    baseURL: process.env.BOT_API_URL,
    headers: {
        'x-api-key': process.env.BOT_X_API_KEY ? process.env.BOT_X_API_KEY : 'bzexclient-dev-e0b0fd09-f89d-4862-8888-f92632e3c0b4',
        'Accept': 'application/json',
        'Access-Control-Allow-Origin': '*',
    }
})

module.exports = {
    botApi
}