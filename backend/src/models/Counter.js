const mongoose = require("mongoose");

// Bộ đếm sinh mã (dùng findOneAndUpdate $inc, KHÔNG dùng count + 1)
// Dùng chung cho mọi loại mã: maintenance (BT-...), sau này thêm racket_service (SV-...)
const counterSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
  },
  seq: {
    type: Number,
    default: 0,
  },
});

module.exports = mongoose.model("Counter", counterSchema);
