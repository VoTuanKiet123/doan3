const Booking = require("../models/Booking");
const ServiceOrder = require("../models/ServiceOrder");
const Maintenance = require("../models/Maintenance");
const Court = require("../models/Court");
const User = require("../models/User");

// ============================================================
// 1. DASHBOARD TỔNG QUAN (4 card chỉ số nhanh)
// ============================================================
exports.getDashboardOverview = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0];

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfMonthStr = startOfMonth.toISOString().split("T")[0];

    // Dùng $facet để chạy 2 thống kê booking trong 1 query
    const [result] = await Booking.aggregate([
      {
        $facet: {
          // --- Doanh thu hôm nay ---
          todayRevenue: [
            {
              $match: {
                status: "confirmed",
                date: todayStr,
              },
            },
            {
              $group: {
                _id: null,
                bookingRevenue: { $sum: "$totalPrice" },
                bookingCount: { $sum: 1 },
              },
            },
          ],

          // --- Doanh thu tháng này (tiền sân) ---
          monthBookingRevenue: [
            {
              $match: {
                status: "confirmed",
                date: { $gte: startOfMonthStr, $lte: todayStr },
              },
            },
            {
              $group: {
                _id: null,
                bookingRevenue: { $sum: "$totalPrice" },
                bookingCount: { $sum: 1 },
              },
            },
          ],
        },
      },
    ]);

    // --- Query Maintenance riêng (không nằm trong Booking aggregate) ---
    const activeMaintenanceCount = await Maintenance.countDocuments({
      status: { $in: ["pending", "in_progress"] },
    });

    // --- Query Court riêng ---
    const totalCourtsCount = await Court.countDocuments({
      status: { $ne: "inactive" },
    });

    // --- Doanh thu dịch vụ hôm nay ---
    const [todayService] = await ServiceOrder.aggregate([
      {
        $match: {
          status: "paid",
          createdAt: { $gte: today, $lte: new Date() },
        },
      },
      {
        $group: {
          _id: null,
          serviceRevenue: { $sum: "$subtotalAmount" },
          serviceCount: { $sum: 1 },
        },
      },
    ]);

    // --- Doanh thu dịch vụ tháng này ---
    const [monthService] = await ServiceOrder.aggregate([
      {
        $match: {
          status: "paid",
          createdAt: { $gte: startOfMonth, $lte: new Date() },
        },
      },
      {
        $group: {
          _id: null,
          serviceRevenue: { $sum: "$subtotalAmount" },
          serviceCount: { $sum: 1 },
        },
      },
    ]);

    const todayBookingRevenue = result.todayRevenue[0]?.bookingRevenue || 0;
    const todayServiceRevenue = todayService?.serviceRevenue || 0;
    const todayTotalRevenue = todayBookingRevenue + todayServiceRevenue;

    const monthBookingRevenue =
      result.monthBookingRevenue[0]?.bookingRevenue || 0;
    const monthServiceRevenue = monthService?.serviceRevenue || 0;
    const monthTotalRevenue = monthBookingRevenue + monthServiceRevenue;

    res.json({
      success: true,
      data: {
        todayRevenue: todayTotalRevenue,
        todayBookingCount: result.todayRevenue[0]?.bookingCount || 0,
        todayServiceCount: todayService?.serviceCount || 0,
        monthRevenue: monthTotalRevenue,
        monthBookingCount: result.monthBookingRevenue[0]?.bookingCount || 0,
        monthServiceCount: monthService?.serviceCount || 0,
        activeMaintenanceCount,
        totalCourts: totalCourtsCount,
      },
    });
  } catch (error) {
    console.error("Dashboard overview error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================
// 2. BÁO CÁO DOANH THU THEO NGÀY (Daily Revenue)
// ============================================================
exports.getDailyRevenue = async (req, res) => {
  try {
    const { date, startDate, endDate } = req.query;

    // Nếu có 1 ngày cụ thể
    if (date) {
      const targetDate = date; // "YYYY-MM-DD"

      // Dùng $facet để lấy cả breakdown theo khung giờ + theo hình thức thanh toán
      const [bookingResult] = await Booking.aggregate([
        { $match: { status: "confirmed", date: targetDate } },
        {
          $facet: {
            byTimeSlot: [
              {
                $group: {
                  _id: "$startTime",
                  revenue: { $sum: "$totalPrice" },
                  count: { $sum: 1 },
                },
              },
              { $sort: { _id: 1 } },
            ],
            total: [
              {
                $group: {
                  _id: null,
                  revenue: { $sum: "$totalPrice" },
                  count: { $sum: 1 },
                },
              },
            ],
          },
        },
      ]);

      const targetDayStart = new Date(targetDate + "T00:00:00.000Z");
      const targetDayEnd = new Date(targetDate + "T23:59:59.999Z");

      const [serviceResult] = await ServiceOrder.aggregate([
        {
          $match: {
            status: "paid",
            createdAt: { $gte: targetDayStart, $lte: targetDayEnd },
          },
        },
        {
          $facet: {
            byPaymentMethod: [
              {
                $group: {
                  _id: "$paymentMethod",
                  revenue: { $sum: "$subtotalAmount" },
                  count: { $sum: 1 },
                },
              },
            ],
            total: [
              {
                $group: {
                  _id: null,
                  revenue: { $sum: "$subtotalAmount" },
                  count: { $sum: 1 },
                },
              },
            ],
          },
        },
      ]);

      // Phân loại khung giờ: sáng (6-11h), chiều (12-17h), tối (18-22h)
      const timeSlotGroups = { morning: 0, afternoon: 0, evening: 0 };
      (bookingResult.byTimeSlot || []).forEach((slot) => {
        const hour = parseInt(slot._id?.split(":")[0] || 0);
        if (hour < 12) timeSlotGroups.morning += slot.revenue;
        else if (hour < 18) timeSlotGroups.afternoon += slot.revenue;
        else timeSlotGroups.evening += slot.revenue;
      });

      return res.json({
        success: true,
        data: {
          date: targetDate,
          bookingRevenue: bookingResult.total[0]?.revenue || 0,
          bookingCount: bookingResult.total[0]?.count || 0,
          serviceRevenue: serviceResult.total[0]?.revenue || 0,
          serviceCount: serviceResult.total[0]?.count || 0,
          totalRevenue:
            (bookingResult.total[0]?.revenue || 0) +
            (serviceResult.total[0]?.revenue || 0),
          timeSlotBreakdown: timeSlotGroups,
          paymentBreakdown: serviceResult.byPaymentMethod || [],
          bookingDetail: bookingResult.byTimeSlot || [],
        },
      });
    }

    // Khoảng ngày
    const sDate = startDate || new Date().toISOString().split("T")[0];
    const eDate = endDate || new Date().toISOString().split("T")[0];

    // Booking revenue theo ngày
    const bookingDaily = await Booking.aggregate([
      {
        $match: {
          status: "confirmed",
          date: { $gte: sDate, $lte: eDate },
        },
      },
      {
        $group: {
          _id: "$date",
          revenue: { $sum: "$totalPrice" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Service revenue theo ngày
    const sDateObj = new Date(sDate + "T00:00:00.000Z");
    const eDateObj = new Date(eDate + "T23:59:59.999Z");

    const serviceDaily = await ServiceOrder.aggregate([
      {
        $match: {
          status: "paid",
          createdAt: { $gte: sDateObj, $lte: eDateObj },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          revenue: { $sum: "$subtotalAmount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Merge 2 nguồn lại
    const dailyMap = {};
    bookingDaily.forEach((b) => {
      dailyMap[b._id] = {
        date: b._id,
        bookingRevenue: b.revenue,
        bookingCount: b.count,
        serviceRevenue: 0,
        serviceCount: 0,
      };
    });
    serviceDaily.forEach((s) => {
      if (!dailyMap[s._id]) {
        dailyMap[s._id] = {
          date: s._id,
          bookingRevenue: 0,
          bookingCount: 0,
          serviceRevenue: 0,
          serviceCount: 0,
        };
      }
      dailyMap[s._id].serviceRevenue = s.revenue;
      dailyMap[s._id].serviceCount = s.count;
    });

    const dailyData = Object.values(dailyMap).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
    const totalBookingRevenue = dailyData.reduce(
      (sum, d) => sum + d.bookingRevenue,
      0,
    );
    const totalServiceRevenue = dailyData.reduce(
      (sum, d) => sum + d.serviceRevenue,
      0,
    );

    res.json({
      success: true,
      data: {
        startDate: sDate,
        endDate: eDate,
        dailyData,
        summary: {
          totalRevenue: totalBookingRevenue + totalServiceRevenue,
          bookingRevenue: totalBookingRevenue,
          serviceRevenue: totalServiceRevenue,
          bookingCount: dailyData.reduce((s, d) => s + d.bookingCount, 0),
          serviceCount: dailyData.reduce((s, d) => s + d.serviceCount, 0),
        },
      },
    });
  } catch (error) {
    console.error("Daily revenue error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================
// 3. BÁO CÁO DOANH THU THEO THÁNG (Monthly Revenue)
// ============================================================
exports.getMonthlyRevenue = async (req, res) => {
  try {
    const { year, month } = req.query;
    const now = new Date();
    const targetYear = parseInt(year) || now.getFullYear();
    const targetMonth = parseInt(month) || now.getMonth() + 1;

    // Ngày đầu và cuối tháng mục tiêu
    const firstDay = `${targetYear}-${String(targetMonth).padStart(2, "0")}-01`;
    const lastDayNum = new Date(targetYear, targetMonth, 0).getDate();
    const lastDay = `${targetYear}-${String(targetMonth).padStart(2, "0")}-${String(lastDayNum).padStart(2, "0")}`;

    // Tháng trước để so sánh MoM
    const prevMonth = targetMonth === 1 ? 12 : targetMonth - 1;
    const prevYear = targetMonth === 1 ? targetYear - 1 : targetYear;
    const prevFirstDay = `${prevYear}-${String(prevMonth).padStart(2, "0")}-01`;
    const prevLastDayNum = new Date(prevYear, prevMonth, 0).getDate();
    const prevLastDay = `${prevYear}-${String(prevMonth).padStart(2, "0")}-${String(prevLastDayNum).padStart(2, "0")}`;

    // --- Tháng hiện tại ---
    const [currentResult] = await Booking.aggregate([
      {
        $match: {
          status: "confirmed",
          date: { $gte: firstDay, $lte: lastDay },
        },
      },
      {
        $facet: {
          byDay: [
            {
              $group: {
                _id: "$date",
                revenue: { $sum: "$totalPrice" },
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ],
          byWeek: [
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: "%U",
                    date: { $dateFromString: { dateString: "$date" } },
                  },
                },
                revenue: { $sum: "$totalPrice" },
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ],
          total: [
            {
              $group: {
                _id: null,
                revenue: { $sum: "$totalPrice" },
                count: { $sum: 1 },
              },
            },
          ],
        },
      },
    ]);

    const currentMonthStart = new Date(firstDay + "T00:00:00.000Z");
    const currentMonthEnd = new Date(lastDay + "T23:59:59.999Z");

    const [currentServiceResult] = await ServiceOrder.aggregate([
      {
        $match: {
          status: "paid",
          createdAt: { $gte: currentMonthStart, $lte: currentMonthEnd },
        },
      },
      {
        $facet: {
          byDay: [
            {
              $group: {
                _id: {
                  $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
                },
                revenue: { $sum: "$subtotalAmount" },
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ],
          total: [
            {
              $group: {
                _id: null,
                revenue: { $sum: "$subtotalAmount" },
                count: { $sum: 1 },
              },
            },
          ],
        },
      },
    ]);

    // --- Tháng trước ---
    const [prevResult] = await Booking.aggregate([
      {
        $match: {
          status: "confirmed",
          date: { $gte: prevFirstDay, $lte: prevLastDay },
        },
      },
      {
        $facet: {
          total: [
            {
              $group: {
                _id: null,
                revenue: { $sum: "$totalPrice" },
                count: { $sum: 1 },
              },
            },
          ],
        },
      },
    ]);

    const prevMonthStart = new Date(prevFirstDay + "T00:00:00.000Z");
    const prevMonthEnd = new Date(prevLastDay + "T23:59:59.999Z");

    const [prevServiceResult] = await ServiceOrder.aggregate([
      {
        $match: {
          status: "paid",
          createdAt: { $gte: prevMonthStart, $lte: prevMonthEnd },
        },
      },
      {
        $facet: {
          total: [
            {
              $group: {
                _id: null,
                revenue: { $sum: "$subtotalAmount" },
                count: { $sum: 1 },
              },
            },
          ],
        },
      },
    ]);

    // --- Merge booking + service theo ngày ---
    const dailyMap = {};
    (currentResult.byDay || []).forEach((d) => {
      dailyMap[d._id] = {
        date: d._id,
        bookingRevenue: d.revenue,
        bookingCount: d.count,
        serviceRevenue: 0,
        serviceCount: 0,
      };
    });
    (currentServiceResult.byDay || []).forEach((d) => {
      if (!dailyMap[d._id]) {
        dailyMap[d._id] = {
          date: d._id,
          bookingRevenue: 0,
          bookingCount: 0,
          serviceRevenue: 0,
          serviceCount: 0,
        };
      }
      dailyMap[d._id].serviceRevenue = d.revenue;
      dailyMap[d._id].serviceCount = d.count;
    });
    const dailyData = Object.values(dailyMap).sort((a, b) =>
      a.date.localeCompare(b.date),
    );

    // --- Tính toán MoM ---
    const currentBookingRevenue = currentResult.total[0]?.revenue || 0;
    const currentServiceRevenue = currentServiceResult.total[0]?.revenue || 0;
    const currentTotal = currentBookingRevenue + currentServiceRevenue;

    const prevBookingRevenue = prevResult.total[0]?.revenue || 0;
    const prevServiceRevenue = prevServiceResult.total[0]?.revenue || 0;
    const prevTotal = prevBookingRevenue + prevServiceRevenue;

    const momGrowth =
      prevTotal > 0
        ? Math.round(((currentTotal - prevTotal) / prevTotal) * 100)
        : 0;

    // --- Tỷ trọng doanh thu ---
    const bookingRatio =
      currentTotal > 0
        ? Math.round((currentBookingRevenue / currentTotal) * 100)
        : 0;
    const serviceRatio =
      currentTotal > 0
        ? Math.round((currentServiceRevenue / currentTotal) * 100)
        : 0;

    res.json({
      success: true,
      data: {
        year: targetYear,
        month: targetMonth,
        dailyData,
        summary: {
          totalRevenue: currentTotal,
          bookingRevenue: currentBookingRevenue,
          serviceRevenue: currentServiceRevenue,
          bookingCount: currentResult.total[0]?.count || 0,
          serviceCount: currentServiceResult.total[0]?.count || 0,
          bookingRatio,
          serviceRatio,
        },
        momComparison: {
          prevTotal,
          currentTotal,
          growthPercent: momGrowth,
        },
      },
    });
  } catch (error) {
    console.error("Monthly revenue error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================
// 4. BÁO CÁO CÔNG SUẤT SỬ DỤNG SÂN (Occupancy Rate)
// ============================================================
exports.getOccupancyRate = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const sDate = startDate || new Date().toISOString().split("T")[0];
    const eDate = endDate || new Date().toISOString().split("T")[0];

    // Lấy tất cả sân active
    const courts = await Court.find({ status: { $ne: "inactive" } });

    // Tổng số giờ mở cửa mỗi ngày: 6h-22h = 16h = 32 slot 30 phút
    const slotsPerDay = 32;

    // Lấy tất cả booking confirmed trong khoảng
    const bookings = await Booking.aggregate([
      { $match: { status: "confirmed", date: { $gte: sDate, $lte: eDate } } },
      {
        $group: { _id: { court: "$court", date: "$date" }, count: { $sum: 1 } },
      },
    ]);

    // Lấy tất cả maintenance trong khoảng để loại trừ
    const maintenances = await Maintenance.find({
      status: { $in: ["pending", "in_progress", "completed"] },
      $or: [{ startDate: { $lte: eDate }, endDate: { $gte: sDate } }],
    }).select("court startDate endDate");

    // Build map: courtId -> Set of dates bị bảo trì
    const maintenanceDateMap = {};
    maintenances.forEach((m) => {
      const courtId = m.court.toString();
      if (!maintenanceDateMap[courtId]) maintenanceDateMap[courtId] = new Set();
      const mStart = new Date(m.startDate);
      const mEnd = new Date(m.endDate);
      for (let d = new Date(mStart); d <= mEnd; d.setDate(d.getDate() + 1)) {
        maintenanceDateMap[courtId].add(d.toISOString().split("T")[0]);
      }
    });

    // Tạo date range
    const dateRange = [];
    const start = new Date(sDate);
    const end = new Date(eDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dateRange.push(new Date(d).toISOString().split("T")[0]);
    }

    // Build occupancy per court per day
    const courtOccupancy = courts.map((court) => {
      const courtIdStr = court._id.toString();
      const maintDates = maintenanceDateMap[courtIdStr] || new Set();

      let totalBookedSlots = 0;
      let totalAvailableSlots = 0;

      const dailyDetail = dateRange.map((date) => {
        const isMaintenance = maintDates.has(date);
        const dayBookings = bookings.find(
          (b) => b._id.court.toString() === courtIdStr && b._id.date === date,
        );
        const bookedSlots = dayBookings?.count || 0;
        const availableSlots = isMaintenance ? 0 : slotsPerDay;

        totalBookedSlots += bookedSlots;
        totalAvailableSlots += availableSlots;

        return {
          date,
          bookedSlots,
          availableSlots,
          isMaintenance,
          occupancyRate:
            availableSlots > 0
              ? Math.round((bookedSlots / availableSlots) * 100)
              : null,
        };
      });

      return {
        courtId: court._id,
        courtName: court.name,
        totalBookedSlots,
        totalAvailableSlots,
        occupancyRate:
          totalAvailableSlots > 0
            ? Math.round((totalBookedSlots / totalAvailableSlots) * 100)
            : 0,
        dailyDetail,
      };
    });

    // Tổng hợp chung
    const totalBookedAll = courtOccupancy.reduce(
      (s, c) => s + c.totalBookedSlots,
      0,
    );
    const totalAvailableAll = courtOccupancy.reduce(
      (s, c) => s + c.totalAvailableSlots,
      0,
    );

    res.json({
      success: true,
      data: {
        startDate: sDate,
        endDate: eDate,
        totalCourts: courts.length,
        overallOccupancyRate:
          totalAvailableAll > 0
            ? Math.round((totalBookedAll / totalAvailableAll) * 100)
            : 0,
        courtOccupancy,
      },
    });
  } catch (error) {
    console.error("Occupancy rate error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================
// 5. BÁO CÁO LỢI NHUẬN RÒNG (Net Profit)
// ============================================================
exports.getNetProfit = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const sDate = startDate || new Date().toISOString().split("T")[0];
    const eDate = endDate || new Date().toISOString().split("T")[0];

    // --- Tổng doanh thu sân ---
    const [bookingRevenue] = await Booking.aggregate([
      { $match: { status: "confirmed", date: { $gte: sDate, $lte: eDate } } },
      {
        $group: {
          _id: null,
          revenue: { $sum: "$totalPrice" },
          count: { $sum: 1 },
        },
      },
    ]);

    // --- Tổng doanh thu dịch vụ ---
    const sDateObj = new Date(sDate + "T00:00:00.000Z");
    const eDateObj = new Date(eDate + "T23:59:59.999Z");

    const [serviceRevenue] = await ServiceOrder.aggregate([
      {
        $match: {
          status: "paid",
          createdAt: { $gte: sDateObj, $lte: eDateObj },
        },
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: "$subtotalAmount" },
          deposit: { $sum: "$totalDeposit" },
          damageFee: { $sum: "$damageFeeTotal" },
          refund: { $sum: "$refundAmount" },
          count: { $sum: 1 },
        },
      },
    ]);

    // --- Chi phí bảo trì ---
    const [maintenanceCost] = await Maintenance.aggregate([
      {
        $match: {
          status: "completed",
          startDate: { $gte: sDate },
          endDate: { $lte: eDate },
        },
      },
      { $group: { _id: null, cost: { $sum: "$cost" }, count: { $sum: 1 } } },
    ]);

    const totalBookingRevenue = bookingRevenue?.revenue || 0;
    const totalServiceRevenue = serviceRevenue?.revenue || 0;
    const totalRevenue = totalBookingRevenue + totalServiceRevenue;

    const totalMaintenanceCost = maintenanceCost?.cost || 0;

    // Cọc thực tế bị trừ (do hư/mất) = damageFee - refund
    const actualDepositLoss =
      (serviceRevenue?.damageFee || 0) - (serviceRevenue?.refund || 0);

    const netProfit = totalRevenue - totalMaintenanceCost + actualDepositLoss;

    res.json({
      success: true,
      data: {
        startDate: sDate,
        endDate: eDate,
        revenue: {
          bookingRevenue: totalBookingRevenue,
          serviceRevenue: totalServiceRevenue,
          totalRevenue,
        },
        costs: {
          maintenanceCost: totalMaintenanceCost,
          maintenanceCount: maintenanceCost?.count || 0,
          // COGS có thể thêm sau khi Product có costPrice
        },
        depositAdjustment: actualDepositLoss,
        netProfit,
        margin:
          totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0,
      },
    });
  } catch (error) {
    console.error("Net profit error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================
// 6. BÁO CÁO KHÁCH HÀNG (Customer Insight)
// ============================================================
exports.getCustomerInsights = async (req, res) => {
  try {
    // --- Top khách hàng chi tiêu nhiều nhất (VIP) ---
    const topCustomers = await Booking.aggregate([
      { $match: { status: "confirmed" } },
      {
        $group: {
          _id: "$user",
          totalSpent: { $sum: "$totalPrice" },
          bookingCount: { $sum: 1 },
          lastBooking: { $max: "$date" },
          firstBooking: { $min: "$date" },
        },
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 20 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userInfo",
        },
      },
      { $unwind: "$userInfo" },
      {
        $project: {
          _id: 0,
          userId: "$_id",
          name: "$userInfo.name",
          email: "$userInfo.email",
          phone: "$userInfo.phone",
          totalSpent: 1,
          bookingCount: 1,
          lastBooking: 1,
          firstBooking: 1,
        },
      },
    ]);

    // --- Khách đặt cố định sắp hết hạn ---
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const warningDate = new Date(now);
    warningDate.setDate(warningDate.getDate() + 7);
    const warningDateStr = warningDate.toISOString().split("T")[0];

    const expiringFixed = await Booking.aggregate([
      {
        $match: {
          bookingType: "fixed_monthly",
          status: "confirmed",
          date: { $lte: warningDateStr, $gte: todayStr },
        },
      },
      { $sort: { date: 1 } },
      {
        $group: {
          _id: { user: "$user", batchId: "$batchId" },
          endDate: { $max: "$date" },
          startDate: { $min: "$date" },
          totalSpent: { $sum: "$totalPrice" },
          bookingCount: { $sum: 1 },
          court: { $first: "$court" },
        },
      },
      { $sort: { endDate: 1 } },
      {
        $lookup: {
          from: "users",
          localField: "_id.user",
          foreignField: "_id",
          as: "userInfo",
        },
      },
      { $unwind: "$userInfo" },
      {
        $lookup: {
          from: "courts",
          localField: "court",
          foreignField: "_id",
          as: "courtInfo",
        },
      },
      { $unwind: { path: "$courtInfo", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          userId: "$_id.user",
          batchId: "$_id.batchId",
          name: "$userInfo.name",
          email: "$userInfo.email",
          phone: "$userInfo.phone",
          startDate: 1,
          endDate: 1,
          totalSpent: 1,
          bookingCount: 1,
          courtName: "$courtInfo.name",
          daysUntilExpiry: {
            $ceil: {
              $divide: [
                {
                  $subtract: [
                    { $dateFromString: { dateString: "$endDate" } },
                    now,
                  ],
                },
                86400000,
              ],
            },
          },
        },
      },
    ]);

    // --- Tổng số khách đặt cố định đang active ---
    const activeFixedCount = await Booking.aggregate([
      {
        $match: {
          bookingType: "fixed_monthly",
          status: "confirmed",
          date: { $gte: todayStr },
        },
      },
      {
        $group: { _id: "$batchId" },
      },
      {
        $count: "count",
      },
    ]);

    res.json({
      success: true,
      data: {
        topCustomers,
        expiringFixed,
        activeFixedBatches: activeFixedCount[0]?.count || 0,
      },
    });
  } catch (error) {
    console.error("Customer insights error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================
// 7. EXPORT BÁO CÁO (Excel)
// ============================================================
exports.exportReport = async (req, res) => {
  try {
    const { startDate, endDate, type, courtId } = req.query;
    const sDate = startDate || new Date().toISOString().split("T")[0];
    const eDate = endDate || new Date().toISOString().split("T")[0];

    // Export Excel đơn giản dùng JSON (có thể nâng cấp lên thư viện ExcelJS sau)
    // Trả về CSV format để dễ dàng import vào Excel
    let csvData = "";
    let filename = "bao-cao";

    if (type === "bookings" || type === "all") {
      const filter = {
        status: "confirmed",
        date: { $gte: sDate, $lte: eDate },
      };
      if (courtId) filter.court = courtId;

      const bookings = await Booking.find(filter)
        .populate("user", "name email")
        .populate("court", "name")
        .sort({ date: 1, startTime: 1 });

      csvData += "=== DOANH THU SÂN ===\n";
      csvData += "Ngày,Giờ,Sân,Khách hàng,Loại đặt,Thành tiền,Trạng thái\n";
      bookings.forEach((b) => {
        csvData += `${b.date},${b.startTime}-${b.endTime},${b.court?.name || ""},${b.user?.name || ""},${b.bookingType},${b.totalPrice},${b.status}\n`;
      });
      csvData += "\n";
      filename += "-sân";
    }

    if (type === "services" || type === "all") {
      const sDateObj = new Date(sDate + "T00:00:00.000Z");
      const eDateObj = new Date(eDate + "T23:59:59.999Z");

      const orders = await ServiceOrder.find({
        status: "paid",
        createdAt: { $gte: sDateObj, $lte: eDateObj },
      })
        .populate("createdBy", "name")
        .sort({ createdAt: 1 });

      csvData += "=== DOANH THU DỊCH VỤ ===\n";
      csvData +=
        "Mã đơn,Ngày,Người tạo,Tiền hàng,Tiền cọc,Thanh toán,HTTT,Trạng thái\n";
      orders.forEach((o) => {
        const date = new Date(o.createdAt).toISOString().split("T")[0];
        csvData += `${o.orderNumber},${date},${o.createdBy?.name || ""},${o.subtotalAmount},${o.totalDeposit},${o.totalAmount},${o.paymentMethod || ""},${o.status}\n`;
      });
      csvData += "\n";
      filename += "-dịch-vụ";
    }

    if (type === "maintenance" || type === "all") {
      const maintenances = await Maintenance.find({
        status: "completed",
        startDate: { $gte: sDate },
        endDate: { $lte: eDate },
      })
        .populate("court", "name")
        .sort({ startDate: 1 });

      csvData += "=== CHI PHÍ BẢO TRÌ ===\n";
      csvData += "Sân,Tiêu đề,Từ ngày,Đến ngày,Chi phí,Loại,Trạng thái\n";
      maintenances.forEach((m) => {
        csvData += `${m.court?.name || ""},${m.title},${m.startDate},${m.endDate},${m.cost},${m.maintenanceType},${m.status}\n`;
      });
      filename += "-bảo-trì";
    }

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}-${sDate}_${eDate}.csv"`,
    );
    // Thêm BOM để Excel đọc UTF-8 đúng
    res.send("\uFEFF" + csvData);
  } catch (error) {
    console.error("Export error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
