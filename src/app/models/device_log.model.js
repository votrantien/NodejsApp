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
  { timestamps: true, toObject: { virtuals: true } }
);

deviceLogSchema.virtual('devices', {
  ref: 'Device', // The model to use
  localField: 'device_serial', // Find people where `localField`
  foreignField: 'sn_number', // is equal to `foreignField`
  // If `justOne` is true, 'members' will be a single doc as opposed to
  // an array. `justOne` is false by default.
  justOne: true,
  //options: { sort: { name: -1 }, limit: 5 } // Query options, see http://bit.ly/mongoose-query-options
});

const DeviceLog = mongoose.model('device_log', deviceLogSchema);

module.exports = DeviceLog;