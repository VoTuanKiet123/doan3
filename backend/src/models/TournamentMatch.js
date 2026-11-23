const mongoose = require("mongoose");

// Trận đấu theo sơ đồ loại trực tiếp: round 1 là vòng đầu, round cao nhất là chung kết.
// Người thắng trận (round r, position p) đi tiếp vào trận (r+1, floor(p/2)), ô A nếu p chẵn, ô B nếu p lẻ.
const setSchema = new mongoose.Schema(
  { a: { type: Number, min: 0, max: 99 }, b: { type: Number, min: 0, max: 99 } },
  { _id: false }
);

const matchSchema = new mongoose.Schema(
  {
    tournament: { type: mongoose.Schema.Types.ObjectId, ref: "Tournament", required: true },
    round: { type: Number, required: true, min: 1 },
    position: { type: Number, required: true, min: 0 },
    roundName: { type: String, default: "" },
    entryA: { type: mongoose.Schema.Types.ObjectId, ref: "TournamentRegistration", default: null },
    entryB: { type: mongoose.Schema.Types.ObjectId, ref: "TournamentRegistration", default: null },
    court: { type: mongoose.Schema.Types.ObjectId, ref: "Court", default: null },
    scheduledAt: Date,
    // scheduled: chờ đấu · playing: đang đấu · finished: xong · walkover: thắng do đối thủ vắng / miễn đấu
    status: { type: String, enum: ["scheduled", "playing", "finished", "walkover"], default: "scheduled" },
    sets: [setSchema],
    winner: { type: mongoose.Schema.Types.ObjectId, ref: "TournamentRegistration", default: null },
    isBye: { type: Boolean, default: false },
    inBracket: { type: Boolean, default: true }, // false: trận thêm tay (giao hữu, tranh hạng 3...) — không tự đẩy người thắng lên vòng sau
    note: { type: String, default: "" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

matchSchema.index({ tournament: 1, round: 1, position: 1 }, { unique: true });

module.exports = mongoose.model("TournamentMatch", matchSchema);
