const { Router } = require('express');
const authController = require('../controllers/AuthController');
const { validate } = require('../middlewares/validator')


const router = Router();

router.get('/signup', authController.signup_get);
router.post('/signup', validate.validateSignup, authController.signup_post);
router.get('/sign-in', authController.login_get);
router.post('/sign-in', authController.login_post);
router.get('/sign-out', authController.logout_get);

module.exports = router;