const mongoose = require('mongoose');
const Notifications = require("../../models/notification");

exports.find = async (req, res, callback) => {
  console.log('notifications get');
  let user_id = res.locals.user_id ? res.locals.user_id : res.locals.uid;
  let limit = req.query.limit ? req.query.limit : 10;
  let page = req.query.page ? req.query.page : 1;
  if (!user_id) {
    return callback({
      error: true,
      message: 'Unable to get user ID on notification!'
    })
  }

  try {
    let query = {
      user_id,
      severity: { $nin: ['high', 'fatal'] },
      // resolved:false
    };
    let execute = await Notifications.find(query).limit(limit).skip((page - 1) * limit).sort({ _id: 'desc' })
    return callback({
      success: true,
      data: execute
    })
  } catch (error) {
    console.log('error find notification', error);
    return callback({
      success: false,
      msg: error
    })
  }
}

// exports.read =