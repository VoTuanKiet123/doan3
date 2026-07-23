import { useEffect, useState } from "react";
import api from "../../services/api";
import toast from "react-hot-toast";
import {
  Wrench,
  User,
  Clock,
  CheckCircle,
  AlertTriangle,
  Ban,
  DollarSign,
  FileText,
  Search,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const RENTAL_STATUS_MAP = {
  in_use: {
    text: "Đang thuê",
    cls: "badge badge-pending",
    icon: <Clock size={12} />,
  },
  returned_good: {
    text: "Đã trả - Tốt",
    cls: "badge badge-confirmed",
    icon: <CheckCircle size={12} />,
  },
  returned_damaged: {
    text: "Đã trả - Hư",
    cls: "badge badge-pending",
    icon: <AlertTriangle size={12} />,
  },
  lost: {
    text: "Mất đồ",
    cls: "badge badge-cancelled",
    icon: <Ban size={12} />,
  },
};

export default function AdminRentals() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [returnModal, setReturnModal] = useState(null); // { orderId, itemId }
  const [returnForm, setReturnForm] = useState({
    returnStatus: "returned_good",
    damageFee: "",
    note: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await api.get("/service-orders/admin/all?limit=200");
      setOrders(res.data.data);
    } catch {
      toast.error("Không tải được danh sách đơn");
    } finally {
      setLoading(false);
    }
  };

  // Lọc đơn có món rental
  const rentalOrders = orders.filter((order) =>
    order.items.some(
      (item) => item.depositPerItem > 0 || item.productCategory === "rental",
    ),
  );

  const filteredOrders = rentalOrders.filter((order) => {
    const matchSearch =
      order.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      (order.createdBy?.name || "")
        .toLowerCase()
        .includes(search.toLowerCase());
    if (statusFilter) {
      return order.items.some((item) => item.rentalStatus === statusFilter);
    }
    return matchSearch;
  });

  const openReturnModal = (orderId, itemId, currentStatus) => {
    setReturnModal({ orderId, itemId });
    setReturnForm({
      returnStatus: "returned_good",
      damageFee: "",
      note: "",
    });
  };

  const handleReturnItem = async () => {
    if (!returnModal) return;
    setSubmitting(true);
    try {
      await api.put(
        `/service-orders/${returnModal.orderId}/return-item/${returnModal.itemId}`,
        {
          returnStatus: returnForm.returnStatus,
          damageFee: Number(returnForm.damageFee) || 0,
          note: returnForm.note,
        },
      );
      toast.success("Cập nhật trạng thái trả đồ thành công!");
      setReturnModal(null);
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi cập nhật");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="admin-loading">Đang tải...</div>;

  return (
    <div className="admin-rentals">
      <div className="admin-page-header">
        <div>
          <h2 className="admin-page-title">
            <Wrench size={22} /> Theo dõi Thuê thiết bị
          </h2>
          <p className="admin-page-subtitle">
            Quản lý thiết bị đang cho thuê và trả đồ
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="admin-toolbar">
        <div className="admin-search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Tìm mã đơn hoặc tên khách..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="admin-filter-chips">
          <button
            className={`admin-chip ${!statusFilter ? "active" : ""}`}
            onClick={() => setStatusFilter("")}
          >
            Tất cả
          </button>
          <button
            className={`admin-chip ${statusFilter === "in_use" ? "active" : ""}`}
            onClick={() => setStatusFilter("in_use")}
          >
            <Clock size={14} /> Đang thuê
          </button>
          <button
            className={`admin-chip ${statusFilter === "returned_good" ? "active" : ""}`}
            onClick={() => setStatusFilter("returned_good")}
          >
            <CheckCircle size={14} /> Đã trả
          </button>
          <button
            className={`admin-chip ${statusFilter === "returned_damaged" ? "active" : ""}`}
            onClick={() => setStatusFilter("returned_damaged")}
          >
            <AlertTriangle size={14} /> Hư hỏng
          </button>
          <button
            className={`admin-chip ${statusFilter === "lost" ? "active" : ""}`}
            onClick={() => setStatusFilter("lost")}
          >
            <Ban size={14} /> Mất
          </button>
        </div>
      </div>

      {/* Orders with Rental Items */}
      <div className="admin-rentals-list">
        {filteredOrders.length === 0 ? (
          <div className="admin-empty">Không có đơn thuê nào</div>
        ) : (
          filteredOrders.map((order) => {
            const rentalItems = order.items.filter(
              (item) =>
                item.depositPerItem > 0 || item.productCategory === "rental",
            );
            const isExpanded = expandedOrder === order._id;

            return (
              <div key={order._id} className="admin-rental-card">
                {/* Order Header */}
                <div
                  className="admin-rental-card-header"
                  onClick={() =>
                    setExpandedOrder(isExpanded ? null : order._id)
                  }
                >
                  <div className="admin-rental-card-info">
                    <span className="font-mono font-bold text-sm">
                      {order.orderNumber}
                    </span>
                    <span className="flex items-center gap-1 text-sm">
                      <User size={14} />{" "}
                      {order.createdBy?.name || order.createdByName || "—"}
                    </span>
                    <span className="text-xs text-muted">
                      {new Date(order.createdAt).toLocaleString("vi-VN")}
                    </span>
                  </div>
                  <div className="admin-rental-card-status">
                    <span
                      className={`badge ${order.status === "paid" ? "badge-confirmed" : order.status === "cancelled" ? "badge-cancelled" : "badge-pending"}`}
                    >
                      {order.status === "paid"
                        ? "Đã TT"
                        : order.status === "cancelled"
                          ? "Đã hủy"
                          : "Chờ TT"}
                    </span>
                    {isExpanded ? (
                      <ChevronUp size={18} />
                    ) : (
                      <ChevronDown size={18} />
                    )}
                  </div>
                </div>

                {/* Expanded: Rental Items Detail */}
                {isExpanded && (
                  <div className="admin-rental-card-body">
                    <table className="admin-table admin-table-sm">
                      <thead>
                        <tr>
                          <th>Thiết bị</th>
                          <th>SL</th>
                          <th>Giá thuê</th>
                          <th>Tiền cọc</th>
                          <th>Trạng thái</th>
                          <th>Ngày trả</th>
                          <th>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rentalItems.map((item) => (
                          <tr key={item._id}>
                            <td className="font-semibold">
                              {item.productName}
                            </td>
                            <td>{item.quantity}</td>
                            <td>{item.unitPrice.toLocaleString("vi-VN")}đ</td>
                            <td className="font-semibold text-amber-600">
                              {(
                                item.depositPerItem * item.quantity
                              ).toLocaleString("vi-VN")}
                              đ
                            </td>
                            <td>
                              <span
                                className={
                                  RENTAL_STATUS_MAP[item.rentalStatus]?.cls ||
                                  "badge"
                                }
                              >
                                {RENTAL_STATUS_MAP[item.rentalStatus]?.icon}
                                {RENTAL_STATUS_MAP[item.rentalStatus]?.text ||
                                  "—"}
                              </span>
                            </td>
                            <td className="text-sm text-muted">
                              {item.rentalReturnedAt
                                ? new Date(
                                    item.rentalReturnedAt,
                                  ).toLocaleString("vi-VN")
                                : "—"}
                            </td>
                            <td>
                              {item.rentalStatus === "in_use" && (
                                <button
                                  className="admin-btn admin-btn-sm admin-btn-outline"
                                  onClick={() =>
                                    openReturnModal(
                                      order._id,
                                      item._id,
                                      item.rentalStatus,
                                    )
                                  }
                                >
                                  <FileText size={14} /> Xử lý trả
                                </button>
                              )}
                              {item.rentalStatus &&
                                item.rentalStatus !== "in_use" && (
                                  <span className="text-xs text-muted">
                                    {item.rentalDamageFee > 0
                                      ? `Phí hư: ${item.rentalDamageFee.toLocaleString("vi-VN")}đ`
                                      : item.rentalStatus === "returned_good"
                                        ? "Hoàn cọc đủ"
                                        : "Trừ cọc"}
                                  </span>
                                )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {order.refundAmount > 0 && (
                      <div className="admin-rental-refund">
                        <DollarSign size={16} /> Đã hoàn cọc:{" "}
                        <strong>
                          {order.refundAmount.toLocaleString("vi-VN")}đ
                        </strong>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ============ RETURN MODAL ============ */}
      {returnModal && (
        <div
          className="admin-modal-overlay"
          onClick={() => setReturnModal(null)}
        >
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Xử lý trả thiết bị</h3>
              <button onClick={() => setReturnModal(null)}>
                <ChevronUp size={18} />
              </button>
            </div>
            <div className="admin-modal-body">
              <div className="admin-form-group">
                <label>Trạng thái trả *</label>
                <div className="admin-return-status-options">
                  {[
                    {
                      value: "returned_good",
                      label: "Đã trả - Tốt",
                      desc: "Hoàn cọc đầy đủ",
                      icon: <CheckCircle size={18} />,
                      color: "green",
                    },
                    {
                      value: "returned_damaged",
                      label: "Đã trả - Hư hỏng",
                      desc: "Trừ một phần cọc",
                      icon: <AlertTriangle size={18} />,
                      color: "amber",
                    },
                    {
                      value: "lost",
                      label: "Mất đồ",
                      desc: "Trừ toàn bộ cọc",
                      icon: <Ban size={18} />,
                      color: "red",
                    },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      className={`admin-return-option ${returnForm.returnStatus === opt.value ? `active-${opt.color}` : ""}`}
                    >
                      <input
                        type="radio"
                        name="returnStatus"
                        value={opt.value}
                        checked={returnForm.returnStatus === opt.value}
                        onChange={(e) =>
                          setReturnForm({
                            ...returnForm,
                            returnStatus: e.target.value,
                            damageFee: "",
                          })
                        }
                      />
                      <span className="admin-return-option-icon">
                        {opt.icon}
                      </span>
                      <div>
                        <strong>{opt.label}</strong>
                        <small>{opt.desc}</small>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {returnForm.returnStatus === "returned_damaged" && (
                <div className="admin-form-group">
                  <label>Phí hư hỏng (VNĐ)</label>
                  <input
                    type="number"
                    value={returnForm.damageFee}
                    onChange={(e) =>
                      setReturnForm({
                        ...returnForm,
                        damageFee: e.target.value,
                      })
                    }
                    min="0"
                    placeholder="Số tiền trừ vào cọc..."
                  />
                </div>
              )}

              <div className="admin-form-group">
                <label>Ghi chú</label>
                <textarea
                  value={returnForm.note}
                  onChange={(e) =>
                    setReturnForm({ ...returnForm, note: e.target.value })
                  }
                  rows={2}
                  placeholder="Ghi chú tình trạng trả đồ..."
                />
              </div>

              <div className="admin-modal-footer">
                <button
                  className="admin-btn admin-btn-outline"
                  onClick={() => setReturnModal(null)}
                >
                  Hủy
                </button>
                <button
                  className="admin-btn admin-btn-primary"
                  onClick={handleReturnItem}
                  disabled={submitting}
                >
                  {submitting ? "Đang xử lý..." : "Xác nhận trả đồ"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
