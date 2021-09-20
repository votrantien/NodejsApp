const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt');
const db = require("../models")
const User = db.user
const Group = db.group
var { validationResult } = require('express-validator')
const nodemailer = require("nodemailer")

// handle errors
const handleErrors = (err) => {
    console.log(err.message, err.code)

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


class UserController {
    //GET trả về trang home
    async index(req, res) {
        const userList = await User.find({ username: { $ne: 'admin' } }).lean();
        const user = res.locals.user
        res.render('user_manage', { userList, title: 'Quản lý user', username: user.username })
    }
    signin(req, res, next) {
        const user = req.user
        const token = jwt.sign(
            { id: user.id, username: user.username },
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_LIFE
            })
        res.json({ user, token })
    }

    async get_profile(req, res) {
        const username = res.locals.user.username
        try {
            const user = await User.findOne({ username: username }).lean()
            res.render('profile', { username: username, user_info: user, title: 'Thông tin tài khoản' })
        } catch {
            res.render('home')
        }

    }

    async get_user(req, res) {
        try {
            // const username = req.params.username
            const userId = req.body.decodedToken.id
            console.log(userId)
            const user = await User.findById(userId)
            if (user) {
                const group_device = await Group.find({ manage_user: user.username })
                res.json({ status: 'success', user, group_device })
            } else {
                res.json({ status: 'failure', msg: 'Không tìm thấy user' })
            }
        } catch (err) {
            res.json({ status: 'failure', err })
        }

    }

    async post_resetPassword(req, res) {
        const { email, userName } = req.body
        let testAccount = await nodemailer.createTestAccount();
        let transporter = nodemailer.createTransport({
            service: "Gmail",
            auth: {
                user: "fatbearz94@gmail.com",
                pass: "Tien22081994"
            }
        })

        let info = await transporter.sendMail({
            from: '"Thuỷ canh" <sender@gmail.com>', // sender address
            to: "votrantienga@gmail.com", // list of receivers
            subject: "Test send email ✔", // Subject line
            text: "Hello world?", // plain text body
            html: "<b>Test chức năng gửi mail ứng dụng Nodejs với Nodemailer</b>" // html body
        })
        // console.log("Message sent: %s", info.messageId);
        // console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
        res.json(info.messageId)
    }

    async post_RequestOtp(req, res) {
        try {
            const { userName } = req.body
            otp = parseInt(Math.random() * 1000000);
            const user = await User.findOne({ username: userName })
            const email = user?.email
            if (email) {
                let testAccount = await nodemailer.createTestAccount();
                let transporter = nodemailer.createTransport({
                    service: "Gmail",
                    auth: {
                        user: "fatbearz94@gmail.com",
                        pass: "Tien22081994"
                    }
                })

                let info = await transporter.sendMail({
                    from: '"Thuỷ canh" <sender@gmail.com>', // sender address
                    to: email, // list of receivers
                    subject: "Thuỷ canh app OTP", // Subject line
                    text: "", // plain text body
                    html: '<p>Mã otp của bạn</p></br><b style="padding: 10px;font-size: 2rem;background-color: aquamarine;margin: auto;">' + otp + '</b>' // html body
                })
                return res.status(201).json({ status: 'success', msg: 'Một mã otp vừa được gửi đến mail bạn' })
            } else {
                res.status(400).json({ status: 'failure', errors: [{ msg: 'User không tồn tại' }] })
            }
        } catch (err) {
            res.status(400).json({ status: 'failure', errors: [{ msg: err.message }] })
        }

        // console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    }

    async post_ChangeEmail(req, res) {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            res.status(422).json({ status: 'failure', errors: errors.array() })
            return
        }
        try {
            const { newEmail, userName, otpCode } = req.body
            if (otpCode == otp && otp != '0') {
                otp = 0
                const updateUser = await User.updateOne({ username: userName }, { email: newEmail })
                if (updateUser.n != 0) {
                    return res.status(201).json({ status: 'success', msg: 'Thay đổi email thành công' })
                } else {
                    res.status(400).json({ status: 'failure', errors: [{ msg: 'Không tìm thấy user tương ứng' }] })
                }
            } else {
                res.status(400).json({ status: 'failure', errors: [{ msg: 'Mã otp không hợp lệ' }] })
            }

        } catch (err) {
            res.status(400).json({ status: 'failure', errors: [{ msg: err.message }] })
        }

    }


    async put_changePassword(req, res) {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            res.status(422).json({ status: 'failure', errors: errors.array() })
            return
        }
        const { old_password, new_password } = req.body
        const username = res.locals.user.username
        try {
            const opts = { runValidators: true }
            const salt = await bcrypt.genSalt()
            const user = await User.findOne({ username: username })
            const current_pass = user.password
            const chk_pass = await bcrypt.compare(old_password, current_pass);
            if (chk_pass) {
                const password_update = await bcrypt.hash(new_password, salt)
                const user_result = await User.updateOne({ username: username }, {
                    password: password_update
                }, opts)
                res.status(201).json({ status: 'success', msg: 'đổi mật khẩu thành công' })
            } else {
                res.status(422).json({ status: 'failure', errors: [{ msg: 'Mật khẩu cũ không đúng' }] })
            }
        }
        catch (err) {
            // console.log(err)
            const errors = handleErrors(err)
            res.status(400).json({ status: 'failure', errors })
        }
    }

    async put_changeInfo(req, res) {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            res.status(422).json({ status: 'failure', errors: errors.array() })
            return
        }
        const { fullname, phone, email } = req.body
        const id = req.params.id
        const user = res.locals.user
        try {
            if (user.role == 'admin') {
                const userInfo = await User.updateOne({ _id: id }, { fullname: fullname, email: email, phone: phone })
                if (userInfo.n == 0) {
                    res.status(400).json({ status: 'failure', msg: 'Không tìm thấy user' })
                }
                res.status(201).json({ status: 'success' })
            } else {
                if (user._id == id) {
                    const userInfo = await User.updateOne({ _id: id }, { fullname: fullname, email: email, phone: phone })
                    if (userInfo.n == 0) {
                        res.status(400).json({ status: 'failure', msg: 'Không tìm thấy user' })
                    }
                    res.status(201).json({ status: 'success' })
                } else {
                    res.status(422).json({ status: 'failure', msg: 'not permission' })
                }
            }
        }
        catch (err) {
            // console.log(err)
            const errors = handleErrors(err)
            res.status(400).json({ status: 'failure', errors })
        }
    }

    async put_InactiveUser(req, res) {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            res.status(422).json({ status: 'failure', errors: errors.array() })
            return
        }
        const id = req.params.id
        const userRole = res.locals.user.role
        try {
            if (userRole == 'admin') {
                const userInfo = await User.updateOne({ _id: id }, { status: 0 })
                if (userInfo.n == '0') {
                    res.status(201).json({ status: 'success', msg: 'không tìm thấy user' })
                }
                res.status(201).json({ status: 'success' })
            } else {
                res.status(422).json({ status: 'failure', errors: 'Not permission' })
            }
        }
        catch (err) {
            // console.log(err)
            const errors = handleErrors(err)
            res.status(400).json({ status: 'failure', errors })
        }
    }

    async put_ActiveUser(req, res) {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            res.status(422).json({ status: 'failure', errors: errors.array() })
            return
        }
        const id = req.params.id
        const userRole = res.locals.user.role
        try {
            if (userRole == 'admin') {
                const userInfo = await User.updateOne({ _id: id }, { status: 1 })
                if (userInfo.n == '0') {
                    res.status(201).json({ status: 'success', msg: 'không tìm thấy user' })
                }
                res.status(201).json({ status: 'success' })
            } else {
                res.status(422).json({ status: 'failure', errors: 'Not permission' })
            }
        }
        catch (err) {
            // console.log(err)
            const errors = handleErrors(err)
            res.status(400).json({ status: 'failure', errors })
        }
    }

    async put_ResetPassword(req, res) {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            res.status(422).json({ status: 'failure', errors: errors.array() })
            return
        }
        const id = req.params.id
        const userRole = res.locals.user.role
        const salt = await bcrypt.genSalt()
        try {
            if (userRole == 'admin') {
                const defaultPassword = process.env.DEFAULT_USER_PASS
                const password_update = await bcrypt.hash(defaultPassword, salt)
                const user_result = await User.updateOne({ _id: id }, {
                    password: password_update
                })
                if (user_result.n == '0') {
                    res.status(201).json({ status: 'success', msg: 'không tìm thấy user' })
                }
                res.status(201).json({ status: 'success' })
            } else {
                res.status(422).json({ status: 'failure', errors: 'Not permission' })
            }
        }
        catch (err) {
            // console.log(err)
            const errors = handleErrors(err)
            res.status(400).json({ status: 'failure', errors })
        }
    }
}

//khởi tạo controller
module.exports = new UserController;