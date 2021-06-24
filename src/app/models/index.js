// khoi tao mongoose
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const db = {};
db.mongoose = mongoose;
db.user = require("./user.model");
db.device = require("./device.model");
db.deviceType = require("./device_type.model");
module.exports = db;