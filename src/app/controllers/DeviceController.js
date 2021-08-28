const db = require("../models")
const User = db.user
const Device = db.device
const DeviceType = db.deviceType
const GroupDevice = db.group
const DeviceLog = db.deviceLog
var { validationResult } = require('express-validator')
const mongoose = require("mongoose")
const CryptoJS = require("crypto-js")
const mdfSecretKey = process.env.MD5_SECRET_KEY || 'thuycanh'


// handle errors
const handleErrors = (err) => {
    console.log(err.message, err.code)

    return err.message
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
        res.render('device', { username: res.locals.user.username, groups, idUser: res.locals.user.id, devices: device, device_types: device_type, title: "Quản lý thiết bị" })
    }

    async get_DeviceManage(req, res) {
        const user = res.locals.user
        let devices, groups
        if (user.role == 'admin') {
            groups = await GroupDevice.find().lean()
            devices = await Device.find().populate('device_type').populate('user_active_device', 'username').populate('user_active_device', 'username').populate('group').lean()
        } else {
            groups = await GroupDevice.find({ manage_user: user.username }).lean()
            const group_id = groups.map((group) => group._id)
            devices = await Device.find({ group: group_id }).populate('device_type').populate('user_active_device', 'username').populate('user_active_device', 'username').populate('group').lean()
        }
        const device_types = await DeviceType.find().lean()
        // console.log(device)
        res.render('device_manage', { username: res.locals.user.username, groups, idUser: res.locals.user.id, devices, device_types, title: "Quản lý thiết bị" })
    }

    async get_SensorValue(req, res) {
        // console.log(device)
        const user = res.locals.user
        const username = res.locals.user.username
        let devices, listGroups, gateways, listGroupShare, userGroups
        const device_types = await DeviceType.find().sort({ 'type_properties.order_number': 1 }).lean()
        if (user.role == 'admin') {
            listGroups = await GroupDevice.find().lean()
            userGroups = listGroups
            gateways = await Device.find({ device_model: 'BSGW' }).lean()
            devices = await Device.find({ device_model: { $nin: ['BSGW', 'AHSD'] } }).populate('device_type').populate('user_active_device', 'username').populate('group').lean()
        } else {
            userGroups = await GroupDevice.find({ manage_user: user.username }).lean()
            listGroupShare = await GroupDevice.find({ access_user: user._id }).lean()
            listGroups = userGroups.concat(listGroupShare)
            const groupId = listGroups.map((group) => group._id)

            gateways = await Device.find({ group: groupId, device_model: 'BSGW' }).lean()
            devices = await Device.find({ group: groupId, device_model: { $nin: ["BSGW", "AHSD"] } }).populate('device_type').populate('user_active_device', 'username').populate('group').lean()
        }
        // devices.sort(function (a, b) {
        //     return a.device_model.localeCompare(b.device_model);
        // });
        // console.log(devices)
        res.render('device_value_gateway', { username, devices, listGroups, userGroups, listGroupShare, device_types, gateways, title: "Giá trị cảm biến" })
    }

    // test
    async get_SensorValueTest(req, res) {
        // console.log(device)
        const user = res.locals.user
        const username = res.locals.user.username
        let devices
        let groups
        let gateways
        const device_types = await DeviceType.find().lean()
        if (user.role == 'admin') {
            groups = await GroupDevice.find().lean()
            gateways = await Device.find({ device_model: 'BSGW' }).lean()
            devices = await Device.find({ device_model: { $nin: ['BSGW', 'AHSD'] } }).populate('device_type').populate('user_active_device', 'username').populate('group').lean()
        } else {
            groups = await GroupDevice.find({ manage_user: user.username }).lean()
            const group_id = groups.map((group) => group._id)
            gateways = await Device.find({ group: group_id, device_model: 'BSGW' }).lean()
            devices = await Device.find({ group: group_id, device_model: { $nin: ['BSGW', 'AHSD'] } }).populate('device_type').populate('user_active_device', 'username').populate('group').lean()
        }
        // devices.sort(function (a, b) {
        //     return a.device_model.localeCompare(b.device_model);
        // });
        // console.log(devices)
        res.render('device_value_test', { username, devices, groups, device_types, gateways })
    }

    async get_AhsdValue(req, res) {
        // console.log(device)
        const user = res.locals.user
        const username = res.locals.user.username
        let devices, listGroups, listGroupShare, userGroups
        const device_types = await DeviceType.find().lean()
        if (user.role == 'admin') {
            listGroups = await GroupDevice.find().lean()
            userGroups = listGroups
            devices = await Device.find({ device_model: 'AHSD' }).populate('device_type').populate('user_active_device', 'username').populate('group').lean()
        } else {
            userGroups = await GroupDevice.find({ manage_user: user.username }).lean()
            listGroupShare = await GroupDevice.find({ access_user: user._id }).lean()
            listGroups = userGroups.concat(listGroupShare)
            const groupId = listGroups.map((group) => group._id)
            devices = await Device.find({ group: groupId, device_model: 'AHSD' }).populate('device_type').populate('user_active_device', 'username').populate('group').lean()
        }
        // devices.sort(function (a, b) {
        //     return a.device_model.localeCompare(b.device_model);
        // });
        // console.log(devices)
        res.render('device_value_ahsd', { username, devices, listGroups, userGroups, listGroupShare, device_types, title: "Automatic Hydrobonic System" })
    }

    async post_AddDeviceValue(req, res) {
        // console.log(device)
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            res.status(422).json({ status: 'failure', errors: errors.array() })
            return
        }
        try {
            const { serial, data, amount_of_values } = req.body
            const device_value = data.val
            const update = await Device.updateOne({ sn_number: serial }, { data: data }, { upsert: true })
            const insertLog = await DeviceLog.create({ device_serial: serial, device_value, amount_of_values })
            // console.log(update.nModified)
            res.io.emit('update_device_values', { serial: serial, data: data })
            res.status(201).json({ status: 'success' })
        } catch (e) {
            res.status(422).json({ status: 'failure', errors: e })
        }
    }

    async post_RegisterDevice(req, res, next) {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            res.status(422).json({ status: 'failure', errors: errors.array() })
            return
        }
        try {
            const { Serial, Fw, Hw, Date, Country } = req.body
            const Token = CryptoJS.MD5(Serial + mdfSecretKey).toString()
            const device_model = Serial.slice(0, 4)
            const serial_number = Serial.slice(4)
            const device_type = await DeviceType.findOne({ prefix: device_model })
            const device_name = `${device_type.device_type} - ${serial_number}`
            const id_user_add_device = '60c493522ea45c38d0504462'
            // return res.status(201).json({ Serial, Fw, Hw, Date, Country, device_model, device_type,device_name})
            const device = await Device.create({ device_type: device_type._id, device_name, device_model, sn_number: Serial, token: Token, fw_number: Fw, hw_number: Hw, group_device: null, mfg_date: Date, user_add_device: id_user_add_device, country: Country, user_active_device: null })
            res.status(201).json({ status: 'success', device: device })
        } catch (err) {
            // console.log(err)
            const errors = handleErrors(err)
            res.status(400).json({ status: 'failure', errors })
        }
    }

    async post_ActiveDevice(req, res, next) {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            res.status(422).json({ status: 'failure', errors: errors.array() })
            return
        }
        try {
            const { token, serial, group, active_user } = req.body
            const update = await Device.updateOne({ sn_number: serial }, { group, user_active_device: active_user, gateway: "none" })
            if (update.nModified == 1) {
                res.io.emit('active_device_success', { serial, active_user })
                res.status(201).json({ status: 'success', msg: "Active thành công" })
            } else {
                res.status(201).json({ status: 'success', msg: "Đã active vào group này" })
            }
        } catch (err) {
            // console.log(err)
            res.status(400).json({ status: 'failure', errors: err })
        }
    }

    async post_ChangeDeviceGroup(req, res, next) {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            res.status(422).json({ status: 'failure', errors: errors.array() })
            return
        }
        try {
            const { serial, groupId } = req.body
            const update = await Device.updateOne({ sn_number: serial }, { group: groupId })
            const updateNode = await Device.updateMany({ gateway: serial }, { group: groupId })
            res.status(201).json({ status: 'success', msg: "Change device group thành công" })
        } catch (err) {
            // console.log(err)
            res.status(400).json({ status: 'failure', errors: err })
        }
    }

    async post_ActiveNode(req, res, next) {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            res.status(422).json({ status: 'failure', errors: errors.array() })
            return
        }
        try {
            const { gate_way, serial, group } = req.body
            const update = await Device.updateOne({ sn_number: serial }, { group, user_active_device: null, gateway: gate_way })
            if (update.nModified == 1) {
                res.io.emit('active_device_success', serial)
                res.status(201).json({ status: 'success', msg: "Active thành công" })
            } else {
                res.status(201).json({ status: 'success', msg: "Đã active vào group này" })
            }
        } catch (err) {
            // console.log(err)
            res.status(400).json({ status: 'failure', errors: err })
        }
    }

    async post_InActiveNode(req, res, next) {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            res.status(422).json({ status: 'failure', errors: errors.array() })
            return
        }
        try {
            const { serial } = req.body
            const update = await Device.updateOne({ sn_number: serial }, { group: null, user_active_device: null, gateway: "none" })
            if (update.nModified == 1) {
                res.status(201).json({ status: 'success', msg: "deactivate node thành công" })
            } else {
                res.status(201).json({ status: 'success', msg: "Đã deactivate" })
            }
        } catch (err) {
            // console.log(err)
            const errors = handleErrors(err)
            res.status(400).json({ status: 'failure', errors })
        }
    }

    async post_InActiveDevice(req, res, next) {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            res.status(422).json({ status: 'failure', errors: errors.array() })
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
                        return res.status(201).json({ status: 'success', msg: "Deactive thành công" })
                    }
                } else {
                    return res.status(201).json({ status: 'success', msg: "Không có quyền Deactive thiết bị" })
                }
            }
            const update = await Device.updateOne({ sn_number: serial }, { group: null, user_active_device: null })
            if (device.device_model == 'BSGW') {
                const updateNode = await Device.updateMany({ gateway: serial }, { group: null, user_active_device: null })
            }
            if (update.nModified == 1) {
                return res.status(201).json({ status: 'success', msg: "Deactive thành công" })
            } else {
                return res.status(201).json({ status: 'success', msg: "Device hiện tại không thuộc user nào" })
            }
        } catch (err) {
            // console.log(err)
            const errors = handleErrors(err)
            res.status(400).json({ status: 'failure', errors })
        }
    }

    async post_create(req, res, next) {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            res.status(422).json({ status: 'failure', errors: errors.array() })
            return
        }
        try {
            const { device_code, device_type_id, device_name, device_model, sn_number, fw_number, mfg, location, id_user_add_device } = req.body
            const device_type = await DeviceType.findOne({ _id: device_type_id })
            const type_properties = device_type.type_properties
            const device = await Device.create({ device_code, device_type: device_type._id, device_name, device_model, sn_number, fw_number, mfg, user_add_device: id_user_add_device, location, device_property: type_properties })
            res.status(201).json({ status: 'success', device: device })
        } catch (err) {
            // console.log(err)
            const errors = handleErrors(err)
            res.status(400).json({ status: 'failure', errors })
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
            res.status(201).json({ status: 'success', device: device })
        } catch (err) {
            // console.log(err)
            // const errors = handleErrors(err)
            res.status(400).json({ status: 'failure', err })
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
            res.status(201).json({ status: 'success', device: device })
        } catch (err) {
            // console.log(err)
            // const errors = handleErrors(err)
            res.status(400).json({ status: 'failure', err })
        }
    }

    // edit device info
    async put_updateDevice(req, res) {
        // console.log(req)
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            res.status(422).json({ errors: errors.array() })
            return
        }
        try {
            const deviceId = req.params.id
            const { device_name, device_type, fw_number, hw_number, mfg_date, country } = req.body
            const device = await Device.findByIdAndUpdate(deviceId, { device_name, device_type, fw_number, hw_number, mfg_date, country }, { new: true }).populate('device_type').populate('group')
            // await device.save()
            // console.log(device)
            res.status(200).json({ status: 'success', device: device })
        } catch (err) {
            console.log(err)
            const errors = handleErrors(err)
            res.status(400).json({ status: 'failure', errors })
        }
    }

    async delete_deleteDevice(req, res) {

        try {
            const errors = validationResult(req)
            if (!errors.isEmpty()) {
                res.status(422).json({ status: 'failure', errors: errors.array() })
                return
            }
            const idDevice = req.params.id
            const device = await Device.findById(idDevice);
            const deleteDevice = await Device.deleteOne({ _id: idDevice })
            if (device.device_model == 'BSGW') {
                const updateNode = await Device.updateMany({ gateway: device.sn_number }, { gateway: 'none' })
            }
            // await device.save()
            // console.log(device)
            res.status(201).json({ status: 'success' })
        } catch (err) {
            // console.log(err)
            const errors = handleErrors(err)
            res.status(400).json({ status: 'failure', errors })
        }
    }

    async post_logDevice(req, res) {
        try {
            let { serial, startDate, endDate } = req.body
            const from = startDate.split(/[\s-:]+/)
            const to = endDate.split(/[\s-:]+/)
            startDate = new Date(from[2], from[1] - 1, from[0], from[3], from[4])
            endDate = new Date(to[2], to[1] - 1, to[0], to[3], to[4])
            const logs = await DeviceLog.find({
                createdAt: {
                    $gte: startDate,
                    $lte: endDate
                },
                device_serial: serial
            }).sort('createdAt')

            // await device.save()
            //console.log(logs)
            res.status(200).json({ status: 'success', deviceLogs: logs })
        } catch (err) {
            // console.log(err)
            const errors = handleErrors(err)
            res.status(400).json({ status: 'failure', err: err.message })
        }
    }

    async post_exportLogDevice(req, res) {
        try {
            let { startDate, endDate, groupId, deviceModel } = req.body
            const from = startDate.split(/[\s-:]+/)
            const to = endDate.split(/[\s-:]+/)
            startDate = new Date(from[2], from[1] - 1, from[0], from[3], from[4])
            endDate = new Date(to[2], to[1] - 1, to[0], to[3], to[4])
            let arrSerials = []
            let deviceSerials
            let deviceType
            if (deviceModel == 'all') {
                deviceType = await DeviceType.find({ prefix: { $nin: ['AHSD', 'BSGW'] } }).lean()
                deviceSerials = await Device.find({
                    group: groupId,
                    device_model: { $nin: ['AHSD', 'BSGW'] }
                }, { '_id': 0, 'sn_number': 1 })
            } else {
                deviceType = await DeviceType.find({ prefix: deviceModel }).lean()
                deviceSerials = await Device.find({
                    group: groupId,
                    device_model: deviceModel
                }, { '_id': 0, 'sn_number': 1 })
            }


            for (const [key, value] of Object.entries(deviceSerials)) {
                arrSerials.push(value.sn_number)
            }

            const logs = await DeviceLog.find({
                createdAt: {
                    $gte: startDate,
                    $lte: endDate
                },
                device_serial: { $in: arrSerials }
            }).populate('devices').sort({ device_serial: 1, createdAt: 1 }).lean();
            // await device.save()
            // console.log(logs, groupId, deviceModel, deviceSerials)
            res.status(200).json({ status: 'success', deviceLogs: logs, deviceType: deviceType })
        } catch (err) {
            // console.log(err)
            const errors = handleErrors(err)
            res.status(400).json({ status: 'failure', err: err.message })
        }
    }
}

//khởi tạo controller
module.exports = new DeviceController