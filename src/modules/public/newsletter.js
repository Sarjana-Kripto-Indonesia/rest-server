const express = require('express')
const app = express.Router()
const { writeNewsLetters } = require('../../services/queue')
app.post('/', (req, res)=>{
    console.log(req.body);
    let email = req.body.email ? req.body.email : null;
    if(!email){
        res.status(400).json({
            error:true,
            message:"Email is not exist"
        })
    }

    writeNewsLetters({email})
    
    res.status(200).json({
        success:true,
        result:'Email has been sent'
    })
})

module.exports = app
