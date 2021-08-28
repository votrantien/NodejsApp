const express = require('express')
const router = express.Router()
const deviceGroupController = require('../controllers/GroupDeviceController')
const { requireAuth,requireLogin } = require('../middlewares/authMiddleware')
const { validate } = require('../middlewares/validator')

router.put('/update/:id', requireAuth,deviceGroupController.put_UpdateGroup)
router.post('/create', requireAuth,deviceGroupController.post_CreateGroup)
router.post('/remove-access-user', requireAuth,deviceGroupController.post_RemoveAccessUser)
router.post('/share-group', requireAuth, validate.validateShareGroupDevice,deviceGroupController.post_ShareGroup)
router.delete('/delete/:id', requireAuth,deviceGroupController.delete_DeleteGroup)
router.get('/manage', requireLogin,deviceGroupController.index)
module.exports = router;