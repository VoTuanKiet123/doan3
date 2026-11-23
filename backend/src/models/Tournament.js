const mongoose = require("mongoose");

// draft: chỉ admin thấy · open: đang nhận đăng ký · closed: hết hạn đăng ký
// ongoing: đang thi đấu · completed: đã kết thúc · cancelled: huỷ
const STATUSES = ["draft", "open", "closed", "ongoing", "completed", "cancelled"];

const resultSchema = new mongoose.Schema(
  {
    rank: { type: Number, required: true, min: 1 },
    registration: { type: mongoose.Schema.Types.ObjectId, ref: "TournamentRegistration", required: true },
    displayName: { type: String, default: "" },
    prize: { type: String, default: "" },
  },
  { _id: false }
);

const tournamentSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Vui lòng nhập tên giải đấu"], trim: true },
    eventType: { type: mongoose.Schema.Types.ObjectId, ref: "EventType", required: [true, "Vui lòng chọn loại giải"] },
    // copy từ EventType lúc tạo để đăng ký cũ không đổi nếu loại sự kiện bị sửa
    playType: { type: String, enum: ["single", "pair"], default: "single" },
    description: { type: String, default: "" },
    rules: { type: String, default: "" },
    prizes: { type: String, default: "" },
    location: { type: String, default: "BadmintonHub" },
    startDate: { type: Date, required: [true, "Vui lòng chọn ngày bắt đầu"] },
    endDate: { type: Date, required: [true, "Vui lòng chọn ngày kết thúc"] },
    registrationDeadline: { type: Date, required: [true, "Vui lòng chọn hạn đăng ký"] },
    entryFee: { type: Number, default: 0, min: 0 },
    maxParticipants: { type: Number, required: true, min: 2 }, // số suất (người hoặc cặp)
    status: { type: String, enum: STATUSES, default: "draft" },
    sponsors: [{ type: mongoose.Schema.Types.ObjectId, ref: "Sponsor" }],
    staff: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // nhân viên phụ trách
    results: [resultSchema],
    resultsPublished: { type: Boolean, default: false },
    resultsPublishedAt: Date,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

tournamentSchema.pre("validate", function (next) {
  if (this.startDate && this.endDate && this.endDate < this.startDate) {
    this.invalidate("endDate", "Ngày kết thúc phải sau ngày bắt đầu");
  }
  if (this.registrationDeadline && this.startDate && this.registrationDeadline > this.startDate) {
    this.invalidate("registrationDeadline", "Hạn đăng ký phải trước ngày thi đấu");
  }
  next();
});

tournamentSchema.index({ status: 1, startDate: 1 });
tournamentSchema.statics.STATUSES = STATUSES;

module.exports = mongoose.model("Tournament", tournamentSchema);
