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
  CreditCard,
  Banknote,
  X,
  QrCode,
  Copy,
  Check,
  CheckCircle,
  RefreshCw,
} from "lucide-react";

// Thời gian hết hạn mặc định của mã VietQR (phút) nếu backend không trả về expiresAt
const DEFAULT_EXPIRE_MINUTES = 15;

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
  const [courtSuspended, setCourtSuspended] = useState(false);
  const courtBlocked = courtStatus === "maintenance" || courtSuspended;

  // ========== Dịch vụ đi kèm ==========
  const [products, setProducts] = useState([]);
  const [serviceCart, setServiceCart] = useState([]);
  const [showServices, setShowServices] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);

  // ========== VietQR + SePay Auto Payment + Countdown ==========
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingBooking, setPendingBooking] = useState(null);
  const [paymentStep, setPaymentStep] = useState("choose"); // "choose" | "vietqr" | "paid"
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [checkInCode, setCheckInCode] = useState("");
  const [qrLoading, setQrLoading] = useState(false);
  const [copiedField, setCopiedField] = useState("");
  const [qrExpiresAt, setQrExpiresAt] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

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

    api
      .get("/maintenance/active-courts")
      .then((res) => {
        const ids = (res.data.suspendedCourts || []).map(String);
        setCourtSuspended(ids.includes(String(courtId)));
        const courtMaintenances = res.data.activeMaintenances.filter(
          (m) => m.court?._id === courtId || m.court === courtId,
        );
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

  // ========== Helper check booked ==========
  const isHourBooked = (startH, endH) => {
    if (!startH || !endH) return false;
    const [ss, sM] = startH.split(":").map(Number);
    const [es, eM] = endH.split(":").map(Number);
    const sVal = ss * 60 + sM;
    const eVal = es * 60 + eM;

    const bookedByUser = bookedSlots.some((b) => {
      const [bs, bm] = b.start.split(":").map(Number);
      const [be, bem] = b.end.split(":").map(Number);
      return sVal < be * 60 + bem && eVal > bs * 60 + bm;
    });
    if (bookedByUser) return true;

    const blockedByMaintenance = maintenanceSlots.some((m) => {
      const [ms, mM] = m.start.split(":").map(Number);
      const [me, mE] = m.end.split(":").map(Number);
      return sVal < me * 60 + mE && eVal > ms * 60 + mM;
    });
    return blockedByMaintenance;
  };

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
    if (courtSuspended) {
      toast.error(
        "Sân đang tạm ngưng nhận khách (báo cáo sự cố, chờ quản lý xử lý).",
      );
      return;
    }
    if (courtStatus === "maintenance") {
      toast.error("Sân đang trong thời gian bảo trì, không thể đặt lịch.");
      return;
    }
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
      setPendingBooking({
        bookingId,
        totalPrice: bookingRes.data.booking?.totalPrice || totalPrice,
        expiresAt: bookingRes.data.booking?.expiresAt || null,
        courtName: court?.name,
        date,
        startTime,
        endTime,
      });
      setPaymentStep("choose");
      setPaymentInfo(null);
      setQrExpiresAt(null);
      setSecondsLeft(0);
      setShowPaymentModal(true);
    } catch (err) {
      toast.error(err.response?.data?.message || "Đặt sân thất bại");
    } finally {
      setLoading(false);
    }
  };

  // ========== VietQR + SePay + Countdown handlers ==========
  const copyText = (text, key) => {
    navigator.clipboard.writeText(String(text));
    setCopiedField(key);
    toast.success("Đã sao chép");
    setTimeout(() => setCopiedField(""), 1800);
  };

  const formatCountdown = (sec) => {
    const m = String(Math.floor(sec / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleOpenVietQR = async () => {
    if (!pendingBooking?.bookingId) return;
    setQrLoading(true);
    setPaymentStep("vietqr");
    try {
      const res = await api.get(`/bookings/${pendingBooking.bookingId}/payment`);
      setPaymentInfo(res.data.paymentInfo);
      setCheckInCode(
        res.data.checkInCode ||
          `BHUB-${String(pendingBooking.bookingId).slice(-6).toUpperCase()}`,
      );

      const rawExp = res.data.expiresAt || pendingBooking.expiresAt;
      const expTime = rawExp
        ? new Date(rawExp).getTime()
        : Date.now() + DEFAULT_EXPIRE_MINUTES * 60 * 1000;
      setQrExpiresAt(expTime);
      setSecondsLeft(Math.max(0, Math.floor((expTime - Date.now()) / 1000)));

      if (
        res.data.status === "confirmed" ||
        res.data.paymentStatus === "paid"
      ) {
        setPaymentStep("paid");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Không tạo được mã VietQR");
      setPaymentStep("choose");
    } finally {
      setQrLoading(false);
    }
  };

  // Đếm ngược từng giây cho mã VietQR
  useEffect(() => {
    if (!showPaymentModal || paymentStep !== "vietqr" || !qrExpiresAt) return;
    const countdown = setInterval(() => {
      const diff = Math.max(0, Math.floor((qrExpiresAt - Date.now()) / 1000));
      setSecondsLeft(diff);
      if (diff <= 0) clearInterval(countdown);
    }, 1000);
    return () => clearInterval(countdown);
  }, [showPaymentModal, paymentStep, qrExpiresAt]);

  // Tự động kiểm tra mỗi 3 giây xem SePay Webhook đã xác nhận tiền vào chưa (dừng khi hết hạn)
  useEffect(() => {
    if (
      !showPaymentModal ||
      paymentStep !== "vietqr" ||
      !pendingBooking?.bookingId ||
      (qrExpiresAt && secondsLeft <= 0)
    ) {
      return;
    }
    const timer = setInterval(async () => {
      try {
        const res = await api.get(
          `/bookings/${pendingBooking.bookingId}/payment`,
        );
        if (
          res.data.status === "confirmed" ||
          res.data.paymentStatus === "paid"
        ) {
          setCheckInCode(
            res.data.checkInCode ||
              `BHUB-${String(pendingBooking.bookingId).slice(-6).toUpperCase()}`,
          );
          setPaymentStep("paid");
          toast.success(
            "Đã nhận tiền chuyển khoản! Vé QR Check-in đã sẵn sàng.",
          );
        } else if (res.data.status === "cancelled") {
          setSecondsLeft(0);
          toast.error("Đơn đặt sân đã hết hạn giữ chỗ và tự động hủy.");
        }
      } catch {
        // Bỏ qua lỗi mạng tạm thời khi polling
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [showPaymentModal, paymentStep, pendingBooking, qrExpiresAt, secondsLeft]);

  const handleSkipPayment = () => {
    setShowPaymentModal(false);
    setPendingBooking(null);
    setPaymentStep("choose");
    setPaymentInfo(null);
    setQrExpiresAt(null);
    setSecondsLeft(0);
    navigate("/my-bookings");
  };

  // ========== Submit fixed monthly ==========
  const handleFixedSubmit = async (e) => {
    e.preventDefault();
    if (courtSuspended) {
      toast.error(
        "Sân đang tạm ngưng nhận khách (báo cáo sự cố, chờ quản lý xử lý).",
      );
      return;
    }
    if (courtStatus === "maintenance") {
      toast.error("Sân đang trong thời gian bảo trì, không thể đặt lịch.");
      return;
    }
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
        } catch {
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
    <div className="max-w-6xl mx-auto px-4 py-6 md:px-6 lg:px-8 animate-fadeIn">
      <div className="mb-6 rounded-[26px] bg-gradient-to-r from-emerald-600 via-green-500 to-emerald-500 px-5 py-4 shadow-[0_18px_36px_rgba(16,185,129,0.22)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3 text-white">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
              <Activity size={20} />
            </div>
            <div>
              <div className="text-xl font-extrabold leading-none">Đặt lịch</div>
              <div className="text-xs text-emerald-50/90 mt-1">
                Chọn hình thức đặt sân phù hợp
              </div>
            </div>
          </div>

          <div className="flex gap-2 bg-white/10 p-1.5 rounded-2xl backdrop-blur-sm">
            <button
              onClick={() => {
                setBookingMode("casual");
                setFmPreview(null);
              }}
              className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                bookingMode === "casual"
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-white/80 hover:text-white"
              }`}
            >
              🏸 Đặt vãng lai
            </button>
            <button
              onClick={() => setBookingMode("fixed_monthly")}
              className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                bookingMode === "fixed_monthly"
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-white/80 hover:text-white"
              }`}
            >
              📅 Đặt cố định theo tháng
            </button>
          </div>
        </div>
      </div>

      {/* ========== MAINTENANCE WARNING ========== */}
      {courtBlocked && (
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
              {courtSuspended
                ? "Sân đang tạm ngưng nhận khách"
                : "Sân đang trong thời gian bảo trì"}
            </div>
            <p
              style={{
                fontSize: 13,
                color: "#a16207",
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              {courtSuspended ? (
                <>
                  Sân <strong>{court?.name}</strong> có báo cáo sự cố nghiêm
                  trọng và đang chờ quản lý xử lý. Vui lòng chọn sân khác.
                </>
              ) : (
                <>
                  Sân <strong>{court?.name}</strong> hiện không khả dụng do đang
                  được bảo trì/sửa chữa. Vui lòng chọn sân khác hoặc quay lại
                  sau.
                </>
              )}
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
      {courtStatus === "active" &&
        !courtSuspended &&
        maintenanceSlots.length > 0 && (
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

      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_0.9fr] gap-6 xl:gap-8">
        <div className="bg-white rounded-[28px] border border-slate-200 shadow-[0_12px_28px_rgba(15,23,42,0.06)] overflow-hidden">
          <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-5 md:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-sm">
                <Activity size={24} />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl md:text-[2rem] font-extrabold tracking-[-0.03em] text-slate-800 leading-none">
                  {bookingMode === "casual"
                    ? `Đặt lịch: ${court.name}`
                    : `Đặt cố định: ${court.name}`}
                </h1>
                <p className="text-slate-500 text-sm mt-2">
                  {court.pricePerHour?.toLocaleString("vi-VN")}đ / giờ
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 md:p-8">
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
                      loading || !date || !startTime || !endTime || courtBlocked
                    }
                    className="bg-green-600 text-white hover:bg-green-700 flex-1 py-3 text-sm rounded-xl font-extrabold cursor-pointer disabled:opacity-50"
                    title={courtBlocked ? "Sân đang ngừng nhận đặt lịch" : ""}
                  >
                    {courtBlocked
                      ? "Sân không khả dụng"
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
                      courtBlocked
                    }
                    className="bg-green-600 text-white hover:bg-green-700 flex-1 py-3 text-sm rounded-xl font-extrabold cursor-pointer disabled:opacity-50"
                    title={courtBlocked ? "Sân đang ngừng nhận đặt lịch" : ""}
                  >
                    {courtBlocked
                      ? "Sân không khả dụng"
                      : loading
                        ? "Đang tạo lịch..."
                        : `Xác nhận đặt ${fmPreview?.availableSlots || 0} buổi`}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-[24px] border border-slate-200 p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="font-extrabold text-slate-800 text-xl">
                {court.name}
              </h3>
              {(() => {
                const cType =
                  court.type ||
                  (court.pricePerHour >= 70000
                    ? "A"
                    : court.pricePerHour >= 50000
                      ? "B"
                      : "C");
                const label =
                  cType === "A"
                    ? "Sân A (VIP)"
                    : cType === "B"
                      ? "Sân B (Tiêu Chuẩn)"
                      : "Sân C (Tiết Kiệm)";
                const colorCls =
                  cType === "A"
                    ? "bg-amber-100 text-amber-800 border-amber-300"
                    : cType === "B"
                      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                      : "bg-blue-100 text-blue-800 border-blue-300";
                return (
                  <span
                    className={`text-[11px] font-extrabold px-2.5 py-1 rounded-full border ${colorCls}`}
                  >
                    {label}
                  </span>
                );
              })()}
            </div>
            <p className="text-slate-500 text-sm leading-relaxed mb-4">
              {court.description || "Sân cầu lông tiêu chuẩn chất lượng cao."}
            </p>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2.5">
              <div className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-500">
                Dịch vụ đi kèm theo loại sân
              </div>
              {Array.isArray(court.services) && court.services.length > 0 ? (
                court.services.map((srv, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 text-sm text-slate-700 font-medium"
                  >
                    <span className="text-emerald-600 font-bold">✓</span> {srv}
                  </div>
                ))
              ) : (
                <div className="text-sm text-slate-500">
                  Thảm thi đấu, chiếu sáng LED chống lóa, nước uống &amp; quạt
                  mát.
                </div>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-950 via-green-900 to-emerald-900 text-white rounded-[24px] p-5 shadow-[0_18px_30px_rgba(6,78,59,0.35)] relative overflow-hidden">
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/5 blur-2xl"></div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-lg text-emerald-200">
                Hóa Đơn Tạm Tính
              </h3>
              {hasSpecialPrice && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/60 bg-amber-400/10 px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-amber-200">
                  <Zap size={10} /> Giờ cao điểm
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

      {/* ========== VIETQR + SEPAY PAYMENT MODAL ========== */}
      {showPaymentModal && pendingBooking && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative max-h-[92vh] overflow-y-auto">
            <button
              onClick={handleSkipPayment}
              className="absolute top-4 right-4 p-1 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              <X size={20} className="text-slate-400" />
            </button>

            {/* BƯỚC 1: CHỌN PHƯƠNG THỨC */}
            {paymentStep === "choose" && (
              <>
                <div className="text-center mb-5">
                  <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CreditCard size={26} className="text-green-600" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-800">
                    Xác nhận đặt sân
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    {pendingBooking.courtName} · {pendingBooking.date} (
                    {pendingBooking.startTime} - {pendingBooking.endTime})
                  </p>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-600">
                      Tiền sân (thanh toán QR):
                    </span>
                    <span className="font-bold text-slate-800">
                      {pendingBooking.totalPrice.toLocaleString("vi-VN")}đ
                    </span>
                  </div>
                  {serviceSubtotal > 0 && (
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Dịch vụ thêm (thanh toán tại quầy):</span>
                      <span>{serviceSubtotal.toLocaleString("vi-VN")}đ</span>
                    </div>
                  )}
                  {serviceDeposit > 0 && (
                    <div className="flex justify-between text-xs text-amber-600 mb-1">
                      <span>Cọc thiết bị (tại quầy):</span>
                      <span>{serviceDeposit.toLocaleString("vi-VN")}đ</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base pt-3 border-t border-slate-200 mt-2">
                    <span className="font-bold text-slate-700">
                      Thanh toán ngay:
                    </span>
                    <span className="font-black text-xl text-green-600">
                      {pendingBooking.totalPrice.toLocaleString("vi-VN")}đ
                    </span>
                  </div>
                </div>

                <p className="text-sm font-semibold text-slate-700 mb-3">
                  Chọn phương thức thanh toán:
                </p>

                <div className="space-y-3">
                  <button
                    onClick={handleOpenVietQR}
                    className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-green-500 bg-green-50 hover:bg-green-100 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                        <QrCode size={20} className="text-white" />
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-green-800 text-sm">
                          Chuyển khoản VietQR (Tự động duyệt)
                        </div>
                        <div className="text-xs text-green-600">
                          Quét mã MB Bank — Tự cấp vé QR sau 3–5 giây
                        </div>
                      </div>
                    </div>
                    <ChevronDown
                      size={18}
                      className="text-green-500 -rotate-90"
                    />
                  </button>

                  <button
                    onClick={handleSkipPayment}
                    className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-slate-200 hover:border-slate-300 bg-white transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                        <Banknote size={20} className="text-slate-500" />
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-slate-700 text-sm">
                          Thanh toán sau
                        </div>
                        <div className="text-xs text-slate-500">
                          Thanh toán tại quầy hoặc trong mục Lịch của tôi
                        </div>
                      </div>
                    </div>
                    <ChevronDown
                      size={18}
                      className="text-slate-400 -rotate-90"
                    />
                  </button>
                </div>

                <p className="text-xs text-slate-400 text-center mt-4">
                  Bạn có {DEFAULT_EXPIRE_MINUTES} phút để hoàn tất thanh toán.
                  Sau thời gian này, lịch đặt sẽ tự động hủy.
                </p>
              </>
            )}

            {/* BƯỚC 2: HIỆN MÃ VIETQR & CHỜ SEPAY WEBHOOK + ĐẾM NGƯỢC HẾT HẠN */}
            {paymentStep === "vietqr" && (
              <div>
                <h2 className="text-lg font-extrabold text-slate-800 mb-1">
                  Quét mã VietQR để thanh toán
                </h2>
                <p className="text-xs text-slate-500 mb-3">
                  {pendingBooking.courtName} · {pendingBooking.date} (
                  {pendingBooking.startTime}–{pendingBooking.endTime})
                </p>

                {qrLoading || !paymentInfo ? (
                  <div className="py-12 text-center text-sm text-slate-500">
                    Đang tạo mã VietQR MB Bank...
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col items-center">
                      {secondsLeft > 0 ? (
                        <>
                          <img
                            src={paymentInfo.qrImageUrl}
                            alt="VietQR MB Bank"
                            className="w-60 max-w-full rounded-lg bg-white shadow-sm"
                          />
                          <div className="mt-2.5 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
                            <RefreshCw size={12} className="animate-spin" />
                            Đang chờ chuyển khoản · Hết hạn sau{" "}
                            <span className="text-red-600 font-extrabold">
                              {formatCountdown(secondsLeft)}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="py-8 px-4 text-center">
                          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-2">
                            <AlertTriangle size={22} />
                          </div>
                          <p className="text-red-600 font-extrabold text-sm">
                            Mã VietQR đã hết hạn!
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            Lịch giữ chỗ sẽ tự động hủy. Vui lòng đóng cửa sổ và
                            đặt lại lịch mới.
                          </p>
                        </div>
                      )}
                    </div>

                    {secondsLeft > 0 && (
                      <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 text-xs border border-gray-200">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Ngân hàng</span>
                          <span className="font-bold text-gray-900">
                            {paymentInfo.bankName}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">Số tài khoản</span>
                          <button
                            type="button"
                            onClick={() =>
                              copyText(paymentInfo.accountNumber, "acc")
                            }
                            className="inline-flex items-center gap-1 font-bold text-gray-900"
                          >
                            {paymentInfo.accountNumber}
                            {copiedField === "acc" ? (
                              <Check size={13} className="text-emerald-600" />
                            ) : (
                              <Copy size={12} className="text-gray-400" />
                            )}
                          </button>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Chủ tài khoản</span>
                          <span className="font-bold text-gray-900">
                            {paymentInfo.accountName}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Số tiền</span>
                          <span className="font-extrabold text-emerald-700 text-sm">
                            {paymentInfo.amount?.toLocaleString("vi-VN")}đ
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-1.5 border-t border-gray-200">
                          <span className="text-gray-500">
                            Nội dung CK (bắt buộc)
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              copyText(paymentInfo.description, "note")
                            }
                            className="inline-flex items-center gap-1 font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded"
                          >
                            {paymentInfo.description}
                            {copiedField === "note" ? (
                              <Check size={13} className="text-emerald-600" />
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleSkipPayment}
                      className="w-full py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs cursor-pointer"
                    >
                      {secondsLeft > 0
                        ? "Để sau — Xem trong Lịch của tôi"
                        : "Đóng — Xem trong Lịch của tôi"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* BƯỚC 3: THANH TOÁN THÀNH CÔNG → HIỆN VÉ QR CHECK-IN */}
            {paymentStep === "paid" && (
              <div className="text-center">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
                  <CheckCircle size={26} />
                </div>
                <h2 className="text-lg font-extrabold text-emerald-700">
                  Thanh toán thành công!
                </h2>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  Đưa mã QR dưới đây cho lễ tân quét khi đến nhận sân
                </p>

                <div className="inline-block p-3 bg-white border-2 border-emerald-100 rounded-2xl shadow-sm">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(checkInCode)}`}
                    alt={`Vé QR ${checkInCode}`}
                    className="w-48 h-48"
                  />
                </div>

                <div className="mt-3">
                  <span className="inline-block px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-extrabold text-base tracking-wider">
                    {checkInCode}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleSkipPayment}
                  className="w-full mt-5 py-3 rounded-xl bg-[#0b7f47] hover:bg-[#08653a] text-white font-bold text-sm cursor-pointer"
                >
                  Đi tới Lịch của tôi
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}