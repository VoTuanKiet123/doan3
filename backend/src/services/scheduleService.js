/**
 * scheduleService.js
 * Dịch vụ xử lý logic đặt lịch cố định theo tháng:
 * - Sinh tự động danh sách ngày dựa trên thứ trong tuần
 * - Kiểm tra trùng lịch hàng loạt (bulk conflict check)
 */

const Booking = require("../models/Booking");

/**
 * Sinh mảng các ngày trong khoảng [startDate, endDate] trùng với các thứ được chọn.
 *
 * @param {String}  startDate  - "YYYY-MM-DD" (ngày bắt đầu)
 * @param {String}  endDate    - "YYYY-MM-DD" (ngày kết thúc)
 * @param {Number[]} daysOfWeek - Mảng thứ cần đặt: 0=CN, 1=T2, 2=T3, 3=T4, 4=T5, 5=T6, 6=T7
 * @param {String}  startTime  - "HH:mm" (giờ bắt đầu mỗi buổi)
 * @param {String}  endTime    - "HH:mm" (giờ kết thúc mỗi buổi)
 *
 * @returns {{ date: String, startTime: String, endTime: String }[]}
 *
 * Ví dụ:
 *   generateFixedScheduleDates("2026-07-01", "2026-07-31", [1, 3, 5], "17:00", "19:00")
 *   → Tất cả Thứ 2, Thứ 4, Thứ 6 trong tháng 7/2026, từ 17h-19h
 */
const generateFixedScheduleDates = (
  startDate,
  endDate,
  daysOfWeek,
  startTime,
  endTime,
) => {
  // Parse ngày dùng UTC noon để tránh lệch múi giờ
  const parseDate = (dateStr) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  };

  const formatDate = (date) => {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, "0");
    const d = String(date.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const start = parseDate(startDate);
  const end = parseDate(endDate);

  // Tạo Set để tra cứu O(1)
  const daySet = new Set(daysOfWeek);

  const results = [];
  const current = new Date(start);

  while (current <= end) {
    const dayOfWeek = current.getUTCDay(); // 0=CN, 1=T2, ..., 6=T7
    if (daySet.has(dayOfWeek)) {
      results.push({
        date: formatDate(current),
        startTime,
        endTime,
      });
    }
    // Tăng 1 ngày
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return results;
};

/**
 * Kiểm tra trùng lịch hàng loạt (Bulk Conflict Check).
 * Dùng 1 truy vấn MongoDB duy nhất thay vì vòng lặp nhiều findOne.
 *
 * @param {String}   courtId   - ObjectId của sân
 * @param {Object[]} slots     - Mảng { date, startTime, endTime } từ generateFixedScheduleDates()
 * @param {String}   excludeBatchId - (Optional) batchId cần loại trừ (khi cập nhật lịch)
 *
 * @returns {String[]} - Mảng các ngày bị trùng (rỗng = không trùng)
 */
const bulkCheckConflicts = async (courtId, slots, excludeBatchId = null) => {
  if (!slots || slots.length === 0) return [];

  // Xây dựng $or: mỗi slot là 1 điều kiện con kiểm tra giao thời gian
  const orConditions = slots.map(({ date, startTime, endTime }) => ({
    date,
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  }));

  const query = {
    court: courtId,
    status: { $ne: "cancelled" },
    $or: orConditions,
  };

  // Nếu có batchId cũ, loại trừ để không tự trùng với chính mình
  if (excludeBatchId) {
    query.batchId = { $ne: excludeBatchId };
  }

  const conflicts = await Booking.find(query)
    .select("date startTime endTime")
    .lean();

  // Trả về danh sách ngày bị trùng (unique)
  const conflictDates = [...new Set(conflicts.map((b) => b.date))];
  return conflictDates;
};

/**
 * Tính tổng số ngày sẽ được sinh ra (dùng để hiển thị preview trước khi đặt).
 *
 * @param {String}   startDate
 * @param {String}   endDate
 * @param {Number[]} daysOfWeek
 * @returns {Number}
 */
const countGeneratedDates = (startDate, endDate, daysOfWeek) => {
  return generateFixedScheduleDates(
    startDate,
    endDate,
    daysOfWeek,
    "00:00",
    "00:00",
  ).length;
};

module.exports = {
  generateFixedScheduleDates,
  bulkCheckConflicts,
  countGeneratedDates,
};
