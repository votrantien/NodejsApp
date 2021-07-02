const express = require('express')
const router = express.Router()
const userController = require('../controllers/UserController')
const { requireAuth, requireLogin } = require('../middlewares/authMiddleware')
const { validate } = require('../middlewares/validator')


router.get('/', requireLogin, userController.index)
router.post('/reset-password', requireAuth, userController.post_resetPassword)
router.get('/profile', requireLogin, userController.get_profile)
router.get('/user-info/:username', requireAuth, userController.get_user)
router.put('/change-password/:username', requireAuth, validate.validateChangePassword, userController.put_changePassword)

module.exports = router;