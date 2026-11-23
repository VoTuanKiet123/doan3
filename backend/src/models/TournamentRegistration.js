const mongoose = require("mongoose");
const Counter = require("./Counter");

// pending: chờ nhân viên kiểm tra · confirmed: đã xác nhận · rejected: bị từ chối · cancelled: khách huỷ
const STATUSES = ["pending", "confirmed", "rejected", "cancelled"];

const playerSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Vui lòng nhập họ tên vận động viên"], trim: true },
    phone: { type: String, required: [true, "Vui lòng nhập số điện thoại"], trim: true },
    email: { type: String, trim: true, default: "" },
    birthYear: { type: Number, min: 1930, max: 2025 },
  },
  { _id: false }
);

const registrationSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true },
    tournament: { type: mongoose.Schema.Types.ObjectId, ref: "Tournament", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    playType: { type: String, enum: ["single", "pair"], required: true },
    teamName: { type: String, trim: true, default: "" },
    player1: { type: playerSchema, required: true },
    player2: { type: playerSchema, default: null },
    displayName: { type: String, default: "" },
    note: { type: String, trim: true, default: "" },

    status: { type: String, enum: STATUSES, default: "pending" },
    rejectReason: { type: String, default: "" },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: Date,

    fee: { type: Number, default: 0 },
    paymentStatus: { type: String, enum: ["unpaid", "paid"], default: "unpaid" },
    paymentMethod: { type: String, enum: ["", "cash", "transfer"], default: "" },
    paidAt: Date,
    paymentConfirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    checkedIn: { type: Boolean, default: false },
    checkedInAt: Date,
    checkedInBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

registrationSchema.pre("validate", function (next) {
  if (this.playType === "pair" && (!this.player2 || !this.player2.name || !this.player2.phone)) {
    this.invalidate("player2", "Giải đánh đôi cần nhập đủ thông tin người chơi thứ hai");
  }
  if (this.playType === "single") this.player2 = null;
  const names = [this.player1?.name, this.player2?.name].filter(Boolean).join(" / ");
  this.displayName = this.teamName ? `${this.teamName} (${names})` : names;
  next();
});

registrationSchema.pre("save", async function (next) {
  if (this.code) return next();
  try {
    const now = new Date();
    const ymd = `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const c = await Counter.findOneAndUpdate(
      { key: "tournament_registration" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.code = `DK-${ymd}-${String(c.seq).padStart(3, "0")}`;
    next();
  } catch (e) {
    next(e);
  }
});

registrationSchema.index({ tournament: 1, status: 1 });
registrationSchema.index({ user: 1, createdAt: -1 });
registrationSchema.statics.STATUSES = STATUSES;

module.exports = mongoose.model("TournamentRegistration", registrationSchema);
