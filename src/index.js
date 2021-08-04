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
const Device = db.device
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

//hekper handlebar
//if equal
hbs.registerHelper('if_', function (a, e, b, opts) {
  if (!a || !b || !e) {
    return opts.inverse(this);
  }
  switch (e) {
    case '==':
      if (a.toString() == b.toString()) {
        return opts.fn(this);
      } else {
        return opts.inverse(this);
      }
      break
    case 'not_in':
      const b_arr = b.split(',');
      let check = true;
      b_arr.every((val, idx) => {
        if (a.toString() == val.toString()) {
          check = false
          return false
        } else {
          return true
        }
      })
      if (check) {
        return opts.fn(this);
      } else {
        return opts.inverse(this);
      }
      break
    case 'is_exist':
      if (a) {
        return opts.fn(this);
      } else {
        return opts.inverse(this);
      }
      break
    default:
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

const devices = {};
const userRooms = {};
const userId = {};


io.on("connection", function (Socket) {
  const socketName = Socket.handshake.query.socketName
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
    // console.log(data)
    io.emit('server_data_sensor', data)
  })

  //start real time device
  Socket.on('start_real_time_device', (data) => {
    try {
      const { listDevices, user } = data
      userId[Socket.id] = user
      userRooms[user] = listDevices

      // console.log(listGateWay)
      listDevices.forEach(e => {
        const socketIdDevice = Object.keys(devices).find(key => devices[key] === e);
        let room = io.of("/").adapter.rooms.get(socketIdDevice) || {}

        // console.log(room.size)
        if(room.size == 1 ){
          console.log('join room')
          Socket.join(socketIdDevice)
          io.to(socketIdDevice).emit('start_real_time_device')
        }else if (room.size > 1) {
          Socket.join(socketIdDevice)
        }
      })
      // console.log(userId, userRooms)
    } catch (e) {
      console.log(e)
    }
  })

  Socket.on('device_connect', async (data) => {
    io.emit('device_connect', data);
    try {
      const serial = data
      devices[Socket.id] = serial
      // Socket.join(serial)
      if (String(serial).slice(0, 4) == 'BSGW') {
        const update_status = await Device.updateMany({ gateway: serial }, { status: 1 })
      } else {
        const update_status = await Device.findOneAndUpdate({ sn_number: serial }, { status: 1 })
      }
      // console.log(String(serial).slice(0, 4))
      console.log('device connect id socket', Socket.id, 'arr device ', devices)
      const dataSend = JSON.stringify({ status: "Connnect success" })
      io.to(Socket.id).emit('device_connected', dataSend)
    } catch (e) {
      console.log(e)
    }
  })

  // device send realtime value
  Socket.on('send_realtime_value', (device_value) => {
    try {
      const { serial, data, snNode } = JSON.parse(device_value);
      if (snNode != 'none') {
        let serial = snNode
        io.emit(serial, { data })
      } else {
        io.emit(serial, { data })
      }
      // console.log(serial, data, Socket.id)
    } catch (e) {
      console.log(e)
    }
  })

  //disconnect
  Socket.on("disconnect", async (reason) => {
    try {
      if (!devices[Socket.id]) {
        const arrRooms = userRooms[userId[Socket.id]] || []
        arrRooms.forEach(idroom => {
          const socketIdDevice = Object.keys(devices).find(key => devices[key] === idroom);
          let room = io.of("/").adapter.rooms.get(socketIdDevice)
          if (room) {
            if (room.size == 1) {
              console.log('stop real time')
              io.to(socketIdDevice).emit('end_real_time_device', idroom)
            }
          }
        })
        delete userId[Socket.id]
        // io.emit('end_real_time_device', socketName)
      } else {
        const serial = devices[Socket.id]
        if (String(serial).slice(0, 4) == 'BSGW') {
          console.log('device ' + devices[Socket.id] + ' disconnected')
          const update_status = await Device.updateMany({ gateway: serial }, { status: 0 })
          io.emit('device_disconnect', devices[Socket.id])
          delete devices[Socket.id]
        } else {
          console.log('device ' + devices[Socket.id] + ' disconnected')
          const update_status = await Device.findOneAndUpdate({ sn_number: serial }, { status: 0 })
          io.emit('device_disconnect', devices[Socket.id])
          Socket.leave(devices[Socket.id])
          delete devices[Socket.id]
        }
      }
    } catch (e) {
      console.log(e)
    }
  })
  // node_disconnected
  Socket.on("node_status", async (data) => {
    try {
      const { serial, status } = data
      // console.log(data)
      // status : 1 -online; 2 - sleep; 0 - ofline
      // serial : sn number node
      const update_status = await Device.findOneAndUpdate({ sn_number: serial }, { status: status })
      io.emit('node_status', { serial, status })
    } catch (e) {
      console.log(e)
    }
  })
})


route(app)

server.listen(PORT, () => { console.log("Server started on http://localhost:" + PORT) })

module.exports = app;