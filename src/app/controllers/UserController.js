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
    index(req, res) {
        res.render('home')
    }
    signin(req, res, next) {
        // Passport store user info in req.user
        const user = req.user
        // Generate jwt token for user, you can also add more data to sign, such as: role, birthday...
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
            res.render('profile', { username: username, user_info: user })
        } catch {
            res.render('home')
        }

    }

    async get_user(req, res) {
        try {
            const username = req.params.username
            const userId = req.body.decodedToken.id
            const user = await User.findOne({ username: username })
            if (user) {
                const group_device = await Group.find({ manage_user: username })
                res.json({ user, group_device })
            } else {
                res.json({ msg: 'Không tìm thấy user' })
            }
        } catch (err) {
            res.json({ err })
        }

    }

    async post_resetPassword(req, res) {
        let testAccount = await nodemailer.createTestAccount();
        let transporter = nodemailer.createTransport({
            service: "Gmail",
            auth: {
                user: "fatbearz94@gmail.com",
                pass: "Tien22081994"
            }
        });

        let info = await transporter.sendMail({
            from: '"Thuỷ canh" <sender@gmail.com>', // sender address
            to: "votrantienga@gmail.com", // list of receivers
            subject: "Test send email ✔", // Subject line
            text: "Hello world?", // plain text body
            html: "<b>Test chức năng gửi mail ứng dụng Nodejs với Nodemailer</b>" // html body
        });
        // console.log("Message sent: %s", info.messageId);
        // console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
        res.json(info.messageId)
    }
    async put_changePassword(req, res) {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            res.status(422).json({ errors: errors.array() })
            return
        }
        const { old_password, new_password } = req.body
        const username = req.params.username
        try {
            const opts = { runValidators: true };
            const salt = await bcrypt.genSalt();
            const password_update = await bcrypt.hash(new_password, salt);
            const user_result = await User.updateOne({ username: username }, {
                password: password_update
            }, opts)
            res.status(201).json({ result: user_result, message: 'success' })
        }
        catch (err) {
            // console.log(err)
            const errors = handleErrors(err)
            res.status(400).json({ errors })
        }
    }
}

//khởi tạo controller
module.exports = new UserController;