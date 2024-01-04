const express = require('express')
const app = express.Router()
// const pricing = require('../config/pricing')
const Pricing = require('../models/pricing')
const utilPricing = require("../utils/pricing");

app.get('/', async (req, res) => {
  console.log('get-pricing')
  try {
    let getPricing = await utilPricing.getPricing();
    res.status(200).json(getPricing);
  } catch (err) { 
    res.status(400).json({success:false, error:err})
  }
})

module.exports = app