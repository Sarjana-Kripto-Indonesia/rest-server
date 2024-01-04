const Users = require('../models/users')
const { admin } = require('../services/firebase')

module.exports = {
  async password (value) {
    if (!value) {
      return Promise.reject('Password tidak boleh kosong')
    }

    if (value.length < 8) {
      return Promise.reject('Password harus lebih dari 8 karakter')
    }
  },
  async otpType (value) {
    const types = [
      appConfig.otp.type.registration,
      appConfig.otp.type.forgot_password,
      appConfig.otp.type.change_password
    ]
    
    if (!types.includes(value)) {
      return Promise.reject('Invalid type of OTP')
    }
  },
  async otpCode (value) {
    if (!value) {
      return Promise.reject('OTP code is required')
    }

    if (value.toString().length !== 4) {
      return Promise.reject('OTP code is invalid')
    }
  },
  async emailExists (value) {
    const check = await UserModel.isEmailExists(value)
    
    if (!check) {
      return Promise.reject('Email ini tidak terdaftar')
    }
  },
  async emailNotExists (value) {
    const check = await UserModel.isEmailExists(value)

    if (check) {
      return Promise.reject('Email ini sudah digunakan')
    }
  }
}