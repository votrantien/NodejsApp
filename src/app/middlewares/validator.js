const { oneOf, body, validationResult, param, query, check } = require('express-validator')
const bcrypt = require('bcrypt')
const db = require("../models")
const User = db.user
const Device = db.device
const Group = db.group
const DeviceType = db.deviceType
const jwt = require('jsonwebtoken')
const CryptoJS = require("crypto-js")
const mdfSecretKey = process.env.MD5_SECRET_KEY || 'thuycanh'

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
    body('device_name', 'Tên thiết bị phải từ 5 đến 25 ký tự').isLength({ min: 5, max: 25 }),
    body('device_type', 'Nhập id loại thiết bị').not().isEmpty(),
    body('device_type').custom(value => {
        return DeviceType.findOne({ _id: value }).then(deviceType => {
            if (!deviceType) {
                return Promise.reject('Id loại thiết bị không hợp lệ')
            }
        })
    }),
    body('fw_number', 'Nhập fw_number thiết bị').not().isEmpty(),
    body('hw_number', 'Nhập hw_number thiết bị').not().isEmpty(),
    body('mfg_date', 'Nhập mfg_date thiết bị').not().isEmpty(),
    body('country', 'Nhập nơi sản xuất thiết bị').not().isEmpty(),
]

let validateDeleteDevice = [
    param('id', 'Nhập id thiết bị').not().isEmpty(),
    param('id').custom(value => {
        return Device.findOne({ _id: value }).then(device => {
            if (!device) {
                return Promise.reject('Id thiết bị không tồn tại')
            } else if (device.group != null) {
                return Promise.reject('deactive thiết bị trước khi xoá')
            }
        })
    })
]

let validateSignup = [
    body('username', 'Tên user không được để trống').not().isEmpty(),
    body('username', 'Tên user gồm các chữ cái và số viết liền không dấu').isAlphanumeric(),
    body('email', 'Sai định dạng email').isEmail().normalizeEmail(),
    body('email').custom((value) => {
        return User.findOne({ email: value }).then(user => {
            if (user) {
                return Promise.reject('email đã tồn tại')
            }
        })
    }),
    body('username').custom((value) => {
        return User.findOne({ username: value }).then(user => {
            if (user) {
                return Promise.reject('User name đã tồn tại')
            }
        })
    }),
    body('password', 'Password không được để trống').not().isEmpty(),
    body('fullname', 'fullname không được để trống').not().isEmpty(),
    body('phone', 'phone không được để trống').not().isEmpty(),
    body('phone', 'phone phải là số').isInt([{ allow_leading_zeroes: true }]),
    body('groupname', 'groupname không được để trống').not().isEmpty(),
]

let validateChangePassword = [
    body('old_password', 'Nhập mật khẩu hiện tại').not().isEmpty(),
    body('new_password', 'Nhập mật khẩu mới').not().isEmpty(),
    body('new_password', 'Mật khẩu phải từ 6 ký tự').isLength({ min: 6 }),
]

let validateChangeUserInfo = [
    param('id', 'Id không được để trống').not().isEmpty(),
    param('id').custom(async (id) => {
        const user = await User.findOne({ _id: id })
        if (!user) {
            return Promise.reject('Id user không tồn tại')
        } else {
            return true
        }
    }),
    body('fullname', 'Nhập họ tên user').not().isEmpty(),
    body('fullname', 'Tên user phải từ 6 ký tự').isLength({ min: 6 }),
    body('email', 'Sai định dạng email').isEmail().normalizeEmail(),
    body('email').custom((value, { req }) => {
        return User.findOne({ email: value }).then(user => {
            if (user) {
                if(user._id != req.params.id){
                    return Promise.reject('email đã tồn tại')
                }
            }
        })
    }),
    body('phone', 'phone không được để trống').not().isEmpty(),
    body('phone', 'phone phải là số').isInt([{ allow_leading_zeroes: true }])
]

let validateActiveDevice = [
    body('serial', 'serial không được để trống').not().isEmpty(),
    body('serial').custom(async (value) => {
        const device = await Device.findOne({ sn_number: value })
        if (!device) {
            return Promise.reject('device active không tồn tại')
        } else {
            return true
        }
    }),
    body('token', 'Token không được để trống').not().isEmpty(),
    body('token').custom(async (value, { req }) => {
        const token = req.cookies.jwt
        if (token) {
            const decode = await jwt.verify(token, process.env.JWT_SECRET, async (err, decodedToken) => {
                if (err) {
                    return Promise.reject('Token không hợp lệ')
                } else {
                    const user = await User.findById(decodedToken.id)
                    if (!user) {
                        return Promise.reject('user active không tồn tại')
                    }
                }
                req.body.active_user = decodedToken.id
            })
        } else {
            const decode = await jwt.verify(value, process.env.JWT_SECRET, async (err, decodedToken) => {
                if (err) {
                    return Promise.reject('Token không hợp lệ')
                } else {
                    const user = await User.findById(decodedToken.id)
                    if (!user) {
                        return Promise.reject('user active không tồn tại')
                    }
                }
                req.body.active_user = decodedToken.id
            })
        }
    }),
    body('group', 'group không được để trống').not().isEmpty(),
    body('group').custom(async (value) => {
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
    })
]

