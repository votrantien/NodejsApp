const express = require('express')
const router = express.Router()
const deviceTypeController = require('../controllers/DeviceTypeController')
const { requireAuth,requireLogin } = require('../middlewares/authMiddleware')

router.get('/', requireLogin,deviceTypeController.index)
router.post('/create', requireAuth,deviceTypeController.post_create)
router.get('/*', requireLogin,deviceTypeController.index)
module.exports = router;