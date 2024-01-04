const { response } = require("express");
const Formula = require("../../models/formula")
const grpcUtil = require("../../utils/grpc");

exports.find = async (req, res, callback) => {
    try {
        let q = { }
        grpcUtil.clientSetupService.GetDefaultFormulas(q, (err, response) => {
            if (err) { 
                console.log('err get-formulas', err);
                return callback({
                    success: false,
                    error_code: err.code,
                    error: err.details,
                })
            } else {
                return callback({
                    success: true,
                    data: response.data
                })
            }
        })
    } catch (error) {
        console.log(error)
        return callback({
            success: false,
            error
        })
    }
}