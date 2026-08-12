import { useEffect, useState, useCallback } from "react";
import api from "../../services/api";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Wallet,
  TrendingUp,
  Wrench,
  Download,
  Calendar,
  Users,
  Crown,
  AlertTriangle,
  RefreshCw,
  DollarSign,
  Activity,
  BarChart3,
} from "lucide-react";

const BLUE = "#0EA5E9";
const GREEN = "#10B981";

const fmtVND = (n) => (n || 0).toLocaleString("vi-VN") + "đ";
const toDDMM = (dateStr) => {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}`;
};

export default function AdminAnalytics() {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];

  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate] = useState(todayStr);
  const [activeTab, setActiveTab] = useState("overview");

  const [dashboard, setDashboard] = useState(null);
  const [dailyData, setDailyData] = useState(null);
  const [monthlyData, setMonthlyData] = useState(null);
  const [profitData, setProfitData] = useState(null);
  const [customerData, setCustomerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ========== LOAD ALL DATA ==========
  const loadAllData = useCallback(() => {
    setLoading(true);
    setError("");
    Promise.all([
      api.get("/analytics/dashboard"),
      api.get("/analytics/daily-revenue", { params: { startDate, endDate } }),
      api.get("/analytics/monthly-revenue"),
      api.get("/analytics/net-profit", { params: { startDate, endDate } }),
      api.get("/analytics/customer-insights"),
    ])
      .then(([dash, daily, monthly, profit, customers]) => {
        if (dash.data.success) setDashboard(dash.data.data);
        if (daily.data.success) setDailyData(daily.data.data);
        if (monthly.data.success) setMonthlyData(monthly.data.data);
        if (profit.data.success) setProfitData(profit.data.data);
        if (customers.data.success) setCustomerData(customers.data.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Analytics error:", err);
        setError("Không thể tải dữ liệu. Vui lòng thử lại.");
        setLoading(false);
      });
  }, [startDate, endDate]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // ========== EXPORT ==========
  const handleExport = (type) => {
    api
      .get("/analytics/export", {
        params: { startDate, endDate, type },
        responseType: "blob",
      })
      .then((res) => {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const a = document.createElement("a");
        a.href = url;
        a.download = `bao-cao-${type}-${startDate}_${endDate}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      })
      .catch(console.error);
  };

  // ========== CHART DATA ==========
  const dailyChart = (dailyData?.dailyData || []).map((d) => ({
    date: toDDMM(d.date),
    "Tiền sân": d.bookingRevenue || 0,
    "Dịch vụ": d.serviceRevenue || 0,
  }));

  const monthlyChart = (monthlyData?.dailyData || []).map((d) => ({
    date: toDDMM(d.date),
    "Tiền sân": d.bookingRevenue || 0,
    "Dịch vụ": d.serviceRevenue || 0,
  }));

  const pieData = monthlyData?.summary
    ? [
        { name: "Tiền sân", value: monthlyData.summary.bookingRevenue || 0 },
        { name: "Dịch vụ", value: monthlyData.summary.serviceRevenue || 0 },
      ]
    : [];

  // ========== TABS ==========
  const tabs = [
    { key: "overview", label: "Tổng quan", icon: <Activity size={16} /> },
    { key: "daily", label: "Doanh thu ngày", icon: <BarChart3 size={16} /> },
    {
      key: "monthly",
      label: "Doanh thu tháng",
      icon: <TrendingUp size={16} />,
    },
    { key: "profit", label: "Lợi nhuận", icon: <DollarSign size={16} /> },
    { key: "customers", label: "Khách hàng", icon: <Users size={16} /> },
  ];

  // ========== RENDER ==========
  return (
    <div className="admin-page-content">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Thống kê & Báo cáo</h1>
          <p className="admin-page-subtitle">
            Phân tích doanh thu và lợi nhuận
          </p>
        </div>
        <button
          className="admin-btn admin-btn--outline"
          onClick={() => handleExport("all")}
          style={{ display: "flex", alignItems: "center", gap: 6 }}
        >
          <Download size={16} /> Xuất báo cáo
        </button>
      </div>

      {/* Date Filter */}
      <div className="admin-filter-bar">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Calendar size={16} style={{ color: "#64748b" }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "#64748b" }}>
            Từ
          </span>
          <input
            type="date"
            className="admin-input"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{ width: 150 }}
          />
          <span style={{ fontSize: 13, fontWeight: 600, color: "#64748b" }}>
            đến
          </span>
          <input
            type="date"
            className="admin-input"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{ width: 150 }}
          />
        </div>
        <button className="admin-btn admin-btn--outline" onClick={loadAllData}>
          <RefreshCw size={14} /> Làm mới
        </button>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`admin-tab ${activeTab === t.key ? "admin-tab--active" : ""}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.icon} <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Loading / Error */}
      {loading && (
        <div className="admin-loading" style={{ padding: 60 }}>
          <div className="admin-loading-spinner"></div>
          <span>Đang tải dữ liệu...</span>
        </div>
      )}
      {error && !loading && (
        <div style={{ textAlign: "center", padding: 40 }}>
          <p style={{ color: "#EF4444", fontWeight: 600, marginBottom: 12 }}>
            {error}
          </p>
          <button
            className="admin-btn admin-btn--outline"
            onClick={loadAllData}
          >
            <RefreshCw size={14} /> Thử lại
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className="analytics-content">
          {/* ====== OVERVIEW ====== */}
          {activeTab === "overview" && (
            <>
              <div className="admin-stat-cards">
                <div className="admin-stat-card admin-stat-card--green">
                  <div className="admin-stat-card-icon">
                    <Wallet size={22} />
                  </div>
                  <div className="admin-stat-card-value">
                    {fmtVND(dashboard?.todayRevenue)}
                  </div>
                  <div className="admin-stat-card-label">Doanh thu hôm nay</div>
                </div>
                <div className="admin-stat-card admin-stat-card--blue">
                  <div className="admin-stat-card-icon">
                    <TrendingUp size={22} />
                  </div>
                  <div className="admin-stat-card-value">
                    {fmtVND(dashboard?.monthRevenue)}
                  </div>
                  <div className="admin-stat-card-label">
                    Doanh thu tháng này
                  </div>
                </div>
                <div className="admin-stat-card admin-stat-card--yellow">
                  <div className="admin-stat-card-icon">
                    <Wrench size={22} />
                  </div>
                  <div className="admin-stat-card-value">
                    {dashboard?.activeMaintenanceCount}
                  </div>
                  <div className="admin-stat-card-label">
                    Bảo trì đang xử lý
                  </div>
                </div>
              </div>

              <div className="analytics-charts-row">
                <div className="admin-card analytics-chart-card">
                  <h3 className="analytics-chart-title">
                    <TrendingUp size={18} /> Doanh thu theo ngày
                  </h3>
                  {dailyChart.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={dailyChart}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis
                          dataKey="date"
                          fontSize={12}
                          tick={{ fill: "#6B7280" }}
                        />
                        <YAxis fontSize={12} tick={{ fill: "#6B7280" }} />
                        <Tooltip
                          formatter={(v) => v.toLocaleString("vi-VN") + "đ"}
                          contentStyle={{
                            borderRadius: 12,
                            border: "none",
                            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                          }}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="Tiền sân"
                          stroke={BLUE}
                          strokeWidth={2}
                          dot={{ r: 3 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="Dịch vụ"
                          stroke={GREEN}
                          strokeWidth={2}
                          dot={{ r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p
                      style={{
                        textAlign: "center",
                        color: "#94a3b8",
                        padding: 40,
                      }}
                    >
                      Chưa có dữ liệu
                    </p>
                  )}
                </div>

                <div className="admin-card analytics-chart-card">
                  <h3 className="analytics-chart-title">
                    <BarChart3 size={18} /> Tỷ trọng doanh thu tháng
                  </h3>
                  {pieData.some((d) => d.value > 0) ? (
                    <>
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, value }) =>
                              `${name}: ${(value || 0).toLocaleString("vi-VN")}đ`
                            }
                          >
                            <Cell fill={BLUE} />
                            <Cell fill={GREEN} />
                          </Pie>
                          <Tooltip
                            formatter={(v) => v.toLocaleString("vi-VN") + "đ"}
                            contentStyle={{
                              borderRadius: 12,
                              border: "none",
                              boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{ textAlign: "center", marginTop: 8 }}>
                        <span style={{ fontWeight: 700, color: BLUE }}>
                          Sân: {monthlyData?.summary?.bookingRatio || 0}%
                        </span>
                        <span style={{ margin: "0 12px", color: "#6B7280" }}>
                          |
                        </span>
                        <span style={{ fontWeight: 700, color: GREEN }}>
                          Dịch vụ: {monthlyData?.summary?.serviceRatio || 0}%
                        </span>
                      </div>
                    </>
                  ) : (
                    <p
                      style={{
                        textAlign: "center",
                        color: "#94a3b8",
                        padding: 40,
                      }}
                    >
                      Chưa có dữ liệu
                    </p>
                  )}
                </div>
              </div>

              <div className="analytics-charts-row">
                <div className="admin-card analytics-chart-card">
                  <h3 className="analytics-chart-title">
                    <TrendingUp size={18} /> Doanh thu tháng{" "}
                    {monthlyData?.month}/{monthlyData?.year}
                  </h3>
                  {monthlyChart.length > 0 ? (
                    <>
                      {monthlyData?.momComparison && (
                        <div className="analytics-summary-mini">
                          <span>
                            Tổng:{" "}
                            <strong>
                              {fmtVND(monthlyData.summary?.totalRevenue)}
                            </strong>
                          </span>
                          <span
                            style={{
                              color:
                                monthlyData.momComparison.growthPercent >= 0
                                  ? "#10B981"
                                  : "#EF4444",
                              fontWeight: 700,
                            }}
                          >
                            {monthlyData.momComparison.growthPercent >= 0
                              ? "↑"
                              : "↓"}
                            {Math.abs(monthlyData.momComparison.growthPercent)}%
                            so với tháng trước
                          </span>
                        </div>
                      )}
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={monthlyChart}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#E5E7EB"
                          />
                          <XAxis
                            dataKey="date"
                            fontSize={12}
                            tick={{ fill: "#6B7280" }}
                          />
                          <YAxis fontSize={12} tick={{ fill: "#6B7280" }} />
                          <Tooltip
                            formatter={(v) => v.toLocaleString("vi-VN") + "đ"}
                            contentStyle={{
                              borderRadius: 12,
                              border: "none",
                              boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                            }}
                          />
                          <Legend />
                          <Bar
                            dataKey="Tiền sân"
                            fill={BLUE}
                            radius={[6, 6, 0, 0]}
                          />
                          <Bar
                            dataKey="Dịch vụ"
                            fill={GREEN}
                            radius={[6, 6, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </>
                  ) : (
                    <p
                      style={{
                        textAlign: "center",
                        color: "#94a3b8",
                        padding: 40,
                      }}
                    >
                      Chưa có dữ liệu
                    </p>
                  )}
                </div>

                <div className="admin-card analytics-chart-card">
                  <h3 className="analytics-chart-title">
                    <DollarSign size={18} /> Lợi nhuận ròng
                  </h3>
                  {profitData ? (
                    <div className="analytics-profit-summary">
                      <div className="analytics-profit-row">
                        <span>Doanh thu sân</span>
                        <span className="analytics-profit-value">
                          {fmtVND(profitData.revenue?.bookingRevenue)}
                        </span>
                      </div>
                      <div className="analytics-profit-row">
                        <span>Doanh thu dịch vụ</span>
                        <span className="analytics-profit-value">
                          {fmtVND(profitData.revenue?.serviceRevenue)}
                        </span>
                      </div>
                      <div className="analytics-profit-row analytics-profit-row--total">
                        <span>Tổng doanh thu</span>
                        <span className="analytics-profit-value">
                          {fmtVND(profitData.revenue?.totalRevenue)}
                        </span>
                      </div>
                      <div className="analytics-profit-divider" />
                      <div className="analytics-profit-row analytics-profit-row--cost">
                        <span>Chi phí bảo trì</span>
                        <span className="analytics-profit-value">
                          -{fmtVND(profitData.costs?.maintenanceCost)}
                        </span>
                      </div>
                      <div className="analytics-profit-divider" />
                      <div className="analytics-profit-row analytics-profit-row--net">
                        <span>Lợi nhuận ròng</span>
                        <span
                          className="analytics-profit-value"
                          style={{
                            color:
                              profitData.netProfit >= 0 ? "#10B981" : "#EF4444",
                            fontSize: 20,
                          }}
                        >
                          {fmtVND(profitData.netProfit)}
                        </span>
                      </div>
                      <div
                        style={{
                          textAlign: "center",
                          marginTop: 8,
                          padding: "8px 0",
                          borderRadius: 10,
                          background:
                            profitData.margin >= 0 ? "#ECFDF5" : "#FEF2F2",
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: 15,
                            color:
                              profitData.margin >= 0 ? "#10B981" : "#EF4444",
                          }}
                        >
                          Biên lợi nhuận: {profitData.margin}%
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p
                      style={{
                        textAlign: "center",
                        color: "#94a3b8",
                        padding: 40,
                      }}
                    >
                      Chưa có dữ liệu
                    </p>
                  )}
                </div>
              </div>

              {customerData?.topCustomers?.length > 0 && (
                <div className="admin-card" style={{ marginTop: 4 }}>
                  <h3 className="analytics-chart-title">
                    <Crown size={18} style={{ color: "#F59E0B" }} /> Top khách
                    hàng VIP
                  </h3>
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Khách hàng</th>
                          <th>Email</th>
                          <th>Số lần đặt</th>
                          <th>Tổng chi tiêu</th>
                          <th>Đặt lần cuối</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customerData.topCustomers.slice(0, 10).map((c) => (
                          <tr key={c.userId}>
                            <td className="admin-user-name">{c.name}</td>
                            <td className="admin-text-secondary">{c.email}</td>
                            <td className="admin-text-secondary">
                              {c.bookingCount}
                            </td>
                            <td style={{ fontWeight: 700, color: "#10B981" }}>
                              {fmtVND(c.totalSpent)}
                            </td>
                            <td className="admin-text-secondary">
                              {c.lastBooking}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {customerData?.expiringFixed?.length > 0 && (
                <div className="admin-card" style={{ marginTop: 16 }}>
                  <h3 className="analytics-chart-title">
                    <AlertTriangle size={18} style={{ color: "#F59E0B" }} /> Sắp
                    hết hạn (7 ngày)
                  </h3>
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Khách</th>
                          <th>Sân</th>
                          <th>Hết hạn</th>
                          <th>Còn</th>
                          <th>Đã chi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customerData.expiringFixed.map((c, i) => (
                          <tr key={i}>
                            <td className="admin-user-name">{c.name}</td>
                            <td className="admin-text-secondary">
                              {c.courtName || "—"}
                            </td>
                            <td className="admin-text-secondary">
                              {c.endDate}
                            </td>
                            <td>
                              <span
                                style={{
                                  padding: "2px 10px",
                                  borderRadius: 20,
                                  fontSize: 12,
                                  fontWeight: 700,
                                  background:
                                    c.daysUntilExpiry <= 3
                                      ? "#FEE2E2"
                                      : "#FEF3C7",
                                  color:
                                    c.daysUntilExpiry <= 3
                                      ? "#DC2626"
                                      : "#D97706",
                                }}
                              >
                                {c.daysUntilExpiry} ngày
                              </span>
                            </td>
                            <td style={{ fontWeight: 700 }}>
                              {fmtVND(c.totalSpent)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ====== DAILY ====== */}
          {activeTab === "daily" && (
            <div
              className="admin-card analytics-chart-card"
              style={{ maxWidth: "100%" }}
            >
              <h3 className="analytics-chart-title">
                <BarChart3 size={18} /> Doanh thu theo ngày ({startDate} →{" "}
                {endDate})
              </h3>
              {dailyChart.length > 0 ? (
                <>
                  <div className="analytics-summary-mini">
                    <span>
                      Tổng:{" "}
                      <strong>
                        {fmtVND(
                          (dailyData?.dailyData || []).reduce(
                            (s, d) =>
                              s +
                              (d.bookingRevenue || 0) +
                              (d.serviceRevenue || 0),
                            0,
                          ),
                        )}
                      </strong>
                    </span>
                    <span>
                      Sân:{" "}
                      <strong style={{ color: BLUE }}>
                        {fmtVND(
                          (dailyData?.dailyData || []).reduce(
                            (s, d) => s + (d.bookingRevenue || 0),
                            0,
                          ),
                        )}
                      </strong>
                    </span>
                    <span>
                      Dịch vụ:{" "}
                      <strong style={{ color: GREEN }}>
                        {fmtVND(
                          (dailyData?.dailyData || []).reduce(
                            (s, d) => s + (d.serviceRevenue || 0),
                            0,
                          ),
                        )}
                      </strong>
                    </span>
                  </div>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={dailyChart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis
                        dataKey="date"
                        fontSize={12}
                        tick={{ fill: "#6B7280" }}
                      />
                      <YAxis fontSize={12} tick={{ fill: "#6B7280" }} />
                      <Tooltip
                        formatter={(v) => v.toLocaleString("vi-VN") + "đ"}
                        contentStyle={{
                          borderRadius: 12,
                          border: "none",
                          boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                        }}
                      />
                      <Legend />
                      <Bar
                        dataKey="Tiền sân"
                        fill={BLUE}
                        radius={[6, 6, 0, 0]}
                      />
                      <Bar
                        dataKey="Dịch vụ"
                        fill={GREEN}
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </>
              ) : (
                <p
                  style={{ textAlign: "center", color: "#94a3b8", padding: 40 }}
                >
                  Chưa có dữ liệu
                </p>
              )}
              <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
                <button
                  className="admin-btn admin-btn--outline"
                  onClick={() => handleExport("bookings")}
                >
                  <Download size={14} /> Export sân
                </button>
                <button
                  className="admin-btn admin-btn--outline"
                  onClick={() => handleExport("services")}
                >
                  <Download size={14} /> Export dịch vụ
                </button>
              </div>
            </div>
          )}

          {/* ====== MONTHLY ====== */}
          {activeTab === "monthly" && (
            <div className="analytics-charts-row">
              <div className="admin-card analytics-chart-card">
                <h3 className="analytics-chart-title">
                  <TrendingUp size={18} /> Doanh thu tháng {monthlyData?.month}/
                  {monthlyData?.year}
                </h3>
                {monthlyData?.momComparison && (
                  <div className="analytics-summary-mini">
                    <span>
                      Tổng:{" "}
                      <strong>
                        {fmtVND(monthlyData.summary?.totalRevenue)}
                      </strong>
                    </span>
                    <span
                      style={{
                        color:
                          monthlyData.momComparison.growthPercent >= 0
                            ? "#10B981"
                            : "#EF4444",
                        fontWeight: 700,
                      }}
                    >
                      {monthlyData.momComparison.growthPercent >= 0 ? "↑" : "↓"}
                      {Math.abs(monthlyData.momComparison.growthPercent)}% so
                      với tháng trước
                    </span>
                  </div>
                )}
                {monthlyChart.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={monthlyChart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis
                        dataKey="date"
                        fontSize={12}
                        tick={{ fill: "#6B7280" }}
                      />
                      <YAxis fontSize={12} tick={{ fill: "#6B7280" }} />
                      <Tooltip
                        formatter={(v) => v.toLocaleString("vi-VN") + "đ"}
                        contentStyle={{
                          borderRadius: 12,
                          border: "none",
                          boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                        }}
                      />
                      <Legend />
                      <Bar
                        dataKey="Tiền sân"
                        fill={BLUE}
                        radius={[6, 6, 0, 0]}
                      />
                      <Bar
                        dataKey="Dịch vụ"
                        fill={GREEN}
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p
                    style={{
                      textAlign: "center",
                      color: "#94a3b8",
                      padding: 40,
                    }}
                  >
                    Chưa có dữ liệu
                  </p>
                )}
              </div>
              <div className="admin-card analytics-chart-card">
                <h3 className="analytics-chart-title">
                  <BarChart3 size={18} /> Tỷ trọng doanh thu
                </h3>
                {pieData.some((d) => d.value > 0) ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={110}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name}: ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        <Cell fill={BLUE} />
                        <Cell fill={GREEN} />
                      </Pie>
                      <Tooltip
                        formatter={(v) => v.toLocaleString("vi-VN") + "đ"}
                        contentStyle={{
                          borderRadius: 12,
                          border: "none",
                          boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p
                    style={{
                      textAlign: "center",
                      color: "#94a3b8",
                      padding: 40,
                    }}
                  >
                    Chưa có dữ liệu
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ====== PROFIT ====== */}
          {activeTab === "profit" && (
            <div
              className="admin-card"
              style={{ maxWidth: 600, margin: "0 auto" }}
            >
              <h3
                className="analytics-chart-title"
                style={{ justifyContent: "center" }}
              >
                <DollarSign size={20} /> Lợi nhuận ({startDate} → {endDate})
              </h3>
              {profitData ? (
                <div
                  className="analytics-profit-summary"
                  style={{ padding: 24 }}
                >
                  <div className="analytics-profit-row">
                    <span>💰 Doanh thu sân</span>
                    <span className="analytics-profit-value">
                      {fmtVND(profitData.revenue?.bookingRevenue)}
                    </span>
                  </div>
                  <div className="analytics-profit-row">
                    <span>🛒 Doanh thu dịch vụ</span>
                    <span className="analytics-profit-value">
                      {fmtVND(profitData.revenue?.serviceRevenue)}
                    </span>
                  </div>
                  <div className="analytics-profit-row analytics-profit-row--total">
                    <span>📊 Tổng doanh thu</span>
                    <span
                      className="analytics-profit-value"
                      style={{ fontSize: 18 }}
                    >
                      {fmtVND(profitData.revenue?.totalRevenue)}
                    </span>
                  </div>
                  <div className="analytics-profit-divider" />
                  <div className="analytics-profit-row analytics-profit-row--cost">
                    <span>🔧 Chi phí bảo trì</span>
                    <span
                      className="analytics-profit-value"
                      style={{ color: "#EF4444" }}
                    >
                      -{fmtVND(profitData.costs?.maintenanceCost)}
                    </span>
                  </div>
                  {profitData.depositAdjustment !== 0 && (
                    <div className="analytics-profit-row analytics-profit-row--cost">
                      <span>📋 Điều chỉnh cọc</span>
                      <span
                        className="analytics-profit-value"
                        style={{
                          color:
                            profitData.depositAdjustment >= 0
                              ? "#10B981"
                              : "#EF4444",
                        }}
                      >
                        {profitData.depositAdjustment >= 0 ? "+" : ""}
                        {fmtVND(profitData.depositAdjustment)}
                      </span>
                    </div>
                  )}
                  <div className="analytics-profit-divider" />
                  <div className="analytics-profit-row analytics-profit-row--net">
                    <span>💎 Lợi nhuận ròng</span>
                    <span
                      className="analytics-profit-value"
                      style={{
                        fontSize: 22,
                        color:
                          profitData.netProfit >= 0 ? "#10B981" : "#EF4444",
                      }}
                    >
                      {fmtVND(profitData.netProfit)}
                    </span>
                  </div>
                  <div
                    style={{
                      textAlign: "center",
                      marginTop: 16,
                      padding: "10px 0",
                      borderRadius: 10,
                      background:
                        profitData.margin >= 0 ? "#ECFDF5" : "#FEF2F2",
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: 16,
                        color: profitData.margin >= 0 ? "#10B981" : "#EF4444",
                      }}
                    >
                      Biên lợi nhuận: {profitData.margin}%
                    </span>
                  </div>
                </div>
              ) : (
                <p
                  style={{ textAlign: "center", color: "#94a3b8", padding: 40 }}
                >
                  Chưa có dữ liệu
                </p>
              )}
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  justifyContent: "center",
                  marginTop: 16,
                }}
              >
                <button
                  className="admin-btn admin-btn--outline"
                  onClick={() => handleExport("maintenance")}
                >
                  <Download size={14} /> Export bảo trì
                </button>
                <button
                  className="admin-btn admin-btn--outline"
                  onClick={() => handleExport("all")}
                >
                  <Download size={14} /> Export tất cả
                </button>
              </div>
            </div>
          )}

          {/* ====== CUSTOMERS ====== */}
          {activeTab === "customers" && (
            <>
              <div className="admin-card" style={{ marginBottom: 16 }}>
                <h3 className="analytics-chart-title">
                  <Crown size={18} style={{ color: "#F59E0B" }} /> Top khách
                  hàng VIP
                </h3>
                {customerData?.topCustomers?.length > 0 ? (
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Khách hàng</th>
                          <th>Email</th>
                          <th>Số lần đặt</th>
                          <th>Tổng chi tiêu</th>
                          <th>Đặt lần cuối</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customerData.topCustomers.map((c, i) => (
                          <tr key={c.userId}>
                            <td
                              style={{
                                fontWeight: 700,
                                color: i < 3 ? "#F59E0B" : "inherit",
                              }}
                            >
                              {i + 1}
                            </td>
                            <td className="admin-user-name">{c.name}</td>
                            <td className="admin-text-secondary">{c.email}</td>
                            <td className="admin-text-secondary">
                              {c.bookingCount}
                            </td>
                            <td style={{ fontWeight: 700, color: "#10B981" }}>
                              {fmtVND(c.totalSpent)}
                            </td>
                            <td className="admin-text-secondary">
                              {c.lastBooking}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p
                    style={{
                      textAlign: "center",
                      color: "#94a3b8",
                      padding: 40,
                    }}
                  >
                    Chưa có dữ liệu
                  </p>
                )}
              </div>

              <div className="admin-card">
                <h3 className="analytics-chart-title">
                  <AlertTriangle size={18} style={{ color: "#F59E0B" }} /> Sắp
                  hết hạn (7 ngày)
                </h3>
                {customerData?.expiringFixed?.length > 0 ? (
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Khách</th>
                          <th>Email</th>
                          <th>Sân</th>
                          <th>Hết hạn</th>
                          <th>Còn</th>
                          <th>Đã chi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customerData.expiringFixed.map((c, i) => (
                          <tr key={i}>
                            <td className="admin-user-name">{c.name}</td>
                            <td className="admin-text-secondary">{c.email}</td>
                            <td className="admin-text-secondary">
                              {c.courtName || "—"}
                            </td>
                            <td className="admin-text-secondary">
                              {c.endDate}
                            </td>
                            <td>
                              <span
                                style={{
                                  padding: "2px 10px",
                                  borderRadius: 20,
                                  fontSize: 12,
                                  fontWeight: 700,
                                  background:
                                    c.daysUntilExpiry <= 3
                                      ? "#FEE2E2"
                                      : "#FEF3C7",
                                  color:
                                    c.daysUntilExpiry <= 3
                                      ? "#DC2626"
                                      : "#D97706",
                                }}
                              >
                                {c.daysUntilExpiry} ngày
                              </span>
                            </td>
                            <td style={{ fontWeight: 700 }}>
                              {fmtVND(c.totalSpent)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p
                    style={{
                      textAlign: "center",
                      color: "#10B981",
                      padding: 40,
                    }}
                  >
                    ✅ Không có gói nào sắp hết hạn
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
