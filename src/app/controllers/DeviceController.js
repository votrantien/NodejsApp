const db = require("../models")
const User = db.user
const Device = db.device
const DeviceType = db.deviceType
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
        const location = res.locals.user.farm
        const device = await Device.find({ location: location }).populate('device_type').populate('id_user_add_device', 'username').populate('id_user_active_device', 'username').lean()
        const device_type = await DeviceType.find().lean()
        // console.log(device)
        res.render('device', { username: res.locals.user.username, farm: res.locals.user.farm, idUser: res.locals.user.id, devices: device, device_types: device_type })
    }

    async post_RegisterDevice(req, res, next) {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            res.status(422).json({ errors: errors.array() })
            return
        }
        try {
            const {Serial, Fw, Hw, Date, Country } = req.body
            const device_model = Serial.slice(0, 4)
            const serial_number = Serial.slice(4)
            const device_type = await DeviceType.findOne({ prefix: device_model })
            const device_name = `${device_type.device_type} - ${serial_number}`
            const id_user_add_device = res.locals.user._id
            // return res.status(201).json({ Serial, Fw, Hw, Date, Country, device_model, device_type,device_name})
            const device = await Device.create({ device_type: device_type._id, device_name, device_model, sn_number:Serial, fw_number:Fw, hw_number:Hw, group_device:'null', mfg_date: Date, user_add_device: id_user_add_device, country:Country })
            res.status(201).json({ device: device })
        }
        catch (err) {
            // console.log(err)
            const errors = handleErrors(err)
            res.status(400).json({ errors })
        }
    }

    async post_create(req, res, next) {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            res.status(422).json({ errors: errors.array() })
            return
        }
        try {
            const { device_code, device_type_id, device_name, device_model, sn_number, fw_number, mfg, location, id_user_add_device } = req.body
            const device_type = await DeviceType.findOne({ _id: device_type_id })
            const type_properties = device_type.type_properties
            const device = await Device.create({ device_code, device_type: device_type._id, device_name, device_model, sn_number, fw_number, mfg, user_add_device: id_user_add_device, location, device_property: type_properties })
            res.status(201).json({ device: device })
        }
        catch (err) {
            // console.log(err)
            const errors = handleErrors(err)
            res.status(400).json({ errors })
        }
    }

    async get_list(req, res) {
        // console.log(req.params.location)
        const location = res.locals.user ? res.locals.user.farm : ''
        // console.log(res.locals.user)
        try {
            const device = await Device.find({ location: location }).populate('device_type').populate('id_user_add_device', 'username').populate('id_user_active_device', 'username')
            res.status(201).json({ device: device })
        }
        catch (err) {
            // console.log(err)
            // const errors = handleErrors(err)
            res.status(400).json({ err })
        }
    }

    async get_device(req, res) {
        // console.log(res.locals.user)
        try {
            // console.log(Device.populated('device_types'))

            const device = await Device.find({ _id: req.params.id }).populate('device_type').populate('id_user_add_device', 'username').populate('id_user_active_device', 'username')
            res.status(201).json({ device: device })
        }
        catch (err) {
            // console.log(err)
            // const errors = handleErrors(err)
            res.status(400).json({ err })
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
            res.status(201).json({ device: device })
        }
        catch (err) {
            console.log(err)
            const errors = handleErrors(err)
            res.status(400).json({ errors })
        }
    }

    async delete_delete(req, res) {

        try {
            const device = await Device.deleteOne({ _id: req.params.id })
            // await device.save()
            // console.log(device)
            res.status(201).json({ device: device })
        }
        catch (err) {
            // console.log(err)
            const errors = handleErrors(err)
            res.status(400).json({ errors })
        }
    }
}

//khởi tạo controller
module.exports = new DeviceController