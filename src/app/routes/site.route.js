const express = require('express')
const router = express.Router()
const GroupDeviceController = require('../controllers/GroupDeviceController')

router.get('/', GroupDeviceController.index)

module.exports = router;