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
//global variable
global.otp = '';
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
        case '>':
            if (a > b) {
                return opts.fn(this);
            } else {
                return opts.inverse(this);
            }
            break
        case 'not_in':
            const notInArr = b.split(',');
            let checkNotIn = true;
            notInArr.every((val, idx) => {
                if (a.toString() == val.toString()) {
                    checkNotIn = false
                    return false
                } else {
                    return true
                }
            })
            if (checkNotIn) {
                return opts.fn(this);
            } else {
                return opts.inverse(this);
            }
            break
        case 'in':
            const inArr = b.split(',');
            let checkInArr = inArr.indexOf(a.toString());
            if (checkInArr != -1) {
                return opts.fn(this);
            } else {
                return opts.inverse(this);
            }
            break
        case 'isIn':
            console.log(b);
            if (b.indexOf(a.toString()) != -1) {
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
            listDevices.forEach(serial => {
                const idRoom = serial
                let room = io.of("/").adapter.rooms.get(idRoom) || {}

                // console.log(room.size)
                if (room.size == 1) {
                    console.log(user, ' join room and start real time')
                    Socket.join(idRoom)
                    io.to(idRoom).emit('start_real_time_device')
                } else if (room.size > 1) {
                    console.log(user, ' join room')
                    Socket.join(idRoom)
                } else if (!room.size) {
                    io.to(Socket.id).emit('device_disconnect', serial)
                }
            })
            //console.log(io.of("/").adapter.rooms)
        } catch (e) {
            console.log(e)
        }
    })

    Socket.on('device_connect', (data) => {
        try {
            const serial = data
            devices[Socket.id] = serial
            Socket.join(serial)
            console.log(userRooms)
            Socket.broadcast.emit('device_connect', data);

            const update_status = Device.updateOne({ sn_number: serial }, { status: 1 })
            update_status.then()

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
            if (typeof device_value !== 'object') {
                device_value = JSON.parse(device_value)
            }
            const { serial, data, snNode } = device_value
            const room = serial
            // console.log(serial, 'send value ', data)
            if (snNode != 'none') {
                let serial = snNode
                Socket.to(room).emit('realtime_device_value', { serial, data })
            } else {
                Socket.to(room).emit('realtime_device_value', { serial, data })
            }
            // console.log(serial, data, Socket.id)
        } catch (e) {
            console.log(e)
        }
    })

    //disconnect
    Socket.on("disconnect", (reason) => {
        try {
            //neu socketid ko co trong arr device => user disconnect
            if (!devices[Socket.id]) {
                //arr cac client cung ket noi den 1 room device
                //userRooms = { socket.id_user: serial_devie(idroom) }
                const arrRooms = userRooms[userId[Socket.id]] || []

                arrRooms.forEach(idRoom => {
                    let room = io.of("/").adapter.rooms.get(idRoom)
                    if (room) {
                        if (room.size == 1) {
                            console.log('stop real time')
                            io.to(idRoom).emit('end_real_time_device')
                        }
                    }
                })

                //delete user in user room
                delete userId[Socket.id]
                // io.emit('end_real_time_device', socketName)
            } else {
                const serial = devices[Socket.id]
                const room = serial
                if (String(serial).slice(0, 4) == 'BSGW') {
                    console.log('device ' + devices[Socket.id] + ' disconnected')
                    Socket.to(room).emit('device_disconnect', devices[Socket.id])

                    const update_status = Device.updateOne({ sn_number: serial }, { status: 0 })
                    const update_status_node = Device.updateMany({ gateway: serial }, { status: 0 })
                    update_status_node.then()
                    update_status.then()

                    //leave all client of room
                    io.socketsLeave(room)

                    delete devices[Socket.id]
                    // const update_status = await Device.updateMany({ gateway: serial }, { status: 0 })
                } else {
                    console.log('device ' + devices[Socket.id] + ' disconnected')
                    Socket.to(room).emit('device_disconnect', devices[Socket.id])

                    const update_status = Device.updateOne({ sn_number: serial }, { status: 0 })
                    update_status.then()

                    //leave all client of room
                    io.socketsLeave(room)

                    delete devices[Socket.id]
                    // const update_status = await Device.findOneAndUpdate({ sn_number: serial }, { status: 0 })
                }
            }
            //console.log(io.of("/").adapter.rooms)
        } catch (e) {
            console.log(e)
        }
    })
    // node_disconnected
    Socket.on("node_status", (data) => {
        try {
            if (typeof data !== 'object') {
                data = JSON.parse(data)
            }
            const { serial, status } = data
            const serialGw = devices[Socket.id]
            const room = serialGw
            // console.log(data)
            // status : 1 -online; 2 - sleep; 0 - ofline
            // serial : sn number node
            // const update_status = await Device.findOneAndUpdate({ sn_number: serial }, { status: status })
            const update_status = Device.updateOne({ sn_number: serial }, { status: status })
            update_status.then()
            Socket.to(room).emit('node_status', { serial, status })
        } catch (e) {
            console.log(e)
        }
    })
})


route(app)

server.listen(PORT, () => { console.log("Server started on http://localhost:" + PORT) })

module.exports = app;