const express = require('express')
const router = express.Router()
const deviceController = require('../controllers/DeviceController')
const { requireAuth,requireLogin } = require('../middlewares/authMiddleware')
const { validate } = require('../middlewares/validator')

router.get('/', requireLogin,deviceController.index)
router.post('/create', requireAuth, validate.validateCreateDevice,deviceController.post_create)
router.get('/list', requireAuth,deviceController.get_list)
router.get('/:id', requireAuth,deviceController.get_device)
router.put('/update/:id', requireAuth, validate.validateUpdateDevice ,deviceController.put_update)
router.delete('/delete/:id', requireAuth,deviceController.delete_delete)
router.get('/*', requireLogin,deviceController.index)
module.exports = router;