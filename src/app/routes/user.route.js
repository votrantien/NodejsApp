const express = require('express')
const router = express.Router()
const userController = require('../controllers/UserController')
const { requireAuth,requireLogin } = require('../middlewares/authMiddleware')
const { validate } = require('../middlewares/validator')


router.get('/', requireLogin,userController.index)
router.get('/profile', requireLogin,userController.get_profile)
router.put('/change-password/:username', requireAuth, validate.validateChangePassword, userController.put_changePassword)
module.exports = router;