const db = require("../models")
const User = db.user
const Device = db.device
const DeviceType = db.deviceType
const GroupDevice = db.group
const DeviceLog = db.deviceLog
var { validationResult } = require('express-validator')

// handle errors
const handleErrors = (err) => {
    console.log(err.message, err.code)
    let errors = {
        device_code: '',
        sn_number: '',
    }

    // duplicate 
    if (err.code === 11000) {
        console.log(Object.keys(err.keyValue))
        errors.device_code = `${Object.keys(err.keyValue)} đã tồn tại`
        return errors
    }

    // validation errors
    if (err.message.includes('devices validation failed')) {
        // console.log(err)
        Object.values(err.errors).forEach(({ properties }) => {
            // console.log(val)
            // console.log(properties)
            errors[properties.path] = properties.message
        })
    }

    return errors
}

class DeviceController {

    //GET trả về trang home
    async index(req, res) {
        const user = res.locals.user
        let device
        const groups = await GroupDevice.find({ manage_user: user.username }).lean()
        if (user.role == 'admin') {
            device = await Device.find().populate('device_type').populate('user_active_device', 'username').populate('user_active_device', 'username').populate('group').lean()
        } else {
            const group_id = groups.map((group) => group._id)
            device = await Device.find({ group: group_id }).populate('device_type').populate('user_active_device', 'username').populate('user_active_device', 'username').populate('group').lean()
        }
        const device_type = await DeviceType.find().lean()
        // console.log(device)
        res.render('device', { username: res.locals.user.username, groups, idUser: res.locals.user.id, devices: device, device_types: device_type })
    }

    async get_DeviceValue(req, res) {
        // console.log(device)
        const user = res.locals.user
        let devices
        let groups
        const device_types = await DeviceType.find().lean()
        if (user.role == 'admin') {
            groups = await GroupDevice.find().lean()
            devices = await Device.find().populate('device_type').populate('user_active_device', 'username').populate('group').lean()
        } else {
            groups = await GroupDevice.find({ manage_user: user.username }).lean()
            const group_id = groups.map((group) => group._id)
            devices = await Device.find({ group: group_id }).populate('device_type').populate('user_active_device', 'username').populate('group').lean()
        }
        // devices.sort(function (a, b) {
        //     return a.device_model.localeCompare(b.device_model);
        // });
        // console.log(devices)
        res.render('device_value', { username: res.locals.user.username, devices, groups, device_types })
    }

