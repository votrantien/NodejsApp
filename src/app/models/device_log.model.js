const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const deviceLogSchema = new mongoose.Schema({
  device_serial: {
    type: String,
  },
  device_value: {},
  amount_of_values: { type: Number, default: 1 },
  status: { type: Number, default: 1 },
},
  { timestamps: true }
);

const DeviceLog = mongoose.model('device_log', deviceLogSchema);

module.exports = DeviceLog;