let validateActiveNode = [
    body('serial', 'serial không được để trống').not().isEmpty(),
    body('serial').custom(async (value) => {
        const device = await Device.findOne({ sn_number: value })
        if (!device) {
            return Promise.reject('device active không tồn tại')
        } else {
            return true
        }
    }),
    body('token', 'Token không được để trống').not().isEmpty(),
    body('token').custom((value, { req }) => {
        const token = value
        const checkMd5 = CryptoJS.MD5(req.body.serial + mdfSecretKey).toString()
        if (token === checkMd5) {
            return true
        } else {
            return Promise.reject('Token không hợp lệ')
        }
    }),
    body('gate_way', 'gate_way không được để trống').not().isEmpty(),
    body('gate_way').custom(async (value, { req }) => {
        try {
            const gateway = await Device.findOne({ sn_number: value })
            if (!gateway) {
                return Promise.reject('serial gateway active không tồn tại')
            } else if (gateway.group == null) {
                return Promise.reject('gateway chưa active, hãy active gateway trước')
            } else {
                req.body.group = gateway.group
                return true
            }
        } catch {
            return Promise.reject('gateway id không hợp lệ')
        }
    }),
]

let validateDeactivateNode = [
    body('serial', 'serial không được để trống').not().isEmpty(),
    body('serial').custom(async (value) => {
        const device = await Device.findOne({ sn_number: value })
        if (!device) {
            return Promise.reject('device active không tồn tại')
        } else {
            return true
        }
    }),
    body('token', 'Token không được để trống').not().isEmpty(),
    body('token').custom((value, { req }) => {
        const token = value
        const checkMd5 = CryptoJS.MD5(req.body.serial + mdfSecretKey).toString()
        if (token === checkMd5) {
            return true
        } else {
            return Promise.reject('Token không hợp lệ')
        }
    })
]

let validateInActiveDevice = [
    body('serial', 'serial không được để trống').not().isEmpty(),
    body('serial').custom(async (value) => {
        const device = await Device.findOne({ sn_number: value })
        if (!device) {
            return Promise.reject('device active không tồn tại')
        } else {
            return true
        }
    }),
    body('token', 'Token không được để trống').not().isEmpty(),
    body('token').custom(async (value, { req }) => {
        let user
        const token = req.cookies.jwt
        if (token) {
            const decode = await jwt.verify(token, process.env.JWT_SECRET, async (err, decodedToken) => {
                if (err) {
                    return Promise.reject('Token không hợp lệ')
                } else {
                    user = await User.findById(decodedToken.id)
                    if (!user) {
                        return Promise.reject('user inactive không tồn tại')
                    }
                }
                req.body.inactive_user = user
            })
        } else {
            const decode = await jwt.verify(value, process.env.JWT_SECRET, async (err, decodedToken) => {
                if (err) {
                    return Promise.reject('Token không hợp lệ')
                } else {
                    user = await User.findById(decodedToken.id)
                    if (!user) {
                        return Promise.reject('user inactive không tồn tại')
                    }
                }
                req.body.inactive_user = user
            })
        }
    }),
]

let validateAddDeviceValue = [
    body('serial', 'serial không được để trống').not().isEmpty(),
    body('serial').custom(async (value) => {
        const device = await Device.findOne({ sn_number: value })
        if (!device) {
            return Promise.reject('device không tồn tại')
        } else {
            return true
        }
    }),
    body('amount_of_values', 'số lượng values không được để trống').not().isEmpty(),
    body('amount_of_values', 'số lượng values phải là số >= 1').isInt({ min: 1 }),
    body('data', 'data không được để trống').not().isEmpty(),
    body('data').custom((data) => {
        const values = data?.val
        if (values) {
            for (const [key, value] of Object.entries(values)) {
                if (isNaN(value)) {
                    return Promise.reject(key + ' giá trị phải là số')
                }
            }
            return true
        } else {
            return Promise.reject('Thiếu giá trị của thiết bị')
        }
    }),
    //body('data', 'data không được để trống').not().isEmpty(),
]

let validateChangeDeviceGroup = [
    body('serial', 'serial không được để trống').not().isEmpty(),
    body('serial').custom(async (value) => {
        const device = await Device.findOne({ sn_number: value })
        if (!device) {
            return Promise.reject('device serial không tồn tại')
        } else {
            return true
        }
    }),
    body('groupId', 'groupId không được để trống').not().isEmpty(),
    body('groupId').custom(async (value) => {
        try {
            const group = await Group.findById(value)
            if (!group) {
                return Promise.reject('groupId không tồn tại')
            } else {
                return true
            }
        } catch {
            return Promise.reject('groupId không hợp lệ')
        }
    })
]

