import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import {
  Activity,
  Calendar,
  Clock,
  FileText,
  Zap,
  Wrench,
  AlertTriangle,
  ShoppingBag,
  Plus,
  Minus,
  Coffee,
  Cookie,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const TIME_SLOTS = [
  "06:00",
  "06:30",
  "07:00",
  "07:30",
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
  "20:00",
  "20:30",
  "21:00",
  "21:30",
  "22:00",
];

const DAYS_OF_WEEK = [
  { value: 0, label: "CN" },
  { value: 1, label: "T2" },
  { value: 2, label: "T3" },
  { value: 3, label: "T4" },
  { value: 4, label: "T5" },
  { value: 5, label: "T6" },
  { value: 6, label: "T7" },
];

export default function BookingPage() {
  const { courtId } = useParams();
  const navigate = useNavigate();

  // ========== Chung ==========
  const [court, setCourt] = useState(null);
  const [bookingMode, setBookingMode] = useState("casual");
  const [loading, setLoading] = useState(false);

  // ========== Vãng lai ==========
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [note, setNote] = useState("");
  const [bookedSlots, setBookedSlots] = useState([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [priceBreakdown, setPriceBreakdown] = useState([]);
  const [hasSpecialPrice, setHasSpecialPrice] = useState(false);
  const [pricingLoading, setPricingLoading] = useState(false);

  // ========== Cố định theo tháng ==========
  const [fmStartDate, setFmStartDate] = useState("");
  const [fmEndDate, setFmEndDate] = useState("");
  const [fmDaysOfWeek, setFmDaysOfWeek] = useState([]);
  const [fmStartTime, setFmStartTime] = useState("");
  const [fmEndTime, setFmEndTime] = useState("");
  const [fmNote, setFmNote] = useState("");
  const [fmPreview, setFmPreview] = useState(null);
  const [fmPreviewLoading, setFmPreviewLoading] = useState(false);
  const [fmConflictDates, setFmConflictDates] = useState([]);

  // ========== Maintenance slots ==========
  const [maintenanceSlots, setMaintenanceSlots] = useState([]);
  const [courtStatus, setCourtStatus] = useState("active");

  // ========== Dịch vụ đi kèm ==========
  const [products, setProducts] = useState([]);
  const [serviceCart, setServiceCart] = useState([]);
  const [showServices, setShowServices] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);

  // ========== Load court ==========
  useEffect(() => {
    api
      .get(`/courts/${courtId}`)
      .then((res) => {
        setCourt(res.data.court);
        setCourtStatus(res.data.court.status);
      })
      .catch(() => {
        toast.error("Không tìm thấy sân");
        navigate("/courts");
      });
  }, [courtId, navigate]);

  // ========== Load danh sách sản phẩm/dịch vụ ==========
  useEffect(() => {
    setProductsLoading(true);
    api
      .get("/products")
      .then((res) => setProducts(res.data.data || []))
      .catch(() => {})
      .finally(() => setProductsLoading(false));
  }, []);

  // ========== Service cart helpers ==========
  const addToServiceCart = (product) => {
    if (product.stockQuantity <= 0) {
      toast.error(`${product.name} đã hết hàng!`);
      return;
    }
    setServiceCart((prev) => {
      const existing = prev.find((item) => item.product === product._id);
      if (existing) {
        if (existing.quantity >= product.stockQuantity) {
          toast.error(
            `Chỉ còn ${product.stockQuantity} ${product.unit} trong kho`,
          );
          return prev;
        }
        return prev.map((item) =>
          item.product === product._id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [
        ...prev,
        {
          product: product._id,
          productName: product.name,
          productCategory: product.category,
          quantity: 1,
          unitPrice: product.price,
          unit: product.unit,
          depositPerItem: product.depositAmount || 0,
          stockAvailable: product.stockQuantity,
        },
      ];
    });
  };

  const removeFromServiceCart = (productId) => {
    setServiceCart((prev) => prev.filter((item) => item.product !== productId));
  };

  const updateServiceQty = (productId, delta) => {
    setServiceCart((prev) =>
      prev.map((item) => {
        if (item.product !== productId) return item;
        const newQty = item.quantity + delta;
        if (newQty < 1) return item;
        if (newQty > item.stockAvailable) {
          toast.error(`Chỉ còn ${item.stockAvailable} ${item.unit} trong kho`);
          return item;
        }
        return { ...item, quantity: newQty };
      }),
    );
  };

  const serviceSubtotal = serviceCart.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );
  const serviceDeposit = serviceCart.reduce(
    (sum, item) => sum + item.depositPerItem * item.quantity,
    0,
  );
  const serviceTotal = serviceSubtotal + serviceDeposit;

  // Map danh mục -> icon & màu
  const CAT_META = {
    drink: {
      icon: <Coffee size={14} />,
      label: "Đồ uống",
      color: "bg-blue-50 text-blue-700 border-blue-200",
    },
    snack: {
      icon: <Cookie size={14} />,
      label: "Đồ ăn",
      color: "bg-orange-50 text-orange-700 border-orange-200",
    },
    consumable: {
      icon: <Zap size={14} />,
      label: "Vật tư",
      color: "bg-purple-50 text-purple-700 border-purple-200",
    },
    rental: {
      icon: <ShieldCheck size={14} />,
      label: "Thuê",
      color: "bg-amber-50 text-amber-700 border-amber-200",
    },
  };

  // ========== Load booked slots + maintenance slots (casual) ==========
  useEffect(() => {
    if (!date || bookingMode !== "casual") return;

    // Load bookings for the day
    api
      .get("/bookings")
      .then((res) => {
        const dayBookings = res.data.bookings.filter(
          (b) =>
            (b.court?._id === courtId || b.court === courtId) &&
            b.date === date &&
            b.status !== "cancelled",
        );
        setBookedSlots(
          dayBookings.map((b) => ({ start: b.startTime, end: b.endTime })),
        );
      })
      .catch(() => {});

    // Load active maintenance for this court
    api
      .get("/maintenance/active-courts")
      .then((res) => {
        const courtMaintenances = res.data.activeMaintenances.filter(
          (m) => m.court?._id === courtId || m.court === courtId,
        );
        // Kiểm tra xem ngày đang chọn có nằm trong khoảng bảo trì không
        const maintForDate = courtMaintenances.filter(
          (m) => m.startDate <= date && m.endDate >= date,
        );
        if (maintForDate.length > 0) {
          setMaintenanceSlots(
            maintForDate.map((m) => ({
              start: m.startTime,
              end: m.endTime,
              type: m.maintenanceType,
            })),
          );
        } else {
          setMaintenanceSlots([]);
        }
      })
      .catch(() => {});
  }, [date, courtId, bookingMode]);

  // ========== Tính giá casual ==========
  const getDuration = () => {
    if (!startTime || !endTime) return 0;
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    return (eh * 60 + em - (sh * 60 + sm)) / 60;
  };

  useEffect(() => {
    if (startTime && endTime && court && date && bookingMode === "casual") {
      const [sh, sm] = startTime.split(":").map(Number);
      const [eh, em] = endTime.split(":").map(Number);
      if (eh * 60 + em <= sh * 60 + sm) {
        setTotalPrice(0);
        setPriceBreakdown([]);
        setHasSpecialPrice(false);
        return;
      }
      setPricingLoading(true);
      api
        .post("/pricing/preview", { courtId, date, startTime, endTime })
        .then((res) => {
          if (res.data.success) {
            setTotalPrice(res.data.totalPrice);
            setPriceBreakdown(res.data.breakdown || []);
            setHasSpecialPrice(res.data.hasSpecialPrice || false);
          }
        })
        .catch(() => {
          const dur = getDuration();
          setTotalPrice(dur > 0 ? dur * court.pricePerHour : 0);
          setPriceBreakdown([]);
        })
        .finally(() => setPricingLoading(false));
    } else {
      setTotalPrice(0);
      setPriceBreakdown([]);
      setHasSpecialPrice(false);
    }
  }, [startTime, endTime, court, date, bookingMode]);

  // ========== Helper check booked (bao gồm cả maintenance slots) ==========
  const isHourBooked = (startH, endH) => {
    if (!startH || !endH) return false;
    const [ss, sM] = startH.split(":").map(Number);
    const [es, eM] = endH.split(":").map(Number);
    const sVal = ss * 60 + sM;
    const eVal = es * 60 + eM;

    // Kiểm tra booking thường
    const bookedByUser = bookedSlots.some((b) => {
      const [bs, bm] = b.start.split(":").map(Number);
      const [be, bem] = b.end.split(":").map(Number);
      return sVal < be * 60 + bem && eVal > bs * 60 + bm;
    });
    if (bookedByUser) return true;

    // Kiểm tra maintenance slots
    const blockedByMaintenance = maintenanceSlots.some((m) => {
      const [ms, mM] = m.start.split(":").map(Number);
      const [me, mE] = m.end.split(":").map(Number);
      return sVal < me * 60 + mE && eVal > ms * 60 + mM;
    });
    return blockedByMaintenance;
  };

  // Check if a specific slot is maintenance (to show Wrench icon)
  const isSlotMaintenance = (startH, endH) => {
    if (!startH || !endH) return false;
    const [ss, sM] = startH.split(":").map(Number);
    const [es, eM] = endH.split(":").map(Number);
    const sVal = ss * 60 + sM;
    const eVal = es * 60 + eM;
    return maintenanceSlots.some((m) => {
      const [ms, mM] = m.start.split(":").map(Number);
      const [me, mE] = m.end.split(":").map(Number);
      return sVal < me * 60 + mE && eVal > ms * 60 + mM;
    });
  };

  // ========== Toggle day of week ==========
  const toggleDay = (dayVal) => {
    setFmDaysOfWeek((prev) =>
      prev.includes(dayVal)
        ? prev.filter((d) => d !== dayVal)
        : [...prev, dayVal].sort(),
    );
    setFmPreview(null);
  };

  // ========== Preview fixed schedule ==========
  const handlePreview = async () => {
    if (
      !fmStartDate ||
      !fmEndDate ||
      fmDaysOfWeek.length === 0 ||
      !fmStartTime ||
      !fmEndTime
    ) {
      toast.error("Vui lòng điền đầy đủ: ngày, thứ, giờ");
      return;
    }
    if (fmStartDate >= fmEndDate) {
      toast.error("Ngày bắt đầu phải trước ngày kết thúc");
      return;
    }
    const [sh, sm] = fmStartTime.split(":").map(Number);
    const [eh, em] = fmEndTime.split(":").map(Number);
    if (eh * 60 + em <= sh * 60 + sm) {
      toast.error("Giờ kết thúc phải sau giờ bắt đầu");
      return;
    }

    setFmPreviewLoading(true);
    setFmPreview(null);
    try {
      const res = await api.post("/bookings/preview-fixed-schedule", {
        courtId,
        startDate: fmStartDate,
        endDate: fmEndDate,
        daysOfWeek: fmDaysOfWeek,
        startTime: fmStartTime,
        endTime: fmEndTime,
      });
      setFmPreview(res.data);
      setFmConflictDates(res.data.conflictDates || []);
      if (res.data.conflictDates?.length > 0) {
        toast.error(`Có ${res.data.conflictDates.length} ngày bị trùng lịch!`);
      } else {
        toast.success(`Có ${res.data.availableSlots} buổi khả dụng`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi preview");
    } finally {
      setFmPreviewLoading(false);
    }
  };

  // ========== Submit casual ==========
  const handleCasualSubmit = async (e) => {
    e.preventDefault();
    if (!date || !startTime || !endTime) {
      toast.error("Vui lòng điền đầy đủ thông tin");
      return;
    }
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    if (eh * 60 + em <= sh * 60 + sm) {
      toast.error("Giờ kết thúc phải sau giờ bắt đầu");
      return;
    }
    if (isHourBooked(startTime, endTime)) {
      toast.error("Khung giờ này đã được đặt trước.");
      return;
    }

    setLoading(true);
    try {
      const bookingRes = await api.post("/bookings", {
        courtId,
        date,
        startTime,
        endTime,
        note,
      });
      const bookingId = bookingRes.data.booking?._id || bookingRes.data._id;

      // Nếu có chọn dịch vụ → tạo đơn dịch vụ gắn với booking
      if (serviceCart.length > 0 && bookingId) {
        try {
          await api.post("/service-orders", {
            items: serviceCart.map((item) => ({
              product: item.product,
              quantity: item.quantity,
            })),
            bookingId,
            orderType: "booking",
            note: "Dịch vụ đi kèm đặt sân",
          });
        } catch (svcErr) {
          toast.error(
            "Đặt sân thành công nhưng thêm dịch vụ thất bại: " +
              (svcErr.response?.data?.message || "Lỗi"),
          );
        }
      }

      toast.success("Đặt sân thành công!");
      navigate("/my-bookings");
    } catch (err) {
      toast.error(err.response?.data?.message || "Đặt sân thất bại");
    } finally {
      setLoading(false);
    }
  };

  // ========== Submit fixed monthly ==========
  const handleFixedSubmit = async (e) => {
    e.preventDefault();
    if (
      !fmStartDate ||
      !fmEndDate ||
      fmDaysOfWeek.length === 0 ||
      !fmStartTime ||
      !fmEndTime
    ) {
      toast.error("Vui lòng điền đầy đủ thông tin");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/bookings/fixed-monthly", {
        courtId,
        startDate: fmStartDate,
        endDate: fmEndDate,
        daysOfWeek: fmDaysOfWeek,
        startTime: fmStartTime,
        endTime: fmEndTime,
        note: fmNote,
      });
      const batchId = res.data.batchId;

      // Nếu có chọn dịch vụ → tạo đơn dịch vụ gắn với batch
      if (serviceCart.length > 0 && batchId) {
        try {
          await api.post("/service-orders", {
            items: serviceCart.map((item) => ({
              product: item.product,
              quantity: item.quantity,
            })),
            bookingId: batchId,
            orderType: "booking",
            note: "Dịch vụ đi kèm đặt lịch cố định",
          });
        } catch (svcErr) {
          toast.error("Đặt lịch thành công nhưng thêm dịch vụ thất bại.");
        }
      }

      toast.success(res.data.message || "Đặt lịch cố định thành công!");
      navigate("/my-bookings");
    } catch (err) {
      toast.error(err.response?.data?.message || "Đặt lịch thất bại");
    } finally {
      setLoading(false);
    }
  };

  if (!court) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 mt-4 text-sm font-medium">
          Đang tải thông tin sân...
        </p>
      </div>
    );
  }

  const today = new Date().toISOString().split("T")[0];
  const availableEndSlots = TIME_SLOTS.filter((t) => {
    if (!startTime) return false;
    const [ss, sm] = startTime.split(":").map(Number);
    const [es, em] = t.split(":").map(Number);
    return es * 60 + em > ss * 60 + sm;
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 animate-fadeIn">
      {/* ========== TAB CHỌN HÌNH THỨC ĐẶT ========== */}
      <div className="flex gap-2 mb-6 bg-slate-100 p-1.5 rounded-2xl w-fit">
        <button
          onClick={() => {
            setBookingMode("casual");
            setFmPreview(null);
          }}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            bookingMode === "casual"
              ? "bg-white text-green-700 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          🏸 Đặt vãng lai
        </button>
        <button
          onClick={() => setBookingMode("fixed_monthly")}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            bookingMode === "fixed_monthly"
              ? "bg-white text-green-700 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          📅 Đặt cố định theo tháng
        </button>
      </div>

      {/* ========== MAINTENANCE WARNING ========== */}
      {courtStatus === "maintenance" && (
        <div
          style={{
            background: "linear-gradient(135deg, #fef3c7, #fffbeb)",
            border: "2px solid #f59e0b",
            borderRadius: 14,
            padding: "16px 20px",
            marginBottom: 24,
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <AlertTriangle
            size={24}
            style={{ color: "#d97706", flexShrink: 0, marginTop: 2 }}
          />
          <div>
            <div
              style={{
                fontWeight: 800,
                fontSize: 15,
                color: "#92400e",
                marginBottom: 4,
              }}
            >
              Sân đang trong thời gian bảo trì
            </div>
            <p
              style={{
                fontSize: 13,
                color: "#a16207",
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              Sân <strong>{court?.name}</strong> hiện không khả dụng do đang
              được bảo trì/sửa chữa. Vui lòng chọn sân khác hoặc quay lại sau.
            </p>
            {maintenanceSlots.length > 0 && (
              <div style={{ marginTop: 8, fontSize: 12, color: "#b45309" }}>
                ⏰ Khung giờ bảo trì: {maintenanceSlots[0].start} -{" "}
                {maintenanceSlots[0].end}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========== MAINTENANCE DATE WARNING ========== */}
      {courtStatus === "active" && maintenanceSlots.length > 0 && (
        <div
          style={{
            background: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: 12,
            padding: "12px 16px",
            marginBottom: 24,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Wrench size={18} style={{ color: "#f59e0b", flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#92400e" }}>
              Ngày {date} có lịch bảo trì: {maintenanceSlots[0].start} -{" "}
              {maintenanceSlots[0].end}
            </div>
            <p style={{ fontSize: 11, color: "#a16207", margin: "2px 0 0" }}>
              Các khung giờ bảo trì sẽ bị khóa, không thể đặt.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* ==================== LEFT: FORM ==================== */}
        <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-emerald-600 inline-flex">
              <Activity size={32} />
            </span>
            <span className="text-4xl">
              {bookingMode === "casual" ? "🏸" : "📅"}
            </span>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                {bookingMode === "casual"
                  ? `Đặt lịch: ${court.name}`
                  : `Đặt cố định: ${court.name}`}
              </h1>
              <p className="text-slate-400 text-xs mt-0.5">
                {court.pricePerHour?.toLocaleString("vi-VN")}đ / giờ
              </p>
            </div>
          </div>

          {/* ===== CASUAL FORM ===== */}
          {bookingMode === "casual" && (
            <form onSubmit={handleCasualSubmit} className="space-y-6">
              <div>
                <label className="form-label flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                  <Calendar size={15} /> Ngày đặt sân
                </label>
                <input
                  type="date"
                  required
                  min={today}
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setStartTime("");
                    setEndTime("");
                  }}
                  className="form-input text-slate-700 font-medium w-full mt-2 p-2.5 border rounded-xl"
                />
              </div>

              {date && (
                <div className="space-y-6 animate-fadeIn">
                  <div>
                    <label className="form-label flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                      <Clock size={15} /> Chọn giờ bắt đầu
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 mt-2">
                      {TIME_SLOTS.slice(0, -1).map((slot) => {
                        const nextHour =
                          TIME_SLOTS[TIME_SLOTS.indexOf(slot) + 1];
                        const booked = isHourBooked(slot, nextHour);
                        const isMaint = isSlotMaintenance(slot, nextHour);
                        const selected = startTime === slot;
                        return (
                          <button
                            key={slot}
                            type="button"
                            disabled={booked}
                            onClick={() => {
                              setStartTime(slot);
                              setEndTime("");
                            }}
                            className={`p-2 text-xs font-semibold border rounded-xl transition-all cursor-pointer ${
                              booked
                                ? isMaint
                                  ? "bg-amber-50 text-amber-500 cursor-not-allowed border-amber-200"
                                  : "bg-slate-100 text-slate-400 line-through cursor-not-allowed"
                                : selected
                                  ? "bg-green-600 text-white border-green-600"
                                  : "bg-white text-slate-700 hover:border-green-500"
                            }`}
                            title={
                              isMaint ? "Khung giờ bảo trì - không thể đặt" : ""
                            }
                          >
                            {isMaint ? (
                              <Wrench
                                size={10}
                                style={{ display: "inline", marginRight: 2 }}
                              />
                            ) : null}
                            {slot}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {startTime && (
                    <div className="animate-fadeIn">
                      <label className="form-label flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                        <Clock size={15} /> Chọn giờ kết thúc
                      </label>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 mt-2">
                        {availableEndSlots.map((slot) => {
                          const booked = isHourBooked(startTime, slot);
                          const isMaint = isSlotMaintenance(startTime, slot);
                          const selected = endTime === slot;
                          return (
                            <button
                              key={slot}
                              type="button"
                              disabled={booked}
                              onClick={() => setEndTime(slot)}
                              className={`p-2 text-xs font-semibold border rounded-xl transition-all cursor-pointer ${
                                booked
                                  ? isMaint
                                    ? "bg-amber-50 text-amber-500 cursor-not-allowed border-amber-200"
                                    : "bg-slate-100 text-slate-400 line-through cursor-not-allowed"
                                  : selected
                                    ? "bg-green-600 text-white border-green-600"
                                    : "bg-white text-slate-700 hover:border-green-500"
                              }`}
                              title={
                                isMaint
                                  ? "Khung giờ bảo trì - không thể đặt"
                                  : ""
                              }
                            >
                              {isMaint ? (
                                <Wrench
                                  size={10}
                                  style={{ display: "inline", marginRight: 2 }}
                                />
                              ) : null}
                              {slot}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ========== DỊCH VỤ THÊM (tùy chọn) ========== */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowServices(!showServices)}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <ShoppingBag size={18} className="text-green-600" />
                    <span className="font-bold text-sm text-slate-700">
                      🛒 Dịch vụ thêm (tùy chọn)
                    </span>
                    {serviceCart.length > 0 && (
                      <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">
                        {serviceCart.length} món
                      </span>
                    )}
                  </div>
                  {showServices ? (
                    <ChevronUp size={18} className="text-slate-400" />
                  ) : (
                    <ChevronDown size={18} className="text-slate-400" />
                  )}
                </button>

                {showServices && (
                  <div className="px-4 pb-4 border-t border-slate-100 animate-fadeIn">
                    {productsLoading ? (
                      <p className="text-xs text-slate-400 py-4 text-center">
                        Đang tải dịch vụ...
                      </p>
                    ) : products.length === 0 ? (
                      <p className="text-xs text-slate-400 py-4 text-center">
                        Chưa có dịch vụ nào
                      </p>
                    ) : (
                      <>
                        {/* Grid sản phẩm theo danh mục */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3 max-h-48 overflow-y-auto">
                          {products
                            .filter((p) => p.isActive)
                            .map((product) => {
                              const meta = CAT_META[product.category] || {};
                              const inCart = serviceCart.find(
                                (i) => i.product === product._id,
                              );
                              return (
                                <button
                                  key={product._id}
                                  type="button"
                                  disabled={product.stockQuantity <= 0}
                                  onClick={() => addToServiceCart(product)}
                                  className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                                    inCart
                                      ? "border-green-400 bg-green-50"
                                      : product.stockQuantity <= 0
                                        ? "border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed"
                                        : "border-slate-200 hover:border-green-300 hover:bg-green-50/50"
                                  }`}
                                >
                                  <span
                                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${meta.color || "bg-slate-50 text-slate-600 border-slate-200"}`}
                                  >
                                    {meta.icon} {meta.label}
                                  </span>
                                  <div className="mt-1 text-xs font-bold text-slate-700 leading-tight">
                                    {product.name}
                                  </div>
                                  <div className="text-xs font-extrabold text-green-600">
                                    {product.price.toLocaleString("vi-VN")}đ
                                    <span className="text-[10px] text-slate-400 font-medium">
                                      /{product.unit}
                                    </span>
                                  </div>
                                  {product.isRentable && (
                                    <div className="text-[10px] font-bold text-amber-600 mt-0.5">
                                      🏷️ Cọc:{" "}
                                      {product.depositAmount.toLocaleString(
                                        "vi-VN",
                                      )}
                                      đ
                                    </div>
                                  )}
                                  {product.stockQuantity <=
                                    product.lowStockThreshold &&
                                    product.stockQuantity > 0 && (
                                      <div className="text-[10px] text-orange-500 font-bold">
                                        ⚠️ Còn {product.stockQuantity}
                                      </div>
                                    )}
                                  {inCart && (
                                    <div className="text-[10px] font-bold text-green-700 mt-0.5">
                                      ✓ Đã thêm x{inCart.quantity}
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                        </div>

                        {/* Giỏ dịch vụ đã chọn */}
                        {serviceCart.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-100">
                            <div className="text-xs font-bold text-slate-500 mb-2">
                              ĐÃ CHỌN:
                            </div>
                            {serviceCart.map((item) => (
                              <div
                                key={item.product}
                                className="flex items-center gap-2 py-1.5 text-sm"
                              >
                                <span className="flex-1 font-semibold text-slate-700 text-xs">
                                  {item.productName}
                                </span>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateServiceQty(item.product, -1)
                                    }
                                    className="w-6 h-6 rounded border border-slate-200 flex items-center justify-center hover:bg-red-50 hover:border-red-300 cursor-pointer"
                                  >
                                    <Minus size={10} />
                                  </button>
                                  <span className="w-5 text-center font-bold text-xs">
                                    {item.quantity}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateServiceQty(item.product, 1)
                                    }
                                    className="w-6 h-6 rounded border border-slate-200 flex items-center justify-center hover:bg-green-50 hover:border-green-300 cursor-pointer"
                                  >
                                    <Plus size={10} />
                                  </button>
                                </div>
                                <span className="w-20 text-right font-bold text-xs text-green-600">
                                  {(
                                    item.unitPrice * item.quantity
                                  ).toLocaleString("vi-VN")}
                                  đ
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeFromServiceCart(item.product)
                                  }
                                  className="text-slate-300 hover:text-red-500 cursor-pointer ml-1"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                            <div className="flex justify-between text-xs font-bold pt-2 mt-2 border-t border-slate-100">
                              <span>Tổng dịch vụ:</span>
                              <span className="text-green-600">
                                {serviceSubtotal.toLocaleString("vi-VN")}đ
                              </span>
                            </div>
                            {serviceDeposit > 0 && (
                              <div className="flex justify-between text-xs font-bold text-amber-600">
                                <span>Tiền cọc:</span>
                                <span>
                                  {serviceDeposit.toLocaleString("vi-VN")}đ
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="form-label flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                  <FileText size={15} /> Ghi chú (tùy chọn)
                </label>
                <textarea
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="form-input resize-none w-full mt-2 p-2.5 border rounded-xl"
                  placeholder="Ví dụ: Cần mượn thêm vợt, mua nước lọc..."
                />
              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-50">
                <button
                  type="button"
                  onClick={() => navigate("/courts")}
                  className="border border-slate-200 hover:border-slate-300 flex-1 py-3 text-sm rounded-xl font-bold cursor-pointer"
                >
                  Quay lại
                </button>
                <button
                  type="submit"
                  disabled={
                    loading ||
                    !date ||
                    !startTime ||
                    !endTime ||
                    courtStatus === "maintenance"
                  }
                  className="bg-green-600 text-white hover:bg-green-700 flex-1 py-3 text-sm rounded-xl font-extrabold cursor-pointer disabled:opacity-50"
                  title={
                    courtStatus === "maintenance"
                      ? "Sân đang bảo trì, không thể đặt lịch"
                      : ""
                  }
                >
                  {courtStatus === "maintenance"
                    ? "Sân đang bảo trì"
                    : loading
                      ? "Đang tạo lịch..."
                      : "Xác nhận đặt"}
                </button>
              </div>
            </form>
          )}

          {/* ===== FIXED MONTHLY FORM ===== */}
          {bookingMode === "fixed_monthly" && (
            <form onSubmit={handleFixedSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                    <Calendar size={15} /> Ngày bắt đầu
                  </label>
                  <input
                    type="date"
                    required
                    min={today}
                    value={fmStartDate}
                    onChange={(e) => {
                      setFmStartDate(e.target.value);
                      setFmPreview(null);
                    }}
                    className="form-input text-slate-700 font-medium w-full mt-2 p-2.5 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="form-label flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                    <Calendar size={15} /> Ngày kết thúc
                  </label>
                  <input
                    type="date"
                    required
                    min={fmStartDate || today}
                    value={fmEndDate}
                    onChange={(e) => {
                      setFmEndDate(e.target.value);
                      setFmPreview(null);
                    }}
                    className="form-input text-slate-700 font-medium w-full mt-2 p-2.5 border rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="form-label flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                  📆 Chọn thứ trong tuần
                  {fmDaysOfWeek.length > 0 && (
                    <span className="text-xs text-green-600 font-normal ml-2">
                      ({fmDaysOfWeek.length} thứ đã chọn)
                    </span>
                  )}
                </label>
                <div className="flex gap-2 mt-2 flex-wrap">
                  =
                  {DAYS_OF_WEEK.map((d) => {
                    const active = fmDaysOfWeek.includes(d.value);
                    return (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => toggleDay(d.value)}
                        className={`w-12 h-12 rounded-xl text-sm font-bold transition-all cursor-pointer border-2 ${
                          active
                            ? "bg-green-600 text-white border-green-600 shadow-md"
                            : "bg-white text-slate-600 border-slate-200 hover:border-green-300"
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                    <Clock size={15} /> Giờ bắt đầu
                  </label>
                  <select
                    value={fmStartTime}
                    onChange={(e) => {
                      setFmStartTime(e.target.value);
                      setFmPreview(null);
                    }}
                    className="form-input text-slate-700 font-medium w-full mt-2 p-2.5 border rounded-xl"
                  >
                    <option value="">-- Chọn --</option>
                    {TIME_SLOTS.slice(0, -1).map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                    <Clock size={15} /> Giờ kết thúc
                  </label>
                  <select
                    value={fmEndTime}
                    onChange={(e) => {
                      setFmEndTime(e.target.value);
                      setFmPreview(null);
                    }}
                    className="form-input text-slate-700 font-medium w-full mt-2 p-2.5 border rounded-xl"
                  >
                    <option value="">-- Chọn --</option>
                    {fmStartTime
                      ? TIME_SLOTS.filter((t) => {
                          const [ss, sm] = fmStartTime.split(":").map(Number);
                          const [es, em] = t.split(":").map(Number);
                          return es * 60 + em > ss * 60 + sm;
                        }).map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))
                      : TIME_SLOTS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={handlePreview}
                disabled={fmPreviewLoading}
                className="w-full py-3 rounded-xl font-bold text-sm bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {fmPreviewLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></span>
                    Đang kiểm tra...
                  </>
                ) : (
                  <>🔍 Kiểm tra lịch trống</>
                )}
              </button>

              {fmPreview && (
                <div
                  className={`p-4 rounded-2xl border animate-fadeIn ${fmConflictDates.length > 0 ? "bg-amber-50 border-amber-200" : "bg-green-50 border-green-200"}`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">
                      {fmConflictDates.length > 0 ? "⚠️" : "✅"}
                    </span>
                    <span
                      className={`font-bold text-sm ${fmConflictDates.length > 0 ? "text-amber-700" : "text-green-700"}`}
                    >
                      {fmConflictDates.length > 0
                        ? `${fmConflictDates.length} ngày bị trùng lịch`
                        : `${fmPreview.availableSlots} buổi khả dụng — sẵn sàng đặt!`}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-white rounded-lg p-2">
                      <div className="font-bold text-slate-700">
                        {fmPreview.totalGenerated}
                      </div>
                      <div className="text-slate-400">Tổng sinh</div>
                    </div>
                    <div className="bg-white rounded-lg p-2">
                      <div className="font-bold text-green-600">
                        {fmPreview.availableSlots}
                      </div>
                      <div className="text-slate-400">Khả dụng</div>
                    </div>
                    <div className="bg-white rounded-lg p-2">
                      <div className="font-bold text-amber-600">
                        {fmPreview.conflictDates?.length || 0}
                      </div>
                      <div className="text-slate-400">Trùng lịch</div>
                    </div>
                  </div>
                </div>
              )}

              {/* ========== DỊCH VỤ THÊM (fixed monthly) ========== */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowServices(!showServices)}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <ShoppingBag size={18} className="text-green-600" />
                    <span className="font-bold text-sm text-slate-700">
                      🛒 Dịch vụ thêm (tùy chọn)
                    </span>
                    {serviceCart.length > 0 && (
                      <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">
                        {serviceCart.length} món
                      </span>
                    )}
                  </div>
                  {showServices ? (
                    <ChevronUp size={18} className="text-slate-400" />
                  ) : (
                    <ChevronDown size={18} className="text-slate-400" />
                  )}
                </button>

                {showServices && (
                  <div className="px-4 pb-4 border-t border-slate-100 animate-fadeIn">
                    {productsLoading ? (
                      <p className="text-xs text-slate-400 py-4 text-center">
                        Đang tải dịch vụ...
                      </p>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3 max-h-48 overflow-y-auto">
                          {products
                            .filter((p) => p.isActive)
                            .map((product) => {
                              const meta = CAT_META[product.category] || {};
                              const inCart = serviceCart.find(
                                (i) => i.product === product._id,
                              );
                              return (
                                <button
                                  key={product._id}
                                  type="button"
                                  disabled={product.stockQuantity <= 0}
                                  onClick={() => addToServiceCart(product)}
                                  className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                                    inCart
                                      ? "border-green-400 bg-green-50"
                                      : product.stockQuantity <= 0
                                        ? "border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed"
                                        : "border-slate-200 hover:border-green-300 hover:bg-green-50/50"
                                  }`}
                                >
                                  <span
                                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${meta.color || "bg-slate-50 text-slate-600 border-slate-200"}`}
                                  >
                                    {meta.icon} {meta.label}
                                  </span>
                                  <div className="mt-1 text-xs font-bold text-slate-700 leading-tight">
                                    {product.name}
                                  </div>
                                  <div className="text-xs font-extrabold text-green-600">
                                    {product.price.toLocaleString("vi-VN")}đ
                                    <span className="text-[10px] text-slate-400 font-medium">
                                      /{product.unit}
                                    </span>
                                  </div>
                                  {product.isRentable && (
                                    <div className="text-[10px] font-bold text-amber-600 mt-0.5">
                                      🏷️ Cọc:{" "}
                                      {product.depositAmount.toLocaleString(
                                        "vi-VN",
                                      )}
                                      đ
                                    </div>
                                  )}
                                  {inCart && (
                                    <div className="text-[10px] font-bold text-green-700 mt-0.5">
                                      ✓ Đã thêm x{inCart.quantity}
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                        </div>

                        {serviceCart.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-100">
                            <div className="text-xs font-bold text-slate-500 mb-2">
                              ĐÃ CHỌN:
                            </div>
                            {serviceCart.map((item) => (
                              <div
                                key={item.product}
                                className="flex items-center gap-2 py-1.5 text-sm"
                              >
                                <span className="flex-1 font-semibold text-slate-700 text-xs">
                                  {item.productName}
                                </span>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateServiceQty(item.product, -1)
                                    }
                                    className="w-6 h-6 rounded border border-slate-200 flex items-center justify-center hover:bg-red-50 hover:border-red-300 cursor-pointer"
                                  >
                                    <Minus size={10} />
                                  </button>
                                  <span className="w-5 text-center font-bold text-xs">
                                    {item.quantity}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateServiceQty(item.product, 1)
                                    }
                                    className="w-6 h-6 rounded border border-slate-200 flex items-center justify-center hover:bg-green-50 hover:border-green-300 cursor-pointer"
                                  >
                                    <Plus size={10} />
                                  </button>
                                </div>
                                <span className="w-20 text-right font-bold text-xs text-green-600">
                                  {(
                                    item.unitPrice * item.quantity
                                  ).toLocaleString("vi-VN")}
                                  đ
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeFromServiceCart(item.product)
                                  }
                                  className="text-slate-300 hover:text-red-500 cursor-pointer ml-1"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                            <div className="flex justify-between text-xs font-bold pt-2 mt-2 border-t border-slate-100">
                              <span>Tổng dịch vụ:</span>
                              <span className="text-green-600">
                                {serviceSubtotal.toLocaleString("vi-VN")}đ
                              </span>
                            </div>
                            {serviceDeposit > 0 && (
                              <div className="flex justify-between text-xs font-bold text-amber-600">
                                <span>Tiền cọc:</span>
                                <span>
                                  {serviceDeposit.toLocaleString("vi-VN")}đ
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="form-label flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                  <FileText size={15} /> Ghi chú (tùy chọn)
                </label>
                <textarea
                  rows={2}
                  value={fmNote}
                  onChange={(e) => setFmNote(e.target.value)}
                  className="form-input resize-none w-full mt-2 p-2.5 border rounded-xl"
                  placeholder="Ví dụ: Lịch tập cố định tháng 7..."
                />
              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-50">
                <button
                  type="button"
                  onClick={() => navigate("/courts")}
                  className="border border-slate-200 hover:border-slate-300 flex-1 py-3 text-sm rounded-xl font-bold cursor-pointer"
                >
                  Quay lại
                </button>
                <button
                  type="submit"
                  disabled={
                    loading ||
                    !fmPreview ||
                    fmConflictDates.length > 0 ||
                    courtStatus === "maintenance"
                  }
                  className="bg-green-600 text-white hover:bg-green-700 flex-1 py-3 text-sm rounded-xl font-extrabold cursor-pointer disabled:opacity-50"
                  title={
                    courtStatus === "maintenance"
                      ? "Sân đang bảo trì, không thể đặt lịch"
                      : ""
                  }
                >
                  {courtStatus === "maintenance"
                    ? "Sân đang bảo trì"
                    : loading
                      ? "Đang tạo lịch..."
                      : `Xác nhận đặt ${fmPreview?.availableSlots || 0} buổi`}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* ==================== RIGHT: SUMMARY PANEL ==================== */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
            <div className="flex items-center justify-between gap-2 mb-2">
              <h3 className="font-bold text-slate-800 text-base">
                {court.name}
              </h3>
              {(() => {
                const cType = court.type || (court.pricePerHour >= 70000 ? 'A' : (court.pricePerHour >= 50000 ? 'B' : 'C'));
                const label = cType === 'A' ? 'Sân A (VIP)' : cType === 'B' ? 'Sân B (Tiêu Chuẩn)' : 'Sân C (Tiết Kiệm)';
                const colorCls = cType === 'A' ? 'bg-amber-100 text-amber-800 border-amber-300' : cType === 'B' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-blue-100 text-blue-800 border-blue-300';
                return (
                  <span className={`text-xs font-extrabold px-2.5 py-1 rounded-full border ${colorCls}`}>
                    {label}
                  </span>
                );
              })()}
            </div>
            <p className="text-slate-500 text-xs leading-relaxed mb-4">
              {court.description || "Sân cầu lông tiêu chuẩn chất lượng cao."}
            </p>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
              <div className="text-xs font-bold text-slate-700 mb-1">Dịch vụ đi kèm theo loại sân:</div>
              {Array.isArray(court.services) && court.services.length > 0 ? (
                court.services.map((srv, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                    <span className="text-emerald-600 font-bold">✓</span> {srv}
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-500">Thảm thi đấu, chiếu sáng LED chống lóa, nước uống & quạt mát.</div>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-900 to-emerald-950 text-white rounded-3xl p-6 shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full filter blur-xl"></div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-emerald-300">
                Hóa Đơn Tạm Tính
              </h3>
              {hasSpecialPrice && (
                <span className="bg-amber-500/25 text-amber-300 text-[10px] font-extrabold px-2 py-0.5 border border-amber-500/40 rounded-lg inline-flex items-center gap-1">
                  <Zap size={10} /> GIỜ CAO ĐIỂM
                </span>
              )}
            </div>

            {pricingLoading ? (
              <div className="text-center py-5 text-emerald-200/60 text-sm">
                Đang tính giá...
              </div>
            ) : totalPrice > 0 ? (
              <div>
                <div className="flex flex-col gap-1.5 mb-3 text-sm text-emerald-200/80">
                  <div className="flex justify-between">
                    <span>Ngày:</span>
                    <span className="font-bold text-white">{date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Thời gian:</span>
                    <span className="font-bold text-white">
                      {startTime} - {endTime}
                    </span>
                  </div>
                </div>
                <div className="pt-3 border-t border-white/10 space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm text-emerald-300 font-medium">
                      Tiền sân:
                    </span>
                    <span className="font-bold text-white">
                      {totalPrice.toLocaleString("vi-VN")}đ
                    </span>
                  </div>

                  {/* Dịch vụ đi kèm */}
                  {serviceCart.length > 0 && (
                    <>
                      <div className="border-t border-white/5 pt-2 space-y-1">
                        {serviceCart.map((item) => (
                          <div
                            key={item.product}
                            className="flex justify-between text-xs text-emerald-200/70"
                          >
                            <span>
                              {item.productName} x{item.quantity}
                            </span>
                            <span>
                              {(item.unitPrice * item.quantity).toLocaleString(
                                "vi-VN",
                              )}
                              đ
                            </span>
                          </div>
                        ))}
                        {serviceDeposit > 0 && (
                          <div className="flex justify-between text-xs text-amber-300/80">
                            <span>Tiền cọc thiết bị</span>
                            <span>
                              {serviceDeposit.toLocaleString("vi-VN")}đ
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="pt-2 border-t border-white/10 flex justify-between items-baseline">
                        <span className="text-sm text-emerald-300 font-medium">
                          Tổng tiền:
                        </span>
                        <span className="text-2xl font-black text-amber-400">
                          {(
                            totalPrice +
                            serviceSubtotal +
                            serviceDeposit
                          ).toLocaleString("vi-VN")}
                          đ
                        </span>
                      </div>
                    </>
                  )}

                  {serviceCart.length === 0 && (
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm text-emerald-300 font-medium">
                        Tổng tiền:
                      </span>
                      <span className="text-2xl font-black text-amber-400">
                        {totalPrice.toLocaleString("vi-VN")}đ
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-xs text-emerald-300/60 py-2">
                Vui lòng chọn ngày và giờ để hiển thị hóa đơn.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
