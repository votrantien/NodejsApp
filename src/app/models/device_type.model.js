const mongoose = require('mongoose');

const deviceTypeSchema = new mongoose.Schema({
  prefix: {
    type: String,
    required: [true, 'Please enter a prefix'],
    unique: true,
    uppercase: true,
  },
  device_type: {
    type: String,
    required: [true, 'Please enter a device_type'],
  },
  description: {
    type: String,
    required: [true, 'Please enter a description'],
  },
  amount_of_values: {type: Number, default: 1},
  uom_values: {},
  type_group: {type: String, unique: true},
  type_properties: {},
  status: {type: Number, default: 1},
});

const DeviceType = mongoose.model('Device_Type', deviceTypeSchema);

module.exports = DeviceType;