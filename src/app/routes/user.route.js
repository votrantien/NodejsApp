const express = require('express')
const router = express.Router()
const userController = require('../controllers/UserController')
const { requireAuth, requireLogin } = require('../middlewares/authMiddleware')
const { validate } = require('../middlewares/validator')


router.get('/', requireLogin, userController.index)
router.post('/reset-password', userController.post_resetPassword)
router.get('/profile', requireAuth, userController.get_profile)
router.post('/change-email', requireAuth, validate.validateChangeEmail, userController.post_ChangeEmail)
router.post('/request-otp', userController.post_RequestOtp)
router.get('/user-info', requireAuth, userController.get_user)
router.put('/change-password', requireAuth, validate.validateChangePassword, userController.put_changePassword)

module.exports = router;