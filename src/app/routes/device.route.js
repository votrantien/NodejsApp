const express = require('express')
const router = express.Router()
const deviceController = require('../controllers/DeviceController')
const { requireAuth, requireLogin } = require('../middlewares/authMiddleware')
const { validate } = require('../middlewares/validator')

router.get('/', requireLogin, deviceController.index)
router.get('/manage', requireLogin, deviceController.get_DeviceManage)
router.get('/sensor', requireLogin, deviceController.get_SensorValue)
router.get('/test', requireLogin, deviceController.get_SensorValueTest)
router.get('/ahsd', requireLogin, deviceController.get_AhsdValue)
router.get('/GetTimeServer', deviceController.get_getTimeServer)
router.post('/register-device', validate.validateRegisterDevice, deviceController.post_RegisterDevice)
router.post('/add-value', validate.validateAddDeviceValue, deviceController.post_AddDeviceValue)
router.post('/active-device', validate.validateActiveDevice, deviceController.post_ActiveDevice)
router.post('/active-node', validate.validateActiveNode, deviceController.post_ActiveNode)
router.post('/deactivate-node', validate.validateDeactivateNode, deviceController.post_InActiveNode)
router.post('/deactivate-device', validate.validateInActiveDevice, deviceController.post_InActiveDevice)
router.post('/create', requireAuth, validate.validateCreateDevice, deviceController.post_create)
router.post('/change-device-group', requireAuth, validate.validateChangeDeviceGroup, deviceController.post_ChangeDeviceGroup)
router.get('/list', requireAuth, deviceController.get_list)
router.get('/:id', requireAuth, deviceController.get_device)
router.put('/update/:id', requireAuth, validate.validateUpdateDevice, deviceController.put_updateDevice)
router.delete('/delete/:id', requireAuth, validate.validateDeleteDevice, deviceController.delete_deleteDevice)
router.post('/device-logs', deviceController.post_logDevice)
router.post('/export-device-logs', deviceController.post_exportLogDevice)
router.get('/*', requireLogin, deviceController.index)
module.exports = router;