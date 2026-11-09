const mongoose = require("mongoose");
const Counter = require("./Counter");

const maintenanceSchema = new mongoose.Schema(
  {
    court: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Court",
      required: [true, "Vui lòng chọn sân cần bảo trì"],
    },

    // ============ MÃ PHIẾU (tự sinh: BT-YYMMDD-NNN, tra cứu nhanh) ============
    ticketCode: {
      type: String,
      unique: true,
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
    // Thời gian thực tế (do changeTicketStatus ghi tự động)
    actualStart: {
      type: Date,
      default: null,
    },
    actualEnd: {
      type: Date,
      default: null,
    },
    // Sân đóng bao nhiêu phút (tính khi completed, chỉ nếu requiresClosure)
    downtimeMinutes: {
      type: Number,
      default: null,
    },

    // ============ LOẠI BẢO TRÌ ============
    maintenanceType: {
      type: String,
      enum: ["scheduled", "emergency", "periodic"],
      default: "scheduled",
    },
    // scheduled: Sửa chữa khi có lỗi/hỏng (tạo từ báo cáo hoặc admin chủ động)
    // emergency: Bảo trì khẩn cấp (ép sân vào trạng thái bảo trì ngay)
    // periodic: Bảo trì định kỳ (tự động phát sinh — làm sau)

    // ============ PHÂN LOẠI v2 ============
    category: {
      type: String,
      enum: [
        "floor",
        "lighting",
        "net_post",
        "line_marking",
        "ventilation",
        "roof_wall",
        "other",
      ],
      default: "other",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    // false = việc nhỏ (siết trụ, thay lưới) → KHÔNG chặn lịch đặt, không hiện gì cho khách
    requiresClosure: {
      type: Boolean,
      default: true,
    },

    // ============ TRẠNG THÁI PHIẾU ============
    // pending → in_progress → pending_acceptance → completed
    // in_progress ⇄ on_hold; pending_acceptance → in_progress (trả về làm lại)
    // completed / cancelled là trạng thái CUỐI (khóa)
    status: {
      type: String,
      enum: [
        "pending",
        "in_progress",
        "on_hold",
        "pending_acceptance",
        "completed",
        "cancelled",
      ],
      default: "pending",
    },

    // ============ CHI PHÍ ============
    // cost/costNote: field cũ (giữ cho UI/luồng cũ), phiếu mới nên dùng costContractor
    cost: {
      type: Number,
      default: 0,
      min: 0,
    },
    costNote: {
      type: String,
      trim: true,
    },
    // Chi phí tách theo nguồn (costLabor + costMaterial tính từ MaintenanceLog)
    costLabor: {
      type: Number,
      default: 0,
    },
    costMaterial: {
      type: Number,
      default: 0,
    },
    costContractor: {
      type: Number,
      default: 0,
    },
    costTotal: {
      type: Number,
      default: 0,
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

    // ============ NGƯỜI THỰC HIỆN (chỉ là thông tin, không phải role mới) ============
    executorType: {
      type: String,
      enum: ["in_house", "contractor"],
      default: "in_house",
    },
    // executorName lấy từ assignedTo (không thêm field trùng)
    contractor: {
      name: String,
      phone: String,
      invoiceNo: String,
    },
    // Nhà thầu sửa bảo hành → chi phí 0 nhưng vẫn ghi nhận để đánh giá
    isUnderWarranty: {
      type: Boolean,
      default: false,
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

    // ============ BẢO TRÌ NÂNG CAO (v2) ============
    // Tạo từ báo cáo kiểm tra của nhân viên POS (nếu có)
    inspection: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Inspection",
      default: null,
    },
    photosBefore: {
      type: [String],
      default: [],
    },
    attachments: {
      type: [String],
      default: [],
    },
    // Timeline trạng thái — chỉ changeTicketStatus được ghi vào đây
    statusHistory: [
      {
        status: {
          type: String,
          enum: [
            "pending",
            "in_progress",
            "on_hold",
            "pending_acceptance",
            "completed",
            "cancelled",
          ],
          required: true,
        },
        by: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          default: null,
        },
        at: {
          type: Date,
          default: Date.now,
        },
        note: {
          type: String,
          trim: true,
        },
      },
    ],

    // ============ XÓA MỀM ============
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

// ============ TỰ SINH MÃ PHIẾU ============
// Counter.$inc để không trùng khi race condition (KHÔNG dùng count + 1)
// Điều kiện !ticketCode covers cả document mới lẫn phiếu cũ chạy qua migrateMaintenanceV2
maintenanceSchema.pre("save", async function () {
  if (!this.ticketCode) {
    const counter = await Counter.findOneAndUpdate(
      { key: "maintenance" },
      { $inc: { seq: 1 } },
      { upsert: true, new: true },
    );
    const d = new Date();
    const ymd =
      String(d.getFullYear()).slice(2) +
      String(d.getMonth() + 1).padStart(2, "0") +
      String(d.getDate()).padStart(2, "0");
    this.ticketCode = `BT-${ymd}-${String(counter.seq).padStart(3, "0")}`;
  }
});

// ============ INDEXES CHO TRUY VẤN TỐI ƯU ============
// (ticketCode đã có unique index từ field definition)
// Danh sách/truy vấn phiếu theo sân + trạng thái + khung ngày (String date so sánh đúng thứ tự YYYY-MM-DD)
maintenanceSchema.index({ court: 1, status: 1, startDate: 1, endDate: 1 });
// Lọc theo độ ưu tiên + quét phiếu quá hạn (pending qua endDate)
maintenanceSchema.index({ status: 1, priority: -1, endDate: 1 });
// Tra phiếu tạo từ báo cáo kiểm tra
maintenanceSchema.index({ inspection: 1 });
// Danh sách mặc định (ẩn phiếu đã xóa mềm), mới nhất trước
maintenanceSchema.index({ isDeleted: 1, createdAt: -1 });

module.exports = mongoose.model("Maintenance", maintenanceSchema);
