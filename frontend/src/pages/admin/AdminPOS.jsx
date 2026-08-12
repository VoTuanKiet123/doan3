import { useEffect, useState } from "react";
import api from "../../services/api";
import toast from "react-hot-toast";
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Search,
  Coffee,
  Cookie,
  Zap,
  Wrench,
  Banknote,
  X,
  CheckCircle,
  ClipboardList,
  Package,
} from "lucide-react";

// ============ CONSTANTS ============
const CATEGORY_ICONS = {
  drink: <Coffee size={16} />,
  snack: <Cookie size={16} />,
  consumable: <Zap size={16} />,
  rental: <Wrench size={16} />,
};

const CATEGORY_LABELS = {
  drink: "Đồ uống",
  snack: "Đồ ăn nhẹ",
  consumable: "Vật tư tiêu hao",
  rental: "Cho thuê",
};

const CATEGORY_COLORS = {
  drink: "bg-blue-100 text-blue-700",
  snack: "bg-orange-100 text-orange-700",
  consumable: "bg-purple-100 text-purple-700",
  rental: "bg-amber-100 text-amber-700",
};

export default function AdminPOS() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [orderNote, setOrderNote] = useState("");
  const [recentOrders, setRecentOrders] = useState([]);

  useEffect(() => {
    fetchProducts();
    fetchRecentOrders();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await api.get("/products?includeInactive=false");
      setProducts(res.data.data);
    } catch (err) {
      toast.error("Không tải được danh sách sản phẩm");
    }
  };

  const fetchRecentOrders = async () => {
    try {
      const res = await api.get("/service-orders/admin/all?limit=10");
      setRecentOrders(res.data.data);
    } catch {
      // Silently fail
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter ? p.category === categoryFilter : true;
    return matchSearch && matchCat && p.isActive;
  });

  const addToCart = (product) => {
    if (product.stockQuantity <= 0) {
      toast.error(`${product.name} đã hết hàng!`);
      return;
    }
    setCart((prev) => {
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

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item.product !== productId));
  };

  const updateQuantity = (productId, delta) => {
    setCart((prev) =>
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

  const cartSubtotal = cart.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );
  const cartDeposit = cart.reduce(
    (sum, item) => sum + item.depositPerItem * item.quantity,
    0,
  );
  const cartTotal = cartSubtotal + cartDeposit;

  const handleSubmitOrder = async () => {
    if (cart.length === 0) return toast.error("Giỏ hàng trống!");
    setSubmitting(true);
    try {
      const items = cart.map((item) => ({
        product: item.product,
        quantity: item.quantity,
      }));
      const res = await api.post("/service-orders", {
        items,
        note: orderNote,
        orderType: "pos",
      });
      toast.success("Tạo đơn thành công!");

      // Nếu muốn auto-pay luôn
      if (showCheckout) {
        await api.put(`/service-orders/${res.data.data._id}/pay`, {
          paymentMethod,
        });
        toast.success("Đã thanh toán!");
      }

      setCart([]);
      setShowCheckout(false);
      setOrderNote("");
      fetchProducts();
      fetchRecentOrders();
    } catch (err) {
      const msg = err.response?.data?.message || "Lỗi tạo đơn";
      toast.error(msg);
      if (err.response?.data?.errors) {
        err.response.data.errors.forEach((e) => toast.error(e.message));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const statusMap = {
    pending: { text: "Chờ TT", cls: "badge badge-pending" },
    paid: { text: "Đã TT", cls: "badge badge-confirmed" },
    cancelled: { text: "Đã hủy", cls: "badge badge-cancelled" },
  };

  return (
    <div className="admin-pos">
      <div className="admin-pos-header">
        <div>
          <h2 className="admin-page-title">
            <ShoppingCart size={22} /> Bán hàng tại quầy (POS)
          </h2>
          <p className="admin-page-subtitle">
            Tạo đơn nhanh cho khách vãng lai mua đồ uống, vật tư, thuê vợt...
          </p>
        </div>
      </div>

      <div className="admin-pos-grid">
        {/* ===== LEFT: PRODUCT LIST ===== */}
        <div className="admin-pos-products">
          {/* Search & Filter */}
          <div className="admin-pos-toolbar">
            <div className="admin-pos-search">
              <Search size={16} />
              <input
                type="text"
                placeholder="Tìm sản phẩm..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="admin-pos-categories">
              <button
                className={`admin-pos-cat-btn ${!categoryFilter ? "active" : ""}`}
                onClick={() => setCategoryFilter("")}
              >
                Tất cả
              </button>
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  className={`admin-pos-cat-btn ${categoryFilter === key ? "active" : ""}`}
                  onClick={() => setCategoryFilter(key)}
                >
                  {CATEGORY_ICONS[key]} {label}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div className="admin-pos-product-grid">
            {filteredProducts.map((product) => (
              <button
                key={product._id}
                className={`admin-pos-product-card ${product.stockQuantity <= 0 ? "out-of-stock" : ""}`}
                onClick={() => addToCart(product)}
                disabled={product.stockQuantity <= 0}
              >
                <span
                  className={`admin-pos-cat-tag ${CATEGORY_COLORS[product.category]}`}
                >
                  {CATEGORY_ICONS[product.category]}{" "}
                  {CATEGORY_LABELS[product.category]}
                </span>
                <span className="admin-pos-product-name">{product.name}</span>
                <span className="admin-pos-product-price">
                  {product.price.toLocaleString("vi-VN")}đ/{product.unit}
                </span>
                <span
                  className={`admin-pos-product-stock ${product.stockQuantity <= product.lowStockThreshold ? "low" : ""}`}
                >
                  {product.stockQuantity <= 0
                    ? "HẾT HÀNG"
                    : `Còn: ${product.stockQuantity}`}
                </span>
                {product.isRentable && (
                  <span className="admin-pos-deposit-tag">
                    Cọc: {product.depositAmount.toLocaleString("vi-VN")}đ
                  </span>
                )}
              </button>
            ))}
          </div>
          {filteredProducts.length === 0 && (
            <div className="admin-empty">Không tìm thấy sản phẩm nào</div>
          )}
        </div>

        {/* ===== RIGHT: CART ===== */}
        <div className="admin-pos-cart">
          <h3 className="admin-pos-cart-title">
            <ClipboardList size={18} /> Giỏ hàng ({cart.length})
          </h3>

          {cart.length === 0 ? (
            <div className="admin-pos-cart-empty">
              <Package size={48} strokeWidth={1} />
              <p>Chọn sản phẩm bên trái</p>
              <span>Nhấp vào sản phẩm để thêm vào giỏ</span>
            </div>
          ) : (
            <>
              <div className="admin-pos-cart-items">
                {cart.map((item) => (
                  <div key={item.product} className="admin-pos-cart-item">
                    <div className="admin-pos-cart-item-info">
                      <span className="admin-pos-cart-item-name">
                        {item.productName}
                      </span>
                      <span className="admin-pos-cart-item-price">
                        {item.unitPrice.toLocaleString("vi-VN")}đ/{item.unit}
                      </span>
                      {item.depositPerItem > 0 && (
                        <span className="admin-pos-cart-item-deposit">
                          + Cọc:{" "}
                          {(item.depositPerItem * item.quantity).toLocaleString(
                            "vi-VN",
                          )}
                          đ
                        </span>
                      )}
                    </div>
                    <div className="admin-pos-cart-item-qty">
                      <button onClick={() => updateQuantity(item.product, -1)}>
                        <Minus size={14} />
                      </button>
                      <span>{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.product, 1)}>
                        <Plus size={14} />
                      </button>
                    </div>
                    <div className="admin-pos-cart-item-total">
                      {(item.unitPrice * item.quantity).toLocaleString("vi-VN")}
                      đ
                    </div>
                    <button
                      className="admin-pos-cart-item-remove"
                      onClick={() => removeFromCart(item.product)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="admin-pos-cart-summary">
                <div className="admin-pos-cart-row">
                  <span>Tạm tính</span>
                  <span>{cartSubtotal.toLocaleString("vi-VN")}đ</span>
                </div>
                {cartDeposit > 0 && (
                  <div className="admin-pos-cart-row deposit">
                    <span>Tiền cọc</span>
                    <span>{cartDeposit.toLocaleString("vi-VN")}đ</span>
                  </div>
                )}
                <div className="admin-pos-cart-row total">
                  <span>Tổng cộng</span>
                  <span>{cartTotal.toLocaleString("vi-VN")}đ</span>
                </div>
              </div>

              {/* Note */}
              <input
                type="text"
                className="admin-pos-note-input"
                placeholder="Ghi chú đơn hàng (tùy chọn)..."
                value={orderNote}
                onChange={(e) => setOrderNote(e.target.value)}
              />

              {/* Action Buttons */}
              {!showCheckout ? (
                <div className="admin-pos-cart-actions">
                  <button
                    className="admin-btn admin-btn-outline"
                    onClick={() => setCart([])}
                  >
                    <X size={16} /> Xóa giỏ
                  </button>
                  <button
                    className="admin-btn admin-btn-primary"
                    onClick={() => setShowCheckout(true)}
                  >
                    <Banknote size={16} /> Thanh toán
                  </button>
                </div>
              ) : (
                <div className="admin-pos-checkout">
                  <h4>Chọn phương thức thanh toán</h4>
                  <div className="admin-pos-payment-methods">
                    <label
                      className={`admin-pos-pm ${paymentMethod === "cash" ? "active" : ""}`}
                    >
                      <input
                        type="radio"
                        name="pm"
                        value="cash"
                        checked={paymentMethod === "cash"}
                        onChange={() => setPaymentMethod("cash")}
                      />
                      <Banknote size={18} /> Tiền mặt
                    </label>
                    <label
                      className={`admin-pos-pm ${paymentMethod === "transfer" ? "active" : ""}`}
                    >
                      <input
                        type="radio"
                        name="pm"
                        value="transfer"
                        checked={paymentMethod === "transfer"}
                        onChange={() => setPaymentMethod("transfer")}
                      />
                      <CheckCircle size={18} /> Chuyển khoản
                    </label>
                  </div>
                  <div className="admin-pos-cart-actions">
                    <button
                      className="admin-btn admin-btn-outline"
                      onClick={() => setShowCheckout(false)}
                    >
                      Quay lại
                    </button>
                    <button
                      className="admin-btn admin-btn-primary"
                      onClick={handleSubmitOrder}
                      disabled={submitting}
                    >
                      {submitting
                        ? "Đang xử lý..."
                        : `Xác nhận (${cartTotal.toLocaleString("vi-VN")}đ)`}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ===== RECENT ORDERS ===== */}
      <div className="admin-pos-recent">
        <h3 className="admin-pos-recent-title">
          <ClipboardList size={18} /> Đơn hàng gần đây
        </h3>
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Mã đơn</th>
                <th>Khách</th>
                <th>Sản phẩm</th>
                <th>Tổng tiền</th>
                <th>Trạng thái</th>
                <th>Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr key={order._id}>
                  <td className="font-mono text-sm">{order.orderNumber}</td>
                  <td>{order.createdBy?.name || order.createdByName || "—"}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {order.items.slice(0, 3).map((item) => (
                        <span
                          key={item._id}
                          className="text-xs bg-gray-100 px-2 py-0.5 rounded-full"
                        >
                          {item.productName} x{item.quantity}
                        </span>
                      ))}
                      {order.items.length > 3 && (
                        <span className="text-xs text-muted">
                          +{order.items.length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="font-semibold">
                    {order.totalAmount.toLocaleString("vi-VN")}đ
                  </td>
                  <td>
                    <span className={statusMap[order.status]?.cls || "badge"}>
                      {statusMap[order.status]?.text || order.status}
                    </span>
                  </td>
                  <td className="text-sm text-muted">
                    {new Date(order.createdAt).toLocaleString("vi-VN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
