const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const deviceSchema = new mongoose.Schema({
  device_code: {
    type: String,
    required: [true, 'Xin nhập device_code'],
    unique: true,
    lowercase: true,
  },
  device_type:{ type: Schema.Types.ObjectId, ref: 'Device_Type' },
  device_name: {
    type: String,
    required: [true, 'Xin nhập device_name'],
  },
  device_model: {
    type: String,
    required: [true, 'Xin nhập device_model'],
  },
  sn_number: {
    type: String,
    required: [true, 'Xin nhập sn_number'],
    unique: true,
  },
  fw_number: {
    type: String,
    required: [true, 'Xin nhập fw_number'],
  },
  mfg: {
    type: String,
    required: [true, 'Xin nhập mfg'],
  },
  user_add_device:{ type: Schema.Types.ObjectId, ref: 'User' },
  user_active_device:{ type: Schema.Types.ObjectId, ref: 'User' },
  active_date: {type: Date},
  location:{
      type: String,
      default: null,
  },
  device_property: {},
  status: {type: Number, default: 1},
});

const Device = mongoose.model('Device', deviceSchema);

module.exports = Device;