import { useState, useEffect, useCallback } from "react";
import api from "../../services/api";
import toast from "react-hot-toast";
import {
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  User,
  Phone,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  LogOut,
  Timer,
  ChevronLeft,
  QrCode,
  ExternalLink,
} from "lucide-react";

// ============ HELPERS ============
const todayStr = () => new Date().toISOString().split("T")[0];

const statusConfig = {
  pending: { label: "Chờ xác nhận", color: "bg-yellow-100 text-yellow-700" },
  confirmed: { label: "Đã xác nhận", color: "bg-blue-100 text-blue-700" },
  checked_in: {
    label: "🟡 Đang mở phiên",
    color: "bg-orange-100 text-orange-700",
  },
  checked_out: { label: "🟢 Hoàn tất", color: "bg-green-100 text-green-700" },
  no_show: { label: "No-show", color: "bg-gray-200 text-gray-600" },
  cancelled: { label: "Đã huỷ", color: "bg-red-100 text-red-700" },
};

export default function POSCheckIn() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDate, setSearchDate] = useState(todayStr());
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Session detail states
  const [sessionServices, setSessionServices] = useState([]);
  const [elapsedTime, setElapsedTime] = useState("");

  // Product picker for adding services
  const [showServicePicker, setShowServicePicker] = useState(false);
  const [products, setProducts] = useState({});
  const [allProducts, setAllProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [activeCategory, setActiveCategory] = useState("drink");
  const [productSearch, setProductSearch] = useState("");

  // Check-out modal
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutData, setCheckoutData] = useState(null);
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] = useState("cash");
  const [checkoutSplitMode, setCheckoutSplitMode] = useState(false);
  const [checkoutSplitAmount, setCheckoutSplitAmount] = useState("");
  const [checkoutPaymentMethod2, setCheckoutPaymentMethod2] =
    useState("transfer");
  const [checkoutCancelMid, setCheckoutCancelMid] = useState(false);
  const [checkoutCancelReason, setCheckoutCancelReason] = useState("");
  const [checkouting, setCheckouting] = useState(false);

  // Cancel / No-show / Reschedule modals
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);

  // VNPay QR Payment
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrPaymentUrl, setQrPaymentUrl] = useState("");
  const [qrOrderId, setQrOrderId] = useState("");
  const [qrPolling, setQrPolling] = useState(false);
  const [qrStatus, setQrStatus] = useState(""); // waiting | success | failed
  const [qrLoading, setQrLoading] = useState(false);

  // Timer for checked_in sessions
  useEffect(() => {
    if (!selectedBooking || selectedBooking.status !== "checked_in") {
      setElapsedTime("");
      return;
    }
    const updateTimer = () => {
      if (!selectedBooking.checkedInAt) return;
      const start = new Date(selectedBooking.checkedInAt);
      const now = new Date();
      const diffMs = now - start;
      const diffMins = Math.floor(diffMs / 60000);
      const h = Math.floor(diffMins / 60);
      const m = diffMins % 60;
      setElapsedTime(`${h}h ${m}m`);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 30000);
    return () => clearInterval(interval);
  }, [selectedBooking]);

  // Fetch products when picker opens
  useEffect(() => {
    if (showServicePicker && Object.keys(products).length === 0) {
      fetchProducts();
    }
  }, [showServicePicker]);

  // ============ SEARCH ============
  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      toast.error("Vui lòng nhập ít nhất 2 ký tự");
      return;
    }
    setSearching(true);
    setSelectedBooking(null);
    try {
      const res = await api.get("/pos/bookings/search", {
        params: { q: searchQuery, date: searchDate },
      });
      setSearchResults(res.data.bookings);
      if (res.data.bookings.length === 0) {
        toast("Không tìm thấy booking nào", { icon: "🔍" });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi tìm kiếm");
    } finally {
      setSearching(false);
    }
  };

  // ============ VIEW DETAIL ============
  const viewBookingDetail = async (booking) => {
    setSelectedBooking(booking);
    setDetailLoading(true);
    setSessionServices([]);

    try {
      // Refresh booking data
      const bookingRes = await api.get(`/bookings/${booking._id}`);
      setSelectedBooking(bookingRes.data.booking);

      // Nếu đang checked_in, lấy danh sách dịch vụ
      if (
        booking.status === "checked_in" ||
        bookingRes.data.booking.status === "checked_in"
      ) {
        const svcRes = await api.get(`/pos/bookings/${booking._id}/services`);
        setSessionServices(svcRes.data.serviceOrders || []);
      }
    } catch (err) {
      toast.error("Không thể tải chi tiết booking");
    } finally {
      setDetailLoading(false);
    }
  };

  // ============ CHECK-IN (MỞ PHIÊN - KHÔNG THU TIỀN) ============
  const handleCheckIn = async (bookingId) => {
    if (!confirm("Xác nhận mở phiên cho khách vào sân?")) return;
    try {
      const res = await api.put(`/pos/bookings/${bookingId}/checkin`);
      toast.success(res.data.message);
      viewBookingDetail(res.data.booking);
      handleSearch();
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi check-in");
    }
  };

  // ============ PRODUCT PICKER ============
  const fetchProducts = async () => {
    try {
      const res = await api.get("/pos/top-products");
      setProducts(res.data.grouped);
      setAllProducts(res.data.products);
    } catch (err) {
      toast.error("Không thể tải sản phẩm");
    }
  };

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item._id === product._id);
      if (existing) {
        return prev.map((item) =>
          item._id === product._id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item._id !== productId));
  };

  const updateQuantity = (productId, delta) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item._id === productId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const cartTotal = cart.reduce(
    (sum, item) =>
      sum +
      item.price * item.quantity +
      (item.isRentable ? item.depositAmount * item.quantity : 0),
    0,
  );

  const cartSubtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const cartDeposit = cart.reduce(
    (sum, item) =>
      sum + (item.isRentable ? item.depositAmount * item.quantity : 0),
    0,
  );

  const handleAddServiceToSession = async () => {
    if (cart.length === 0) {
      toast.error("Chọn ít nhất 1 sản phẩm");
      return;
    }
    try {
      const items = cart.map((item) => ({
        product: item._id,
        quantity: item.quantity,
      }));
      const res = await api.post(
        `/pos/bookings/${selectedBooking._id}/services`,
        { items },
      );
      toast.success(res.data.message);
      setCart([]);
      setShowServicePicker(false);
      // Refresh services
      const svcRes = await api.get(
        `/pos/bookings/${selectedBooking._id}/services`,
      );
      setSessionServices(svcRes.data.serviceOrders || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi thêm dịch vụ");
    }
  };

  // ============ CALCULATE CHECKOUT BILL ============
  const calculateBill = useCallback(() => {
    if (!selectedBooking) return null;

    const courtFee =
      selectedBooking.paymentStatus === "unpaid"
        ? selectedBooking.totalPrice
        : 0;

    // Calculate overtime
    const now = new Date();
    const [eh, em] = (selectedBooking.endTime || "00:00")
      .split(":")
      .map(Number);
    const endMin = eh * 60 + em;
    const curMin = now.getHours() * 60 + now.getMinutes();
    let overtimeFee = 0;
    let overtimeMinutes = 0;
    if (curMin > endMin) {
      overtimeMinutes = curMin - endMin;
      const overtimeBlocks = Math.ceil(overtimeMinutes / 30);
      const hourlyRate = selectedBooking.court?.pricePerHour || 100000;
      overtimeFee = Math.round(hourlyRate * (overtimeBlocks * 0.5));
    }

    let totalServiceFee = 0;
    let totalDeposit = 0;
    for (const so of sessionServices) {
      if (so.status === "pending") {
        totalServiceFee += so.subtotalAmount || 0;
        totalDeposit += so.totalDeposit || 0;
      }
    }

    const depositReturned = totalDeposit; // Giả định hoàn toàn bộ cọc
    const finalBill =
      courtFee + overtimeFee + totalServiceFee - depositReturned;

    return {
      courtFee,
      overtimeFee,
      overtimeMinutes,
      totalServiceFee,
      totalDeposit,
      depositReturned,
      finalBillAmount: Math.max(0, finalBill),
    };
  }, [selectedBooking, sessionServices]);

  // ============ CHECK-OUT ============
  const openCheckout = () => {
    const bill = calculateBill();
    setCheckoutData(bill);
    setCheckoutPaymentMethod("cash");
    setCheckoutSplitMode(false);
    setCheckoutSplitAmount("");
    setCheckoutCancelMid(false);
    setCheckoutCancelReason("");
    setShowCheckoutModal(true);
  };

  // ============ VNPAY QR PAYMENT ============
  const handleCreateQr = async () => {
    if (!selectedBooking || !checkoutData) return;
    setQrLoading(true);
    try {
      const lastShift = localStorage.getItem("currentShiftId");
      const bill = checkoutData;

      const res = await api.post("/vnpay/create-qr", {
        bookingId: selectedBooking._id,
        amount: bill.finalBillAmount,
        orderInfo: `Check-out ${selectedBooking.court?.name || "San"} ${selectedBooking.date}`,
        shiftId: lastShift || undefined,
        customerName: selectedBooking.user?.name || "Khách",
        customerPhone: selectedBooking.customerPhone || "",
      });

      if (res.data.paymentUrl) {
        setQrPaymentUrl(res.data.paymentUrl);
        setQrOrderId(res.data.transaction.orderId);
        setQrStatus("waiting");
        setShowQrModal(true);
        startQrPolling(res.data.transaction.orderId);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi tạo QR thanh toán");
    } finally {
      setQrLoading(false);
    }
  };

  const startQrPolling = (orderId) => {
    setQrPolling(true);
    let attempts = 0;
    const maxAttempts = 60; // 60 x 2s = 120s

    const poll = setInterval(async () => {
      attempts++;
      try {
        const res = await api.get(`/vnpay/check-status/${orderId}`);
        if (res.data.status === "success") {
          clearInterval(poll);
          setQrStatus("success");
          setQrPolling(false);
          // Tự động đóng sau 2s
          setTimeout(() => {
            setShowQrModal(false);
            setShowCheckoutModal(false);
            setSelectedBooking(null);
            handleSearch();
            toast.success("Thanh toán QR thành công!");
          }, 2000);
        } else if (res.data.status === "failed") {
          clearInterval(poll);
          setQrStatus("failed");
          setQrPolling(false);
        }
      } catch (err) {
        // Ignore polling errors
      }

      if (attempts >= maxAttempts) {
        clearInterval(poll);
        setQrStatus("failed");
        setQrPolling(false);
      }
    }, 2000);
  };

  const handleCheckOut = async () => {
    if (!selectedBooking) return;
    setCheckouting(true);
    try {
      const lastShift = localStorage.getItem("currentShiftId");
      const payload = {
        paymentMethod: checkoutPaymentMethod,
        shiftId: lastShift || undefined,
        note: checkoutCancelMid ? undefined : "",
        cancelMidSession: checkoutCancelMid,
        cancelReason: checkoutCancelMid ? checkoutCancelReason : undefined,
      };

      if (
        checkoutSplitMode &&
        checkoutSplitAmount &&
        Number(checkoutSplitAmount) > 0
      ) {
        payload.paymentMethod2 = checkoutPaymentMethod2;
        payload.splitAmount = Number(checkoutSplitAmount);
      }

      const res = await api.put(
        `/pos/bookings/${selectedBooking._id}/checkout`,
        payload,
      );
      toast.success(res.data.message);
      setShowCheckoutModal(false);
      setSelectedBooking(null);
      handleSearch();
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi check-out");
    } finally {
      setCheckouting(false);
    }
  };

  // ============ CANCEL / NO-SHOW / RESCHEDULE ============
  const handleCancel = async () => {
    if (!selectedBooking) return;
    const reason = prompt("Lý do huỷ:", "Khách yêu cầu huỷ");
    if (!reason) return;
    try {
      const res = await api.put(`/pos/bookings/${selectedBooking._id}/cancel`, {
        reason,
        paymentMethod: "cash",
      });
      toast.success(res.data.message);
      setShowCancelModal(false);
      setSelectedBooking(null);
      handleSearch();
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi huỷ booking");
    }
  };

  const handleNoShow = async (bookingId) => {
    if (!confirm("Xác nhận đánh dấu no-show?")) return;
    try {
      const res = await api.put(`/pos/bookings/${bookingId}/noshow`);
      toast.success(res.data.message);
      handleSearch();
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi");
    }
  };

  const handleReschedule = async () => {
    if (!selectedBooking) return;
    const newDate =
      prompt("Ngày mới (YYYY-MM-DD):", selectedBooking.date) ||
      selectedBooking.date;
    const newStart = prompt(
      "Giờ bắt đầu mới (HH:mm):",
      selectedBooking.startTime,
    );
    const newEnd = prompt("Giờ kết thúc mới (HH:mm):", selectedBooking.endTime);
    if (!newStart || !newEnd) return;
    try {
      const res = await api.put(
        `/pos/bookings/${selectedBooking._id}/reschedule`,
        {
          newDate,
          newStartTime: newStart,
          newEndTime: newEnd,
        },
      );
      toast.success(res.data.message);
      setShowRescheduleModal(false);
      setSelectedBooking(null);
      handleSearch();
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi dời lịch");
    }
  };

  // ============ FILTERED PRODUCTS ============
  const filteredProducts = productSearch
    ? allProducts.filter(
        (p) =>
          p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
          p.category.toLowerCase().includes(productSearch.toLowerCase()),
      )
    : products[activeCategory] || [];

  const categories = [
    { key: "drink", label: "🥤 Đồ uống" },
    { key: "snack", label: "🍿 Đồ ăn" },
    { key: "consumable", label: "🏸 Vật tư" },
    { key: "rental", label: "🔑 Thuê đồ" },
  ];

  // ============ RENDER ============
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
        <CheckCircle size={24} className="text-green-600" />
        Quản lý phiên · Check-in / Check-out
      </h2>

      {/* ===== SEARCH BAR ===== */}
      <div className="bg-white rounded-xl p-4 shadow-sm border">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Nhập SĐT, tên khách hoặc mã booking..."
              className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <input
            type="date"
            className="border rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-green-500 outline-none"
            value={searchDate}
            onChange={(e) => setSearchDate(e.target.value)}
          />
          <button
            onClick={handleSearch}
            disabled={searching}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg font-medium transition flex items-center gap-2 disabled:opacity-50"
          >
            {searching ? (
              <RefreshCw size={18} className="animate-spin" />
            ) : (
              <Search size={18} />
            )}
            Tìm
          </button>
        </div>
      </div>

      {/* ===== BOOKING DETAIL PANEL ===== */}
      {selectedBooking && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedBooking(null)}
                className="p-1 hover:bg-gray-200 rounded-lg transition"
              >
                <ChevronLeft size={20} />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg">
                    {selectedBooking.court?.name || "Sân"}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${(statusConfig[selectedBooking.status] || statusConfig.pending).color}`}
                  >
                    {
                      (
                        statusConfig[selectedBooking.status] ||
                        statusConfig.pending
                      ).label
                    }
                  </span>
                  {selectedBooking.bookingType === "walk-in" && (
                    <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs font-medium">
                      Walk-in
                    </span>
                  )}
                  {selectedBooking.paymentStatus === "paid" &&
                    selectedBooking.status !== "checked_out" && (
                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">
                        Đã trả trước
                      </span>
                    )}
                </div>
                <div className="text-sm text-gray-500">
                  📅 {selectedBooking.date} · ⏰ {selectedBooking.startTime} -{" "}
                  {selectedBooking.endTime}
                </div>
              </div>
            </div>
            {selectedBooking.status === "checked_in" && elapsedTime && (
              <div className="flex items-center gap-1 text-orange-600 font-semibold">
                <Timer size={18} /> Đã chơi: {elapsedTime}
              </div>
            )}
          </div>

          {detailLoading ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw size={24} className="animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {/* Customer info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-400">Khách hàng:</span>
                  <span className="ml-1 font-medium">
                    {selectedBooking.user?.name || "Khách"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">SĐT:</span>
                  <span className="ml-1 font-medium">
                    {selectedBooking.customerPhone ||
                      selectedBooking.user?.phone ||
                      "-"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Loại đặt:</span>
                  <span className="ml-1 font-medium">
                    {selectedBooking.bookingType === "walk-in"
                      ? "Vãng lai"
                      : selectedBooking.bookingType === "fixed_monthly"
                        ? "Cố định tháng"
                        : "Vãng lai"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Tiền sân dự kiến:</span>
                  <span className="ml-1 font-semibold text-green-700">
                    {selectedBooking.totalPrice?.toLocaleString()}đ
                  </span>
                </div>
                {selectedBooking.paymentStatus === "paid" && (
                  <div>
                    <span className="text-gray-400">Thanh toán:</span>
                    <span className="ml-1 font-semibold text-blue-600">
                      Đã trả trước
                    </span>
                  </div>
                )}
              </div>

              {/* ===== SESSION SERVICES (khi checked_in) ===== */}
              {selectedBooking.status === "checked_in" && (
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-gray-700 flex items-center gap-2">
                      <ShoppingCart size={18} /> Dịch vụ trong phiên
                    </h3>
                    <button
                      onClick={() => {
                        setCart([]);
                        setShowServicePicker(true);
                      }}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1"
                    >
                      <Plus size={16} /> Thêm dịch vụ
                    </button>
                  </div>

                  {sessionServices.length === 0 ? (
                    <div className="text-center py-4 text-gray-400 text-sm">
                      Chưa có dịch vụ nào
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {sessionServices.map((so) => (
                        <div key={so._id} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-gray-400">
                              {so.orderNumber}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs ${so.status === "pending" ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}
                            >
                              {so.status === "pending"
                                ? "Chờ thanh toán"
                                : "Đã thanh toán"}
                            </span>
                          </div>
                          {so.items?.map((item, i) => (
                            <div
                              key={i}
                              className="flex justify-between text-sm py-1"
                            >
                              <span>
                                {item.productName} x{item.quantity}
                              </span>
                              <span className="font-medium">
                                {item.subtotal?.toLocaleString()}đ
                              </span>
                            </div>
                          ))}
                          <div className="flex justify-between text-sm font-semibold border-t pt-1 mt-1">
                            <span>Tổng</span>
                            <span>{so.totalAmount?.toLocaleString()}đ</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tổng tiền dịch vụ trong phiên */}
                  {(() => {
                    const svcTotal = sessionServices
                      .filter((so) => so.status === "pending")
                      .reduce((sum, so) => sum + (so.subtotalAmount || 0), 0);
                    const depTotal = sessionServices
                      .filter((so) => so.status === "pending")
                      .reduce((sum, so) => sum + (so.totalDeposit || 0), 0);
                    return (
                      <div className="mt-3 bg-gray-50 rounded-lg p-3 text-sm">
                        <div className="flex justify-between">
                          <span>Tiền dịch vụ:</span>
                          <span>{svcTotal.toLocaleString()}đ</span>
                        </div>
                        {depTotal > 0 && (
                          <div className="flex justify-between text-orange-600">
                            <span>Tiền cọc:</span>
                            <span>{depTotal.toLocaleString()}đ</span>
                          </div>
                        )}
                        <div className="flex justify-between font-bold border-t pt-1 mt-1">
                          <span>Tổng dịch vụ + cọc:</span>
                          <span className="text-purple-700">
                            {(svcTotal + depTotal).toLocaleString()}đ
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* ===== ACTION BUTTONS ===== */}
              <div className="border-t pt-4 flex gap-2 flex-wrap">
                {/* Check-in button */}
                {!selectedBooking.checkedIn &&
                  ["pending", "confirmed"].includes(selectedBooking.status) && (
                    <button
                      onClick={() => handleCheckIn(selectedBooking._id)}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg font-medium transition flex items-center gap-2"
                    >
                      <CheckCircle size={18} /> Mở phiên (Check-in)
                    </button>
                  )}

                {/* Check-out button */}
                {selectedBooking.status === "checked_in" && (
                  <button
                    onClick={openCheckout}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg font-medium transition flex items-center gap-2"
                  >
                    <LogOut size={18} /> Check-out & Thanh toán
                  </button>
                )}

                {/* No-show */}
                {["pending", "confirmed"].includes(selectedBooking.status) &&
                  !selectedBooking.checkedIn && (
                    <button
                      onClick={() => handleNoShow(selectedBooking._id)}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm transition flex items-center gap-1"
                    >
                      <XCircle size={16} /> No-show
                    </button>
                  )}

                {/* Cancel */}
                {["pending", "confirmed"].includes(selectedBooking.status) &&
                  !selectedBooking.checkedIn && (
                    <button
                      onClick={() => setShowCancelModal(true)}
                      className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded-lg text-sm transition"
                    >
                      🗑 Huỷ booking
                    </button>
                  )}

                {/* Reschedule */}
                {!["cancelled", "no_show", "checked_out"].includes(
                  selectedBooking.status,
                ) && (
                  <button
                    onClick={() => setShowRescheduleModal(true)}
                    className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-2 rounded-lg text-sm transition"
                  >
                    🔄 Đổi giờ
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== SEARCH RESULTS ===== */}
      {!selectedBooking && searchResults.length > 0 && (
        <div className="space-y-3">
          <div className="text-sm text-gray-500">
            Tìm thấy {searchResults.length} booking
          </div>
          {searchResults.map((booking) => (
            <div
              key={booking._id}
              className="bg-white rounded-xl p-4 shadow-sm border hover:border-green-300 transition cursor-pointer"
              onClick={() => viewBookingDetail(booking)}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-lg">
                      {booking.court?.name || "Sân"}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${(statusConfig[booking.status] || statusConfig.pending).color}`}
                    >
                      {
                        (statusConfig[booking.status] || statusConfig.pending)
                          .label
                      }
                    </span>
                    {booking.bookingType === "walk-in" && (
                      <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs font-medium">
                        Walk-in
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    📅 {booking.date} · ⏰ {booking.startTime} -{" "}
                    {booking.endTime}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <User size={14} /> {booking.user?.name || "Khách"}
                    </span>
                    {booking.customerPhone && (
                      <span className="flex items-center gap-1">
                        <Phone size={14} /> {booking.customerPhone}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 font-semibold text-green-700">
                    {booking.totalPrice?.toLocaleString()}đ
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {!booking.checkedIn &&
                    ["pending", "confirmed"].includes(booking.status) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCheckIn(booking._id);
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1"
                      >
                        <CheckCircle size={16} /> Mở phiên
                      </button>
                    )}
                  {booking.status === "checked_in" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        viewBookingDetail(booking);
                      }}
                      className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                    >
                      🟡 Đang mở
                    </button>
                  )}
                  {booking.status === "checked_out" && (
                    <span className="bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm font-medium">
                      ✅ Hoàn tất
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===== NO RESULTS ===== */}
      {!selectedBooking &&
        !searching &&
        searchResults.length === 0 &&
        searchQuery.length >= 2 && (
          <div className="text-center py-8 text-gray-400">
            <Search size={48} className="mx-auto mb-3 opacity-50" />
            <p>Không tìm thấy booking nào</p>
            <p className="text-sm">Thử lại với SĐT hoặc tên khác</p>
          </div>
        )}

      {/* ===== SERVICE PICKER MODAL ===== */}
      {showServicePicker && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowServicePicker(false)}
        >
          <div
            className="bg-white rounded-xl max-w-3xl w-full mx-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b sticky top-0 bg-white z-10">
              <h3 className="font-bold text-lg">Thêm dịch vụ vào phiên</h3>
              <p className="text-sm text-gray-500">
                {selectedBooking?.court?.name} -{" "}
                {selectedBooking?.user?.name || "Khách"}
              </p>
            </div>

            <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Products */}
              <div className="lg:col-span-2 space-y-3">
                <div className="relative">
                  <Search
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    placeholder="Tìm sản phẩm..."
                    className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                  />
                </div>
                {!productSearch && (
                  <div className="flex gap-1 overflow-x-auto">
                    {categories.map((cat) => (
                      <button
                        key={cat.key}
                        onClick={() => setActiveCategory(cat.key)}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition ${activeCategory === cat.key ? "bg-purple-600 text-white" : "hover:bg-gray-100 text-gray-600"}`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {filteredProducts.map((product) => (
                    <button
                      key={product._id}
                      onClick={() => addToCart(product)}
                      disabled={
                        !product.isActive ||
                        (product.stockQuantity <= 0 &&
                          product.category !== "rental")
                      }
                      className={`bg-white rounded-xl p-3 border shadow-sm text-left transition hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${cart.find((i) => i._id === product._id) ? "border-purple-400 ring-1 ring-purple-400" : "border-gray-200"}`}
                    >
                      <div className="font-semibold text-sm line-clamp-2">
                        {product.name}
                      </div>
                      <div className="text-purple-700 font-bold mt-1">
                        {product.price.toLocaleString()}đ
                      </div>
                      {product.isRentable && (
                        <div className="text-xs text-orange-600">
                          Cọc: {product.depositAmount.toLocaleString()}đ
                        </div>
                      )}
                      <div className="text-xs text-gray-400">
                        Kho: {product.stockQuantity}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cart */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-bold mb-3">Giỏ ({cart.length})</h4>
                {cart.length === 0 ? (
                  <div className="text-center text-gray-400 text-sm py-4">
                    Chọn sản phẩm
                  </div>
                ) : (
                  <>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {cart.map((item) => (
                        <div
                          key={item._id}
                          className="flex items-center justify-between bg-white p-2 rounded-lg"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">
                              {item.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {item.price.toLocaleString()}đ{" "}
                              {item.isRentable &&
                                `+ cọc ${item.depositAmount.toLocaleString()}đ`}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => updateQuantity(item._id, -1)}
                              className="p-1 hover:bg-gray-100 rounded"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="w-6 text-center text-sm">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item._id, 1)}
                              className="p-1 hover:bg-gray-100 rounded"
                            >
                              <Plus size={14} />
                            </button>
                            <button
                              onClick={() => removeFromCart(item._id)}
                              className="p-1 hover:bg-red-50 rounded text-red-400"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="border-t pt-2 mt-2 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Tạm tính:</span>
                        <span>{cartSubtotal.toLocaleString()}đ</span>
                      </div>
                      {cartDeposit > 0 && (
                        <div className="flex justify-between text-orange-600">
                          <span>Cọc:</span>
                          <span>{cartDeposit.toLocaleString()}đ</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-lg pt-1 border-t">
                        <span>Tổng:</span>
                        <span className="text-purple-700">
                          {cartTotal.toLocaleString()}đ
                        </span>
                      </div>
                    </div>
                  </>
                )}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => {
                      setCart([]);
                      setShowServicePicker(false);
                    }}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 py-2 rounded-lg text-sm font-medium"
                  >
                    Đóng
                  </button>
                  <button
                    onClick={handleAddServiceToSession}
                    disabled={cart.length === 0}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    Thêm vào phiên
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== CHECKOUT MODAL ===== */}
      {showCheckoutModal && checkoutData && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowCheckoutModal(false)}
        >
          <div
            className="bg-white rounded-xl max-w-lg w-full mx-4 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 space-y-4">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <LogOut size={24} className="text-red-600" /> Check-out & Thanh
                toán
              </h3>
              <p className="text-sm text-gray-500">
                {selectedBooking?.court?.name} ·{" "}
                {selectedBooking?.user?.name || "Khách"} ·{" "}
                {selectedBooking?.startTime}-{selectedBooking?.endTime}
              </p>

              {/* Bill breakdown */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                {checkoutData.courtFee > 0 && (
                  <div className="flex justify-between">
                    <span>Tiền sân:</span>
                    <span className="font-medium">
                      {checkoutData.courtFee.toLocaleString()}đ
                    </span>
                  </div>
                )}
                {selectedBooking?.paymentStatus === "paid" && (
                  <div className="flex justify-between text-blue-600">
                    <span>Tiền sân (đã trả trước):</span>
                    <span className="font-medium">0đ (đã thu)</span>
                  </div>
                )}
                {checkoutData.overtimeFee > 0 && (
                  <div className="flex justify-between text-orange-600">
                    <span>
                      Phụ thu quá giờ ({checkoutData.overtimeMinutes}ph):
                    </span>
                    <span className="font-medium">
                      +{checkoutData.overtimeFee.toLocaleString()}đ
                    </span>
                  </div>
                )}
                {checkoutData.totalServiceFee > 0 && (
                  <div className="flex justify-between">
                    <span>Tiền dịch vụ:</span>
                    <span className="font-medium">
                      {checkoutData.totalServiceFee.toLocaleString()}đ
                    </span>
                  </div>
                )}
                {checkoutData.totalDeposit > 0 && (
                  <>
                    <div className="flex justify-between text-orange-600">
                      <span>Tiền cọc đã thu:</span>
                      <span>{checkoutData.totalDeposit.toLocaleString()}đ</span>
                    </div>
                    <div className="flex justify-between text-green-600">
                      <span>Hoàn cọc (trả đồ tốt):</span>
                      <span>
                        -{checkoutData.depositReturned.toLocaleString()}đ
                      </span>
                    </div>
                  </>
                )}
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>TỔNG THU:</span>
                  <span className="text-red-600">
                    {checkoutData.finalBillAmount.toLocaleString()}đ
                  </span>
                </div>
              </div>

              {/* Cancel mid-session option */}
              {selectedBooking?.status === "checked_in" && (
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checkoutCancelMid}
                    onChange={(e) => setCheckoutCancelMid(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-red-600">
                    Khách hủy giữa chừng (tính phí riêng)
                  </span>
                </label>
              )}
              {checkoutCancelMid && (
                <input
                  type="text"
                  placeholder="Lý do hủy giữa chừng..."
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={checkoutCancelReason}
                  onChange={(e) => setCheckoutCancelReason(e.target.value)}
                />
              )}

              {/* Payment method */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  Phương thức thanh toán
                </label>
                <div className="flex gap-2">
                  {["cash", "transfer", "vnpay_qr"].map((m) => (
                    <button
                      key={m}
                      onClick={() => setCheckoutPaymentMethod(m)}
                      className={`flex-1 py-2.5 rounded-lg border-2 font-medium text-sm transition ${checkoutPaymentMethod === m ? "border-green-500 bg-green-50 text-green-700" : "border-gray-200 text-gray-500"}`}
                    >
                      {m === "cash"
                        ? "💵 Tiền mặt"
                        : m === "transfer"
                          ? "🏦 Chuyển khoản"
                          : "📱 VNPay QR"}
                    </button>
                  ))}
                </div>
                {checkoutPaymentMethod === "vnpay_qr" &&
                  checkoutData.finalBillAmount > 0 && (
                    <button
                      onClick={handleCreateQr}
                      disabled={qrLoading}
                      className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-bold text-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {qrLoading ? (
                        <RefreshCw size={16} className="animate-spin" />
                      ) : (
                        <QrCode size={16} />
                      )}
                      {qrLoading
                        ? "Đang tạo mã QR..."
                        : `Tạo mã QR VNPay (${checkoutData.finalBillAmount.toLocaleString()}đ)`}
                    </button>
                  )}
              </div>

              {/* Split payment toggle */}
              {checkoutData.finalBillAmount > 0 && (
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checkoutSplitMode}
                    onChange={(e) => setCheckoutSplitMode(e.target.checked)}
                    className="rounded"
                  />
                  <span>Tách thanh toán (1 phần CK + 1 phần TM)</span>
                </label>
              )}
              {checkoutSplitMode && (
                <div className="bg-blue-50 rounded-lg p-3 space-y-2">
                  <div className="flex gap-2">
                    <select
                      value={checkoutPaymentMethod2}
                      onChange={(e) =>
                        setCheckoutPaymentMethod2(e.target.value)
                      }
                      className="border rounded-lg px-2 py-2 text-sm"
                    >
                      <option value="transfer">🏦 Chuyển khoản</option>
                      <option value="cash">💵 Tiền mặt</option>
                    </select>
                    <input
                      type="number"
                      placeholder="Số tiền phần 2"
                      className="flex-1 border rounded-lg px-3 py-2 text-sm"
                      value={checkoutSplitAmount}
                      onChange={(e) => setCheckoutSplitAmount(e.target.value)}
                    />
                  </div>
                  <div className="text-xs text-gray-500">
                    Phần 1 ({checkoutPaymentMethod === "cash" ? "TM" : "CK"}):{" "}
                    {(
                      checkoutData.finalBillAmount -
                      (Number(checkoutSplitAmount) || 0)
                    ).toLocaleString()}
                    đ
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowCheckoutModal(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 py-2.5 rounded-lg font-medium transition"
                >
                  Đóng
                </button>
                <button
                  onClick={handleCheckOut}
                  disabled={checkouting || checkoutPaymentMethod === "vnpay_qr"}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg font-bold transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {checkouting ? (
                    <RefreshCw size={18} className="animate-spin" />
                  ) : (
                    <CreditCard size={18} />
                  )}
                  {checkouting
                    ? "Đang xử lý..."
                    : `Xác nhận thu ${checkoutData.finalBillAmount.toLocaleString()}đ`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== CANCEL MODAL ===== */}
      {showCancelModal && selectedBooking && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowCancelModal(false)}
        >
          <div
            className="bg-white rounded-xl p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-red-600 mb-3">
              ⚠️ Xác nhận huỷ booking
            </h3>
            <div className="text-sm text-gray-600 mb-4">
              <p>
                Sân: <strong>{selectedBooking.court?.name}</strong>
              </p>
              <p>
                Ngày: {selectedBooking.date} · {selectedBooking.startTime} -{" "}
                {selectedBooking.endTime}
              </p>
              <p>
                Tiền đã thu:{" "}
                <strong>{selectedBooking.totalPrice?.toLocaleString()}đ</strong>
              </p>
              <p className="mt-2 text-yellow-600">
                <AlertCircle size={16} className="inline mr-1" />
                Hệ thống sẽ tự tính % hoàn tiền theo chính sách huỷ
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-medium transition"
              >
                Xác nhận huỷ
              </button>
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 py-2 rounded-lg font-medium transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== RESCHEDULE MODAL ===== */}
      {showRescheduleModal && selectedBooking && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowRescheduleModal(false)}
        >
          <div
            className="bg-white rounded-xl p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-blue-600 mb-3">
              🔄 Dời lịch
            </h3>
            <div className="text-sm text-gray-600 mb-4">
              <p>
                Hiện tại:{" "}
                <strong>
                  {selectedBooking.date} · {selectedBooking.startTime} -{" "}
                  {selectedBooking.endTime}
                </strong>
              </p>
              <p>Sân: {selectedBooking.court?.name}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleReschedule}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition"
              >
                Xác nhận dời
              </button>
              <button
                onClick={() => setShowRescheduleModal(false)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 py-2 rounded-lg font-medium transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== VNPAY QR MODAL ===== */}
      {showQrModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]"
          onClick={() => {
            if (qrStatus !== "waiting") {
              setShowQrModal(false);
            }
          }}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full mx-4 p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            {qrStatus === "waiting" && (
              <>
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  Quét mã QR để thanh toán
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Mở app ngân hàng bất kỳ và quét mã bên dưới
                </p>
                <div className="bg-white border-2 border-gray-200 rounded-xl p-4 inline-block mb-4">
                  {/* QR Code từ VNPay URL - dùng Google Charts API */}
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrPaymentUrl)}`}
                    alt="VNPay QR Code"
                    className="w-52 h-52"
                  />
                </div>
                <div className="bg-blue-50 rounded-xl p-3 mb-4">
                  <p className="text-sm font-bold text-blue-700">
                    {checkoutData?.finalBillAmount?.toLocaleString()}đ
                  </p>
                  <p className="text-xs text-blue-500 mt-1">Mã: {qrOrderId}</p>
                </div>
                {qrPolling && (
                  <div className="flex items-center justify-center gap-2 text-amber-600">
                    <RefreshCw size={16} className="animate-spin" />
                    <span className="text-sm">Đang chờ thanh toán...</span>
                  </div>
                )}
                <button
                  onClick={() => {
                    setShowQrModal(false);
                  }}
                  className="mt-4 text-sm text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  Đóng (khách sẽ tự thanh toán)
                </button>
              </>
            )}

            {qrStatus === "success" && (
              <>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle size={32} className="text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-green-700 mb-2">
                  Thanh toán thành công!
                </h3>
                <p className="text-sm text-gray-500">
                  Giao dịch đã được xác nhận. Đang tự động đóng...
                </p>
              </>
            )}

            {qrStatus === "failed" && (
              <>
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <XCircle size={32} className="text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-red-700 mb-2">
                  Thanh toán thất bại
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Khách chưa thanh toán hoặc giao dịch bị từ chối
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowQrModal(false);
                    }}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 py-2 rounded-lg font-medium text-sm"
                  >
                    Đóng
                  </button>
                  <button
                    onClick={handleCreateQr}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium text-sm"
                  >
                    Thử lại
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
