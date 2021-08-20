const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const deviceSchema = new mongoose.Schema({
  sn_number: {
    type: String,
    required: [true, 'Xin nhập sn_number'],
    unique: true,
  },
  device_type: { type: Schema.Types.ObjectId, ref: 'Device_Type' },
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
  token: {
    type: String,
    required: [true, 'Xin nhập token'],
  },
  user_add_device: { type: Schema.Types.ObjectId, ref: 'User' },
  user_active_device: { type: Schema.Types.ObjectId, ref: 'User' },
  active_date: { type: Date },
  group: { type: Schema.Types.ObjectId, ref: 'GroupDevice', default: null },
  gateway: { type: String, default: 'none' },
  data: {},
  type_properties: {
    color: { type: String},
    icon: { type: String},
    environment: { type: String},
    display_name: { type: String},
    order_number: { type: Number}
  },
  description: { type: String, default: 'Mô tả thiết bị' },
  status: { type: Number, default: 0 },
},
  { timestamps: true }
);

const Device = mongoose.model('Device', deviceSchema);

module.exports = Device;