// validate group manage
let validateShareGroupDevice = [
    body('shareUserName', 'shareUserName không được để trống').not().isEmpty(),
    body('shareUserName').custom(async (value) => {
        const user = await User.findOne({ username: value })
        if (!user) {
            return Promise.reject('Tên user không tồn tại')
        } else {
            return true
        }
    }),
    body('groupId', 'groupId không được để trống').not().isEmpty(),
    body('groupId').custom(async (value) => {
        try {
            const group = await Group.findById(value)
            if (!group) {
                return Promise.reject('groupId không tồn tại')
            } else {
                return true
            }
        } catch {
            return Promise.reject('groupId không hợp lệ')
        }
    })
]

//user validate
let validateChangeEmail = [
    body('userName', 'userName không được để trống').not().isEmpty(),
    body('userName').custom(async (value) => {
        const user = await User.findOne({ username: value })
        if (!user) {
            return Promise.reject('Tên user không tồn tại')
        } else {
            return true
        }
    }),
    body('newEmail', 'Email không được để trống').not().isEmpty(),
    body('newEmail', 'Email không đúng định dạng').isEmail(),
    body('newEmail').custom(async (value) => {
        const user = await User.find({ email: value })
        if (user.length > 0) {
            return Promise.reject('Địa chỉ email này đã được sử dụng')
        } else {
            return true
        }
    }),
    body('otpCode', 'Otp không được để trống').not().isEmpty(),
]
// mcc schedule valitade

//// update schedule
let validateUpdateMCCData = [
    param('serial', 'Nhập serial thiết bị').not().isEmpty(),
    param('serial').custom(value => {
        return Device.findOne({ sn_number: value }).then(device => {
            if (!device) {
                return Promise.reject('serial thiết bị không tồn tại')
            }
        })
    }),
    body('data', 'Nhập data thiết bị').not().isEmpty(),
    body('token', 'Nhập token').not().isEmpty(),
    body('token', 'Nhập token').custom((value, { req }) => {
        const token = value
        const checkMd5 = CryptoJS.MD5(req.params.serial + mdfSecretKey).toString()
        if (token === checkMd5) {
            return true
        } else {
            return Promise.reject('Token không hợp lệ')
        }
    }),
]

let validateGetMCCData = [
    body('serial', 'Nhập serial thiết bị').not().isEmpty(),
    body('serial', 'Nhập serial thiết bị').custom(value => {
        return Device.findOne({ sn_number: value }).then(device => {
            if (!device) {
                return Promise.reject('serial thiết bị không tồn tại')
            }
        })
    }),
    body('token', 'Nhập token').not().isEmpty(),
    body('token', 'Nhập token').custom((value, { req }) => {
        const token = value
        const checkMd5 = CryptoJS.MD5(req.body.serial + mdfSecretKey).toString()
        if (token === checkMd5) {
            return true
        } else {
            return Promise.reject('Token không hợp lệ')
        }
    }),
]

let validateClearMCCData = [
    body('serial', 'Nhập serial thiết bị').not().isEmpty(),
    body('serial', 'Nhập serial thiết bị').custom(value => {
        return Device.findOne({ sn_number: value }).then(device => {
            if (!device) {
                return Promise.reject('serial thiết bị không tồn tại')
            }
        })
    }),
    body('token', 'Nhập token').not().isEmpty(),
    body('token', 'Nhập token').custom((value, { req }) => {
        const token = value
        const checkMd5 = CryptoJS.MD5(req.body.serial + mdfSecretKey).toString()
        if (token === checkMd5) {
            return true
        } else {
            return Promise.reject('Token không hợp lệ')
        }
    }),
]

let validate = {
    validateCreateDevice: validateCreateDevice,
    validateUpdateDevice: validateUpdateDevice,
    validateSignup: validateSignup,
    validateChangePassword: validateChangePassword,
    validateChangeUserInfo: validateChangeUserInfo,
    validateRegisterDevice: validateRegisterDevice,
    validateActiveDevice: validateActiveDevice,
    validateActiveNode: validateActiveNode,
    validateInActiveDevice: validateInActiveDevice,
    validateDeactivateNode: validateDeactivateNode,
    validateAddDeviceValue: validateAddDeviceValue,
    validateDeleteDevice: validateDeleteDevice,
    validateChangeDeviceGroup: validateChangeDeviceGroup,
    validateShareGroupDevice: validateShareGroupDevice,
    validateChangeEmail: validateChangeEmail,
    validateUpdateMCCData: validateUpdateMCCData,
    validateGetMCCData: validateGetMCCData,
    validateClearMCCData: validateClearMCCData,
}

module.exports = { validate }