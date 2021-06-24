const mongoose = require('mongoose');

const deviceTypeSchema = new mongoose.Schema({
  device_type_code: {
    type: String,
    required: [true, 'Please enter a device_type_code'],
    unique: true,
    lowercase: true,
  },
  prefix: {
    type: String,
    required: [true, 'Please enter a prefix'],
    lowercase: true,
  },
  device_type: {
    type: String,
    required: [true, 'Please enter a device_type'],
  },
  type_properties: {},
  status: {type: Number, default: 1},
});

const DeviceType = mongoose.model('Device_Type', deviceTypeSchema);

module.exports = DeviceType;