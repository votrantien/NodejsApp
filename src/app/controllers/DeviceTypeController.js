const db = require("../models")
const Device = db.device
const DeviceType = db.deviceType

// handle errors
const handleErrors = (err) => {
    console.log(err.message, err.code)
    let errors = {
        device_code: '',
    }

    // duplicate 
    if (err.code === 11000) {
        // console.log(err.keyValue)
        errors.device_code = `${Object.keys(err.keyValue)} is duplicate`
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

class DeviceTypeController {

    //GET trả về trang home
    index(req, res) {
        res.render('device_type', { username: res.locals.user.username, farm: res.locals.user.farm })
    }
    async post_create(req, res) {
        console.log(req.body)
        const { prefix, device_type, description } = req.body
        // const type_properties = JSON.parse(req.body.type_properties)
        try {
            const deviceType = await DeviceType.create({ prefix, device_type, description })
            res.status(201).json({ device_type: deviceType._id })
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
            const device = await Device.find({ location: location })
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
            const device = await Device.find({ _id: req.params.id })
            res.status(201).json({ device: device })
        }
        catch (err) {
            // console.log(err)
            // const errors = handleErrors(err)
            res.status(400).json({ err })
        }
    }

    async put_update(req, res) {

        try {
            const device = await Device.findByIdAndUpdate(req.params.id, {
                device_type_code: req.body.device_type_code,
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
            // console.log(err)
            const errors = handleErrors(err)
            res.status(400).json({ errors })
        }
    }

    async delete_delete(req, res) {

        try {
            const device = await Device.deleteOne({ _id: req.params.id });
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
module.exports = new DeviceTypeController;