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
//chartjs
const Chart = require('chart.js');

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
// `mongodb://${process.env.DB_HOST}:${dbConfig.PORT}/${dbConfig.DB}`
mongoose.set('useCreateIndex', true)
db.mongoose
  .connect(`${process.env.CLOUD_MONGO}/${dbConfig.DB}`, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
    serverSelectionTimeoutMS: 5000,
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
var hbs = require('handlebars');

hbs.registerHelper('if_eq', function (a, b, opts) {
    if (a.toString() == b.toString()) {
      return opts.fn(this);
    } else {
      return opts.inverse(this);
    }
});

hbs.registerHelper('if_neq', function (a, b, opts) {
  if (a.toString() != b.toString()) {
    return opts.fn(this);
  } else {
    return opts.inverse(this);
  }
});

app.set('view engine', 'hbs')
app.set('views', path.join(__dirname, "resources", "views"))

//fix http status 304 khong logout ngay ma phai cho 30s
app.disable('etag')

app.use(function (req, res, next) {
  res.io = io;
  next();
});

io.on("connection", function (Socket) {
  const socketName = Socket.handshake.query.socketName;
  // console.log(socketName);
  // console.log(Socket.id)
  Socket.on('WEB_SET_UP_DEVICE', (data) => {
    let datajson = JSON.stringify({ EC_MAX: data.EC_MAX, PH_MAX: data.EC_MAX })
    // console.log(datajson)
    io.emit('SET_UP_DEVICE', datajson)
  })
  Socket.on('CONFIG_SUCCESS', (data) => {
    io.emit('CONFIG_SUCCESS', data)
  })
  Socket.on('data_sensor', (data) => {
    console.log(data)
    io.emit('server_data_sensor', data)
  })

  //start real time device
  Socket.on('start_real_time_device', (data) => {
    const { list_devices, socketName } = data;
    //console.log(list_devices, socketName)
    list_devices.forEach(e => {
      const dataSend = JSON.stringify({serial: e, socketName})
      io.emit('start_real_time_device', dataSend)
    });
  })

  Socket.on('device_send_value', (data) => {
    const { serial, socketName, Data } = JSON.parse(data);
    console.log(serial, socketName, Data)
    io.emit(socketName, {serial,Data})
  })
  //disconnect
  Socket.on("disconnect", (reason) => {
    io.emit('end_real_time_device', socketName)
  });
})

route(app)

server.listen(PORT, () => { console.log("Server started on http://localhost:" + PORT) })

module.exports = app;