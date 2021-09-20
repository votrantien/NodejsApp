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

class GroupDeviceController {

    //GET trả về trang home
    async index(req, res) {
        const user = res.locals.user
        const userId = mongoose.Types.ObjectId(user._id)
        let listGroup, listGroupShare
        if (user.role == 'admin') {
            listGroup = await GroupDevice.find().populate('access_user').lean()
        } else {
            listGroup = await GroupDevice.find({ manage_user: user.username }).populate('access_user').lean()
            listGroupShare = await GroupDevice.find({ access_user: userId }).populate('access_user').lean()
        }

        res.render('device_group_manage', { username: user.username, listGroup, listGroupShare, title: "Quản lý nhóm thiết bị" })
    }

    async put_UpdateGroup(req, res) {
        try {
            const user = res.locals.user
            const userName = user.username
            const groupId = req.params.id
            const { groupName, groupDesc } = req.body
            const update = await GroupDevice.updateOne({ _id: groupId, manage_user: userName }, { group_name: groupName, description: groupDesc })
            if (update.n == 1) {
                if (update.nModified == 1) {
                    return res.status(200).json({ status: 'success', msg: 'Update thành công' })
                } else {
                    return res.status(200).json({ status: 'success', msg: 'Không có sự thay đổi' })
                }
            } else {
                return res.status(400).json({ status: 'failure', errors: [{msg:'Không tìm thấy nhóm cần update'}]})
            }
        } catch (err) {
            return res.status(400).json({ status: 'failure', errors: [{msg: err.message }]})
        }
    }

    async post_ShareGroup(req, res) {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(422).json({ status: 'failure', errors: errors.array() })
        }
        try {
            const user = res.locals.user
            const { shareUserName, groupId } = req.body
            const shareUser = await User.findOne({ username: shareUserName })
            const checkUpdate = await GroupDevice.find({ _id: groupId, manage_user: user.username, access_user: shareUser._id })

            if (checkUpdate.length == 0) {
                const update = await GroupDevice.updateOne({ _id: groupId, manage_user: user.username }, { $push: { access_user: shareUser._id } })
                if (update.n == 1) {
                    if (update.nModified == 1) {
                        return res.status(200).json({ status: 'success', msg: 'Share thành công', shareUser })
                    } else {
                        return res.status(200).json({ status: 'success', msg: 'Không có sự thay đổi', shareUser })
                    }
                } else {
                    return res.status(400).json({ status: 'failure', errors: [{msg: 'Nhóm đã được chia sẽ với user này'}]  })
                }
            } else {
                return res.status(400).json({ status: 'failure', errors: [{msg: 'Nhóm đã được chia sẽ với user này'}] })
            }
        } catch (err) {
            return res.status(400).json({ status: 'failure', errors: [{msg: err.message}] })
        }
    }

    async post_CreateGroup(req, res) {
        try {
            const user = res.locals.user
            const userName = user.username
            const { groupName, groupDesc } = req.body
            const create = await GroupDevice.create({ group_name: groupName, manage_user: userName, description: groupDesc, access_user: [] })
            return res.status(200).json({ status: 'success', groupDevice: create })
        } catch (err) {
            return res.status(400).json({ status: 'failure', errors: [{msg:  err.message }]})
        }
    }

    async delete_DeleteGroup(req, res) {
        try {
            const user = res.locals.user
            const userName = user.username
            const groupId = req.params.id
            const checkGroup = await Device.find({ group: groupId })
            if (checkGroup.length == 0) {
                const deleteGroup = await GroupDevice.deleteOne({ _id: groupId, manage_user: userName })
                if (deleteGroup.n == 1) {
                    return res.status(200).json({ status: 'success', msg: 'Delete thành công' })
                } else {
                    return res.status(400).json({ status: 'failure', errors: [{msg:  'Không tìm thấy group cần xoá' }]})
                }
            } else {
                return res.status(400).json({ status: 'failure', errors: [{msg:  'Chuyển tất cả thiết bị ra khỏi trước khi xoá' }]})
            }

        } catch (err) {
            return res.status(400).json({ status: 'failure', errors: [{msg:  err.message }]})
        }
    }

    async post_RemoveAccessUser(req, res) {
        try {
            const user = res.locals.user
            const userName = user.username
            const { accessUserId, groupId } = req.body

            const removeAccessUser = await GroupDevice.updateOne({ _id: groupId, manage_user: userName }, { $pullAll: { access_user: [accessUserId] } })
            if (removeAccessUser.n == 1) {
                return res.status(200).json({ status: 'success', msg: 'Remove thành công' })
            } else {
                return res.status(400).json({ status: 'failure', errors: [{msg: 'Không tìm thấy group tương ứng' }]})
            }
        } catch (err) {
            return res.status(400).json({ status: 'failure', errors: [{msg:  err.message }]})
        }
    }
}

//khởi tạo controller
module.exports = new GroupDeviceController