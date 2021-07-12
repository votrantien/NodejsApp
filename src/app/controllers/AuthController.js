const db = require("../models")
const User = db.user
const Group = db.group
const jwt = require('jsonwebtoken')
var { validationResult } = require('express-validator')

// handle errors
const handleErrors = (err) => {
    console.log(err.message, err.code)
    let errors = { username: '', password: '' }

    // incorrect email
    if (err.message === 'incorrect username') {
        errors.username = 'Sai tên đăng nhập hoặc user không tồn tại'
    }

    // incorrect password
    if (err.message === 'incorrect password') {
        errors.password = 'Mật khẩu không đúng'
    }

    // duplicate email error
    if (err.code === 11000) {
        errors.username = 'that username is already registered'
        return errors
    }

    // validation errors
    if (err.message.includes('user validation failed')) {
        // console.log(err)
        Object.values(err.errors).forEach(({ properties }) => {
            // console.log(val)
            // console.log(properties)
            errors[properties.path] = properties.message
        })
    }

    return errors
}

// create json web token
const maxAge = 3 * 24 * 60 * 60
const createToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: maxAge
    })
}

// controller actions
module.exports.signup_get = (req, res) => {
    res.render('signup')
}

module.exports.login_get = (req, res) => {
    res.render('login')
}

module.exports.signup_post = async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        res.status(422).json({ errors: errors.array() })
        return
    }
    try {
        const { username, password, fullname, phone, email, groupname } = req.body
        const role = 'user'
        let default_group 
        const user = await User.create({ username, email, password, fullname, phone, role })
        if(user){
            default_group = await Group.create({group_name: `${groupname} - ${username}`,manage_user: user.username,access_user:null})
        }
        //const token = createToken(user._id)
        //res.cookie('jwt', token, { httpOnly: true, maxAge: maxAge * 1000 })
        res.status(201).json({ user: user, default_group })
    }
    catch (err) {
        // console.log(err)
        const errors = handleErrors(err)
        res.status(400).json({ errors })
    }

}

module.exports.login_post = async (req, res) => {
    const { username, password } = req.body

    try {
        const user = await User.login(username, password)
        const token = createToken(user._id)
        res.cookie('jwt', token, { httpOnly: true, maxAge: maxAge * 1000 })
        res.status(200).json({ user: user._id, token: token })
    }
    catch (err) {
        const errors = handleErrors(err)
        res.status(400).json({ errors })
    }

}

module.exports.logout_get = (req, res) => {
    res.cookie('jwt', '', { maxAge: 1 })
    res.redirect('/auth/sign-in')
}