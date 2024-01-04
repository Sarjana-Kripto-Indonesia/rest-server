const LoginHistories = require("../../models/login-histories");
const mongoose = require('mongoose');

exports.find = async (req, res, callback) => {
    try {
        console.log('/user/find ip');
        let user_id = res.locals.uid;
        let execute = await LoginHistories.find({ user_id }).sort({ _id: -1 });
        return callback({
            success: true,
            data: execute
        });
    } catch (error) {
        return callback({
            error: true,
            message: "Unable to fetch list of login histories",
            data:error
        })
    }
}

exports.create = async (req, res, callback) => {
    try {
        // DEFINE VARIABLE TO INPUT
        console.log('create ip record');
        console.log(req);
        let user_id = res.locals.uid;
        let user_agent = req.user_agent ? req.user_agent : false;
        let ip = req.ip ? req.ip : false;
        if (!user_id) throw "Failed to write to DB, Uid is not defined!";
        if (!user_agent) throw "Failed to write to DB, User Agent is not found!";
        if (!ip) throw "Failed to write to DB, IP is not found!";
        
        // INSERT VARIABLE TO DB DEPENDS ON THE MODEL
        let execute = await LoginHistories.create({
            user_id, user_agent, ip
        });

        return callback({
            success: true,
            data: execute
        })
        
    } catch (error) {
        console.log(error.response);
        return callback({
            error: true,
            message:"Unable to create new IP record",
            data:error
        })
    }
}