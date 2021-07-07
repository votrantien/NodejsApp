const express = require('express')
const router = express.Router()
const deviceController = require('../controllers/DeviceController')
const { requireAuth,requireLogin } = require('../middlewares/authMiddleware')
const { validate } = require('../middlewares/validator')

router.get('/', requireLogin,deviceController.get_DeviceValue)
module.exports = router;