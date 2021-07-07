const userRouter = require('./user.route')
const deviceRouter = require('./device.route')
const deviceTypeRouter = require('./device_type.route')
const deviceValueRouter = require('./device_value.route')
const authRouter = require('./auth.route')
const { requireAuth, checkUser,requireLogin } = require('../middlewares/authMiddleware')


function route(app){
  app.use('*', checkUser)
  app.use('/auth', authRouter)
  app.use('/user', userRouter)
  app.use('/device', deviceRouter)
  app.use('/device-value', deviceValueRouter)
  app.use('/device-type', deviceTypeRouter)
  app.get('/', requireLogin ,(req, res) => {
    // console.log(res.locals.user)
    res.render('home',{username: res.locals.user.username})
  })
}

module.exports = route