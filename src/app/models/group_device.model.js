const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const groupDeviceSchema = new mongoose.Schema({
  group_name: {
    type: String,
    required: [true, 'Xin nhập group_name'],
  },
  manage_user:{ type: String, required: [true, 'user quản lý không được bỏ trống']},
  access_user:[],
  status: {type: Number, default: 1},
});

const GroupDevice = mongoose.model('GroupDevice', groupDeviceSchema);

module.exports = GroupDevice;