    async post_AddDeviceValue(req, res) {
        // console.log(device)
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            res.status(422).json({status: 'failure', errors: errors.array() })
            return
        }
        try {
            const { serial, data } = req.body
            const device_value = data.val
            const update = await Device.updateOne({ sn_number: serial }, {data: data}, { upsert: true })
            const insertLog = await DeviceLog.create({device_serial: serial, device_value})
            // console.log(update.nModified)
            res.status(201).json({ status: 'success' })
        }
        catch (e) {
            res.status(422).json({status: 'failure', errors: e })
        }
    }

    async post_RegisterDevice(req, res, next) {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            res.status(422).json({status: 'failure', errors: errors.array() })
            return
        }
        try {
            const { Serial, Fw, Hw, Date, Country, Token } = req.body
            const device_model = Serial.slice(0, 4)
            const serial_number = Serial.slice(4)
            const device_type = await DeviceType.findOne({ prefix: device_model })
            const device_name = `${device_type.device_type} - ${serial_number}`
            const id_user_add_device = '60c493522ea45c38d0504462'
            // return res.status(201).json({ Serial, Fw, Hw, Date, Country, device_model, device_type,device_name})
            const device = await Device.create({ device_type: device_type._id, device_name, device_model, sn_number: Serial, token: Token, fw_number: Fw, hw_number: Hw, group_device: null, mfg_date: Date, user_add_device: id_user_add_device, country: Country, user_active_device: null })
            res.status(201).json({status: 'success', device: device })
        }
        catch (err) {
            // console.log(err)
            const errors = handleErrors(err)
            res.status(400).json({status: 'failure', errors })
        }
    }

    async post_ActiveDevice(req, res, next) {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            res.status(422).json({status: 'failure',errors: errors.array() })
            return
        }
        try {
            const { token, serial, group, active_user, gate_way } = req.body
            const update = await Device.updateOne({ sn_number: serial }, { group, user_active_device: active_user, gateway: gate_way })
            if (update.nModified == 1) {
                res.status(201).json({status: 'success', msg: "Active thành công" })
            } else {
                res.status(201).json({status: 'success', msg: "Đã active vào group này" })
            }
        }
        catch (err) {
            // console.log(err)
            const errors = handleErrors(err)
            res.status(400).json({status: 'failure', errors })
        }
    }

    async post_InActiveDevice(req, res, next) {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            res.status(422).json({status: 'failure', errors: errors.array() })
            return
        }
        try {
            const { token, serial } = req.body
            const user = req.body.inactive_user
            const user_id = user._id
            const device = await Device.findOne({ sn_number: serial })
            const user_active_id = device.user_active_device
            if (user.role != 'admin' && user_active_id) {
                if (user_active_id.toString() == user_id.toString()) {
                    const update = await Device.updateOne({ sn_number: serial }, { group: null, user_active_device: null })
                    if (update.nModified == 1) {
                        return res.status(201).json({status: 'success', msg: "Xoá thành công" })
                    }
                } else {
                    return res.status(201).json({status: 'success', msg: "Không có quyền xoá thiết bị" })
                }
            }
            const update = await Device.updateOne({ sn_number: serial }, { group: null, user_active_device: null })
            if (update.nModified == 1) {
                return res.status(201).json({status: 'success', msg: "Xoá thành công" })
            } else {
                return res.status(201).json({status: 'success', msg: "Device hiện tại không thuộc user nào" })
            }
        }
        catch (err) {
            // console.log(err)
            const errors = handleErrors(err)
            res.status(400).json({status: 'failure', errors })
        }
    }

    async post_create(req, res, next) {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            res.status(422).json({status: 'failure', errors: errors.array() })
            return
        }
        try {
            const { device_code, device_type_id, device_name, device_model, sn_number, fw_number, mfg, location, id_user_add_device } = req.body
            const device_type = await DeviceType.findOne({ _id: device_type_id })
            const type_properties = device_type.type_properties
            const device = await Device.create({ device_code, device_type: device_type._id, device_name, device_model, sn_number, fw_number, mfg, user_add_device: id_user_add_device, location, device_property: type_properties })
            res.status(201).json({status: 'success', device: device })
        }
        catch (err) {
            // console.log(err)
            const errors = handleErrors(err)
            res.status(400).json({status: 'failure', errors })
        }
    }

    async get_list(req, res) {
        // console.log(req.params.location)
        // console.log(res.locals.user)
        try {
            const user = res.locals.user
            let device
            const groups = await GroupDevice.find({ manage_user: user.username }).lean()
            if (user.role == 'admin') {
                device = await Device.find().populate('device_type').populate('user_active_device', 'username').populate('user_active_device', 'username').populate('group').lean()
            } else {
                const group_id = groups.map((group) => group._id)
                device = await Device.find({ group: group_id }).populate('device_type').populate('user_active_device', 'username').populate('user_active_device', 'username').populate('group').lean()
            }
            res.status(201).json({status: 'success', device: device })
        }
        catch (err) {
            // console.log(err)
            // const errors = handleErrors(err)
            res.status(400).json({status: 'failure', err })
        }
    }

    get_getTimeServer(req, res) {
        // console.log(res.locals.user)
        const today = new Date()
        const yyyy = today.getFullYear()
        const MM = String(today.getMonth() + 1).padStart(2, '0')
        const dd = String(today.getDate()).padStart(2, '0')
        const hh = String(today.getHours()).padStart(2, '0')
        const mm = String(today.getMinutes()).padStart(2, '0')
        const ss = String(today.getSeconds()).padStart(2, '0')
        const DayOfWeek = today.getDay() + 1

        res.json({ Servertime: `${dd}-${MM}-${yyyy}-${hh}-${mm}-${ss}-${DayOfWeek}` })
    }

    async get_device(req, res) {
        // console.log(res.locals.user)
        try {
            // console.log(Device.populated('device_types'))

            const device = await Device.find({ _id: req.params.id }).populate('device_type').populate('id_user_add_device', 'username').populate('id_user_active_device', 'username')
            res.status(201).json({status: 'success', device: device })
        }
        catch (err) {
            // console.log(err)
            // const errors = handleErrors(err)
            res.status(400).json({status: 'failure', err })
        }
    }

    async put_update(req, res) {
        // console.log(req)
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            res.status(422).json({ errors: errors.array() })
            return
        }
        try {
            const deviceType = await DeviceType.findOne({ _id: req.body.device_type_id })
            const device = await Device.findByIdAndUpdate(req.params.id, {
                device_type: req.body.device_type_id,
                device_property: deviceType.type_properties,
                device_name: req.body.device_name,
                device_model: req.body.device_model,
                fw_number: req.body.fw_number,
                location: req.body.location,
            })
            // await device.save()
            // console.log(device)
            res.status(201).json({status: 'success', device: device })
        }
        catch (err) {
            console.log(err)
            const errors = handleErrors(err)
            res.status(400).json({status: 'failure', errors })
        }
    }

    async delete_delete(req, res) {

        try {
            const device = await Device.deleteOne({ _id: req.params.id })
            // await device.save()
            // console.log(device)
            res.status(201).json({status: 'success', device: device })
        }
        catch (err) {
            // console.log(err)
            const errors = handleErrors(err)
            res.status(400).json({status: 'failure', errors })
        }
    }
}

//khởi tạo controller
module.exports = new DeviceController