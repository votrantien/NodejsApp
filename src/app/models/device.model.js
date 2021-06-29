const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const deviceSchema = new mongoose.Schema({
  sn_number: {
    type: String,
    required: [true, 'Xin nhập sn_number'],
    unique: true,
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
  fw_number: {
    type: String,
    required: [true, 'Xin nhập fw_number'],
  },
  hw_number: {
    type: String,
    required: [true, 'Xin nhập hw_number'],
  },
  mfg_date: {
    type: String,
    required: [true, 'Xin nhập mfg_date'],
  },
  country: {
    type: String,
    required: [true, 'Xin nhập mfg_date'],
  },
  user_add_device:{ type: Schema.Types.ObjectId, ref: 'User' },
  user_active_device:{ type: Schema.Types.ObjectId, ref: 'User' },
  active_date: {type: Date},
  group_device:{
      type: String,
      default: null,
  },
  device_property: {},
  status: {type: Number, default: 0},
});

const Device = mongoose.model('Device', deviceSchema);

module.exports = Device;