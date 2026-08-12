const PricingRule = require('../models/PricingRule');

/**
 * Chuyển chuỗi "HH:mm" thành số phút kể từ 00:00
 * Ví dụ: "17:30" → 1050
 */
const timeToMinutes = (timeStr) => {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

/**
 * Chuyển số phút thành chuỗi "HH:mm"
 * Ví dụ: 1050 → "17:30"
 */
const minutesToTime = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/**
 * Lấy thứ trong tuần (0=CN, 1=T2, ..., 6=T7) từ chuỗi "YYYY-MM-DD"
 * Tính theo múi giờ Việt Nam để tránh lệch ngày
 */
const getDayOfWeek = (dateStr) => {
  // Dùng UTC ngọ để tránh lệch timezone khi parse YYYY-MM-DD
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return date.getUTCDay(); // 0=CN, 1=T2, ..., 6=T7
};

/**
 * Tìm rule phù hợp nhất cho một segment 30 phút
 * @param {Array} rules - danh sách PricingRule active
 * @param {Number} dayOfWeek - 0-6
 * @param {Number} segmentStartMinutes - phút bắt đầu của segment (ví dụ: 1020 = 17:00)
 * @returns {Object|null} - rule có priority cao nhất, hoặc null nếu không có
 */
const findApplicableRule = (rules, dayOfWeek, segmentStartMinutes) => {
  const segmentHour = Math.floor(segmentStartMinutes / 60);

  const matchingRules = rules.filter((rule) => {
    const dayMatches = rule.daysOfWeek.includes(dayOfWeek);
    // startHour <= segmentHour < endHour
    const hourMatches = rule.startHour <= segmentHour && segmentHour < rule.endHour;
    return dayMatches && hourMatches;
  });

  if (matchingRules.length === 0) return null;

  // Chọn rule có priority cao nhất (nếu bằng nhau, chọn rule được tạo sau)
  return matchingRules.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return new Date(b.createdAt) - new Date(a.createdAt);
  })[0];
};

/**
 * Thuật toán chính: Tính giá động theo segment 30 phút
 *
 * @param {Number} basePrice - Giá gốc của sân (pricePerHour)
 * @param {String} dateStr - "YYYY-MM-DD"
 * @param {String} startTime - "HH:mm"
 * @param {String} endTime - "HH:mm"
 * @param {Array} rules - Danh sách PricingRule active
 * @returns {{ totalPrice: Number, breakdown: Array, hasSpecialPrice: Boolean }}
 */
const calculateDynamicPrice = (basePrice, dateStr, startTime, endTime, rules) => {
  const dayOfWeek = getDayOfWeek(dateStr);
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  const SEGMENT_DURATION = 30; // phút
  const breakdown = [];
  let totalPrice = 0;
  let hasSpecialPrice = false;

  for (let current = startMinutes; current < endMinutes; current += SEGMENT_DURATION) {
    const segmentEnd = Math.min(current + SEGMENT_DURATION, endMinutes);
    const durationHours = (segmentEnd - current) / 60;

    const rule = findApplicableRule(rules, dayOfWeek, current);
    const multiplier = rule ? rule.priceMultiplier : 1.0;
    const rate = basePrice * multiplier;
    const price = rate * durationHours;

    if (rule) hasSpecialPrice = true;

    breakdown.push({
      timeSlot: `${minutesToTime(current)} - ${minutesToTime(segmentEnd)}`,
      rate: Math.round(rate),
      price: Math.round(price),
      multiplier,
      ruleName: rule ? rule.name : null,
      ruleType: rule ? rule.type : 'normal',
    });

    totalPrice += price;
  }

  return {
    totalPrice: Math.round(totalPrice),
    breakdown,
    hasSpecialPrice,
    dayOfWeek,
  };
};

/**
 * Lấy tất cả rule active từ DB và tính giá
 * Đây là hàm chính được gọi từ controller
 */
const getPriceForBooking = async (basePrice, dateStr, startTime, endTime) => {
  const activeRules = await PricingRule.find({ isActive: true });
  return calculateDynamicPrice(basePrice, dateStr, startTime, endTime, activeRules);
};

module.exports = { getPriceForBooking, calculateDynamicPrice, getDayOfWeek };
