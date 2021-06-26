const express = require('express')
const nodemailer = require("nodemailer");
const dotenv = require('dotenv').config()
const mongoose = require('mongoose')
const path = require("path")
const handlebars = require('express-handlebars')
const route = require('./app/routes')
const app = express()
const PORT = process.env.PORT || 3000
var cookieParser = require('cookie-parser')
app.use(cookieParser())

//socket io
const http = require('http');
const server = http.createServer(app);
// const { Server } = require("socket.io");
// const io = new Server(server);

const options = { 
  allowEIO3: true,
 };
const io = require("socket.io")(server, options);


//connect db
const db = require("./app/models")
const dbConfig = require("./app/config/db")

mongoose.set('useCreateIndex', true)
db.mongoose
  .connect(`mongodb://${process.env.DB_HOST}:${dbConfig.PORT}/${dbConfig.DB}`, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false
  })
  .then(() => {
    console.log("Successfully connect to MongoDB.")
    //initial()
  })
  .catch(err => {
    console.error("Connection error", err)
    process.exit()
  })

app.use(express.static(path.join(__dirname, "public")))

app.use(express.urlencoded({
  extended: true
}))

app.use(express.json())

app.engine('hbs', handlebars({
  extname: ".hbs"
}))

app.set('view engine', 'hbs')
app.set('views', path.join(__dirname, "resources", "views"))

//fix http status 304 khong logout ngay ma phai cho 30s
app.disable('etag')

app.use(function (req, res, next) {
  res.io = io;
  next();
});

io.on("connection", function (Socket) {
  // console.log(Socket.id)
  Socket.on('WEB_SET_UP_DEVICE', (data) => {
    let datajson = JSON.stringify({ EC_MAX: data.EC_MAX, PH_MAX: data.EC_MAX })
    // console.log(datajson)
    io.emit('SET_UP_DEVICE', datajson)
  })
  Socket.on('CONFIG_SUCCESS', (data) => {
    io.emit('CONFIG_SUCCESS', data)
  })
})

route(app)

server.listen(PORT, () => { console.log("Server started on http://localhost:" + PORT) })

module.exports = app;