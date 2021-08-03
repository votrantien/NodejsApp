const express = require('express')
const router = express.Router()
const deviceController = require('../controllers/DeviceController')
const { requireAuth,requireLogin } = require('../middlewares/authMiddleware')
const { validate } = require('../middlewares/validator')

router.get('/sensor', requireLogin,deviceController.get_SensorValue)
router.get('/test', requireLogin,deviceController.get_SensorValueTest)
router.get('/ahsd', requireLogin,deviceController.get_AhsdValue)
module.exports = router;