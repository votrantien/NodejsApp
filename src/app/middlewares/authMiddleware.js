const jwt = require('jsonwebtoken')
const User = require('../models/user.model')

const requireAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'] && req.headers['authorization'].split(' ')[1]
    // console.log(authHeader)
    const token = req.cookies.jwt || authHeader
    // console.log(authHeader.split(' ')[1])
    // check json web token exists & is verified
    if (token) {
        jwt.verify(token, process.env.JWT_SECRET, (err, decodedToken) => {
            if (err) {
                console.log(err.message)
                res.status(401).json({ errors: 'Unauthorize' })
            } else {
                // console.log(decodedToken)
                next()
            }
        })
    } else {
        res.status(401).json({ errors: 'Unauthorize' })
    }
}

const requireLogin = async (req, res, next) => {
    const token = await req.cookies.jwt

    // check json web token exists & is verified
    if (token) {
        jwt.verify(token, process.env.JWT_SECRET, (err, decodedToken) => {
            if (err) {
                console.log(err.message)
                res.redirect('/auth/sign-in')
            } else {
                // console.log(decodedToken)
                next()
            }
        })
    } else {
        res.redirect('/auth/sign-in')
    }
}

// check current user
const checkUser = (req, res, next) => {
    const authHeader = req.headers['authorization'] && req.headers['authorization'].split(' ')[1]
    // console.log(authHeader)
    const token = req.cookies.jwt || authHeader
    // console.log(token)
    if (token) {
        jwt.verify(token, process.env.JWT_SECRET, async (err, decodedToken) => {
            if (err) {
                res.locals.user = null
                next()
            } else {
                let user = await User.findById(decodedToken.id)
                res.locals.user = user
                // console.log(user)
                next()
            }
        })
    } else {
        res.locals.user = null
        next()
    }
}


module.exports = { requireAuth, requireLogin, checkUser }