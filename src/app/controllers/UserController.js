const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt');
const db = require("../models")
const User = db.user
var { validationResult } = require('express-validator')

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
        try{
            const user = await User.findOne({username: username}).lean()
            res.render('profile', {username: username, user_info: user})
        }catch{
            res.render('home')
        }
        
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