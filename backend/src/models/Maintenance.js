const mongoose = require("mongoose");

const maintenanceSchema = new mongoose.Schema(
  {
    court: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Court",
      required: [true, "Vui lòng chọn sân cần bảo trì"],
    },

    // ============ THÔNG TIN PHIẾU BẢO TRÌ ============
    title: {
      type: String,
      required: [true, "Vui lòng nhập tiêu đề bảo trì"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },

    // ============ THỜI GIAN BẢO TRÌ ============
    // Ngày bắt đầu - kết thúc bảo trì (có thể nhiều ngày)
    startDate: {
      type: String,
      required: [true, "Vui lòng chọn ngày bắt đầu"],
    },
    endDate: {
      type: String,
      required: [true, "Vui lòng chọn ngày kết thúc"],
    },
    // Khung giờ bảo trì mỗi ngày (VD: 08:00 - 17:00)
    startTime: {
      type: String,
      default: "06:00",
    },
    endTime: {
      type: String,
      default: "22:00",
    },

    // ============ LOẠI BẢO TRÌ ============
    maintenanceType: {
      type: String,
      enum: ["scheduled", "emergency", "periodic"],
      default: "scheduled",
    },
    // scheduled: Bảo trì có kế hoạch (admin chủ động lên lịch)
    // emergency: Bảo trì khẩn cấp (ép sân vào trạng thái bảo trì ngay)
    // periodic: Bảo trì định kỳ (tự động phát sinh)

    // ============ TRẠNG THÁI PHIẾU ============
    status: {
      type: String,
      enum: ["pending", "in_progress", "completed", "cancelled"],
      default: "pending",
    },
    // pending: Chờ đến giờ bảo trì
    // in_progress: Đang bảo trì (sân đã đóng)
    // completed: Hoàn thành (sân hoạt động lại)
    // cancelled: Hủy phiếu

    // ============ CHI PHÍ ============
    cost: {
      type: Number,
      default: 0,
      min: 0,
    },
    costNote: {
      type: String,
      trim: true,
    },

    // ============ XỬ LÝ XUNG ĐỘT ============
    conflictResolution: {
      strategy: {
        type: String,
        enum: ["auto_relocate", "cancel_booking", "force_override"],
        default: "auto_relocate",
      },
      // auto_relocate: Tự động chuyển khách sang sân trống
      // cancel_booking: Hủy lịch khách, hoàn tiền
      // force_override: Ép bảo trì (chỉ dùng cho emergency)
      affectedBookings: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Booking",
        },
      ],
      relocatedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Court",
        default: null,
      },
      resolutionNote: String,
    },

    // ============ NGƯỜI TẠO / NGƯỜI PHỤ TRÁCH ============
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    assignedTo: {
      type: String,
      trim: true,
    },

    // ============ GHI CHÚ HOÀN THÀNH ============
    completionNote: {
      type: String,
      trim: true,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

// ============ INDEXES CHO TRUY VẤN TỐI ƯU ============
// Tìm phiếu bảo trì theo sân + trạng thái
maintenanceSchema.index({ court: 1, status: 1 });
// Tìm phiếu bảo trì đang active trong khoảng thời gian
maintenanceSchema.index({ startDate: 1, endDate: 1, status: 1 });
// Tìm theo loại bảo trì
maintenanceSchema.index({ maintenanceType: 1 });

module.exports = mongoose.model("Maintenance", maintenanceSchema);
