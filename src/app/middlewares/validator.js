const { oneOf, body, validationResult, param } = require('express-validator')
const bcrypt = require('bcrypt');
const db = require("../models")
const User = db.user
const Device = db.device
const DeviceType = db.deviceType

let validateCreateDevice = [
  body('device_code', 'Nhập mã thiết bị').not().isEmpty(),
  body('device_code').custom(value => {
    return Device.findOne({ device_code: value }).then(device => {
      if (device) {
        return Promise.reject('Mã thiết bị đã tồn tại');
      }
    });
  }),
  body('device_name', 'Nhập tên thiết bị').not().isEmpty(),
  body('device_model', 'Nhập model thiết bị').not().isEmpty(),
  body('device_type_id', 'Nhập id loại thiết bị').not().isEmpty(),
  body('device_type_id').custom(value => {
    return DeviceType.findOne({ _id: value }).then(deviceType => {
      if (!deviceType) {
        return Promise.reject('Id loại thiết bị không hợp lệ');
      }
    });
  }),
  body('sn_number', 'Nhập sn_number thiết bị').not().isEmpty(),
  body('sn_number').custom(value => {
    return Device.findOne({ sn_number: value }).then(device => {
      if (device) {
        return Promise.reject('Mã sn_number đã tồn tại');
      }
    });
  }),
  body('fw_number', 'Nhập fw_number thiết bị').not().isEmpty(),
  body('mfg', 'Nhập mfg thiết bị').not().isEmpty(),
  body('id_user_add_device', 'Nhập id người dùng thêm thiết bị').not().isEmpty(),
  body('location', 'Nhập vị trí thiết bị').not().isEmpty(),
]

let validateUpdateDevice = [
  param('id', 'Nhập id thiết bị').custom(value => {
    return Device.findOne({ _id: value }).then(device => {
      if (!device) {
        return Promise.reject('Id thiết bị không tồn tại');
      }
    });
  }),
  body('device_name', 'Nhập tên thiết bị').not().isEmpty(),
  body('device_model', 'Nhập model thiết bị').not().isEmpty(),
  body('device_type_id', 'Nhập id loại thiết bị').not().isEmpty(),
  body('device_type_id').custom(value => {
    return DeviceType.findOne({ _id: value }).then(deviceType => {
      if (!deviceType) {
        return Promise.reject('Id loại thiết bị không hợp lệ');
      }
    });
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
        return Promise.reject('User name đã tồn tại');
      }
    });
  }),
  body('password', 'Password không được để trống').not().isEmpty(),
  body('farm', 'Farm không được để trống').not().isEmpty(),
]

let validateChangePassword = [
  param('username', 'Username không được để trống').not().isEmpty(),
  body('old_password', 'Nhập mật khẩu hiện tại').not().isEmpty(),
  body('new_password', 'Nhập mật khẩu mới').not().isEmpty(),
  body('new_password', 'Mật khẩu phải từ 6 ký tự').isLength({ min: 6 }),
  param('username').custom((value, { req }) => {
    return User.findOne({ username: value }).then(async user => {
      if (!user) {
        return Promise.reject('user name không tồn tại');
      } else {
        const auth = await bcrypt.compare(req.body.old_password, user.password);
        if (!auth) {
          return Promise.reject('Mật khẩu hiện tại không đúng !');
        }
      }
    });
  }),
]

let validate = {
  validateCreateDevice: validateCreateDevice,
  validateUpdateDevice: validateUpdateDevice,
  validateSignup: validateSignup,
  validateChangePassword: validateChangePassword,
};

module.exports = { validate };