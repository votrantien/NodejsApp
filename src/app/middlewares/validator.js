const { oneOf, body, validationResult, param, query } = require('express-validator')
const bcrypt = require('bcrypt')
const db = require("../models")
const User = db.user
const Device = db.device
const Group = db.group
const DeviceType = db.deviceType
const jwt = require('jsonwebtoken')

let validateCreateDevice = [
  body('device_code', 'Nhập mã thiết bị').not().isEmpty(),
  body('device_code').custom(value => {
    return Device.findOne({ device_code: value }).then(device => {
      if (device) {
        return Promise.reject('Mã thiết bị đã tồn tại')
      }
    })
  }),
  body('device_name', 'Nhập tên thiết bị').not().isEmpty(),
  body('device_model', 'Nhập model thiết bị').not().isEmpty(),
  body('device_type_id', 'Nhập id loại thiết bị').not().isEmpty(),
  body('device_type_id').custom(value => {
    return DeviceType.findOne({ _id: value }).then(deviceType => {
      if (!deviceType) {
        return Promise.reject('Id loại thiết bị không hợp lệ')
      }
    })
  }),
  body('sn_number', 'Nhập sn_number thiết bị').not().isEmpty(),
  body('sn_number').custom(value => {
    return Device.findOne({ sn_number: value }).then(device => {
      if (device) {
        return Promise.reject('Mã sn_number đã tồn tại')
      }
    })
  }),
  body('fw_number', 'Nhập fw_number thiết bị').not().isEmpty(),
  body('hw_number', 'Nhập hw_number thiết bị').not().isEmpty(),
  body('mfg_date', 'Nhập mfg_date thiết bị').not().isEmpty(),
  body('id_user_add_device', 'Nhập id người dùng đăng ký thiết bị').not().isEmpty(),
  body('group_device', 'Nhập nhóm thiết bị').not().isEmpty(),
]

let validateRegisterDevice = [
  body('Serial', 'Nhập sn_number thiết bị').not().isEmpty(),
  body('Serial').custom(value => {
    return Device.findOne({ sn_number: value }).then(device => {
      if (device) {
        return Promise.reject('Mã sn_number đã tồn tại')
      }
    })
  }),
  body('Serial').custom((value) => {
    return DeviceType.findOne({ prefix: value.slice(0, 4) }).then(DeviceType => {
      if (!DeviceType) {
        return Promise.reject('Model thiết bị không có trong database')
      }
    })
  }),
  body('Fw', 'Nhập fw_number thiết bị').not().isEmpty(),
  body('Hw', 'Nhập hw_number thiết bị').not().isEmpty(),
  body('Date', 'Nhập mfg_date thiết bị').not().isEmpty(),
  body('Country', 'Nhập Country thiết bị').not().isEmpty(),
]

let validateUpdateDevice = [
  param('id', 'Nhập id thiết bị').custom(value => {
    return Device.findOne({ _id: value }).then(device => {
      if (!device) {
        return Promise.reject('Id thiết bị không tồn tại')
      }
    })
  }),
  body('device_name', 'Nhập tên thiết bị').not().isEmpty(),
  body('device_model', 'Nhập model thiết bị').not().isEmpty(),
  body('device_type_id', 'Nhập id loại thiết bị').not().isEmpty(),
  body('device_type_id').custom(value => {
    return DeviceType.findOne({ _id: value }).then(deviceType => {
      if (!deviceType) {
        return Promise.reject('Id loại thiết bị không hợp lệ')
      }
    })
  }),
  body('fw_number', 'Nhập fw_number thiết bị').not().isEmpty(),
  body('mfg', 'Nhập mfg thiết bị').not().isEmpty(),
  body('location', 'Nhập vị trí thiết bị').not().isEmpty(),
]

let validateSignup = [
  body('username', 'Tên user không được để trống').not().isEmpty(),
  body('email', 'Sai định dạng email').isEmail().normalizeEmail(),
  body('username').custom((value, { req }) => {
    return User.findOne({ username: value }).then(user => {
      if (user) {
        return Promise.reject('User name đã tồn tại')
      }
    })
  }),
  body('password', 'Password không được để trống').not().isEmpty(),
  body('fullname', 'fullname không được để trống').not().isEmpty(),
  body('phone', 'phone không được để trống').not().isEmpty(),
  body('groupname', 'groupname không được để trống').not().isEmpty(),
]

let validateChangePassword = [
  param('username', 'Username không được để trống').not().isEmpty(),
  body('old_password', 'Nhập mật khẩu hiện tại').not().isEmpty(),
  body('new_password', 'Nhập mật khẩu mới').not().isEmpty(),
  body('new_password', 'Mật khẩu phải từ 6 ký tự').isLength({ min: 6 }),
  param('username').custom((value, { req }) => {
    return User.findOne({ username: value }).then(async user => {
      if (!user) {
        return Promise.reject('user name không tồn tại')
      } else {
        const auth = await bcrypt.compare(req.body.old_password, user.password)
        if (!auth) {
          return Promise.reject('Mật khẩu hiện tại không đúng !')
        }
      }
    })
  }),
]

let validateActiveDevice = [
  query('serial', 'serial không được để trống').not().isEmpty(),
  query('serial').custom(async (value) => {
    const device = await Device.findOne({ sn_number: value })
    if (!device) {
      return Promise.reject('device active không tồn tại')
    } else {
      return true
    }
  }),
  query('token', 'Token không được để trống').not().isEmpty(),
  query('token').custom(async (value,{req}) => {
    const decode = await jwt.verify(value, process.env.JWT_SECRET, async (err, decodedToken) => {
      if (err) {
        return Promise.reject('Token không hợp lệ')
      } else {
        const user = await User.findById(decodedToken.id)
        if (!user) {
          return Promise.reject('user active không tồn tại')
        }
      }
      req.query.active_user = decodedToken.id
    })
  }),
  query('group', 'group không được để trống').not().isEmpty(),
  query('group').custom(async (value) => {
    try {
      const group = await Group.findById(value)
      if (!group) {
        return Promise.reject('group active không tồn tại')
      } else {
        return true
      }
    } catch {
      return Promise.reject('group id không hợp lệ')
    }
  }),
]

let validate = {
  validateCreateDevice: validateCreateDevice,
  validateUpdateDevice: validateUpdateDevice,
  validateSignup: validateSignup,
  validateChangePassword: validateChangePassword,
  validateRegisterDevice: validateRegisterDevice,
  validateActiveDevice: validateActiveDevice,
}

module.exports = { validate }