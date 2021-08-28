// khoi tao mongoose
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const db = {};
db.mongoose = mongoose;
db.user = require("./user.model");
db.group = require("./device_group.model");
db.device = require("./device.model");
db.deviceType = require("./device_type.model");
db.deviceLog = require("./device_log.model");
module.exports = db;