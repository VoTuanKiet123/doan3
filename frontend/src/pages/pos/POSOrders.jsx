import { useState, useEffect } from "react";
import api from "../../services/api";
import toast from "react-hot-toast";
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Search,
  Package,
  ArrowRight,
} from "lucide-react";

const categoryConfig = {
  drink: { label: "🥤 Đồ uống", color: "#3b82f6" },
  snack: { label: "🍿 Đồ ăn", color: "#f59e0b" },
  consumable: { label: "🏸 Vật tư", color: "#10b981" },
  rental: { label: "🔑 Thuê đồ", color: "#8b5cf6" },
};

export default function POSOrders() {
  const [products, setProducts] = useState({});
  const [allProducts, setAllProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeCategory, setActiveCategory] = useState("drink");

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await api.get("/pos/top-products");
      setProducts(res.data.grouped);
      setAllProducts(res.data.products);
    } catch (err) {
      toast.error("Không thể tải danh sách sản phẩm");
    }
  };

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item._id === product._id);
      if (existing) {
        return prev.map((item) =>
          item._id === product._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
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
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const cartTotal = cart.reduce(
    (sum, item) =>
      sum +
      item.price * item.quantity +
      (item.isRentable ? item.depositAmount * item.quantity : 0),
    0
  );

  const cartSubtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const cartDeposit = cart.reduce(
    (sum, item) =>
      sum + (item.isRentable ? item.depositAmount * item.quantity : 0),
    0
  );

  const handleSubmit = async () => {
    if (cart.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 sản phẩm");
      return;
    }

    setSubmitting(true);
    try {
      const items = cart.map((item) => ({
        product: item._id,
        quantity: item.quantity,
      }));

      const res = await api.post("/pos/service-orders", {
        items,
        paymentMethod,
        note,
      });
      toast.success(res.data.message);
      setCart([]);
      setNote("");
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi tạo đơn");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducts = searchQuery
    ? allProducts.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : products[activeCategory] || [];

  const categories = Object.entries(categoryConfig);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Page Header */}
      <div
        style={{
          background: "linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)",
          borderRadius: 16,
          padding: "20px 24px",
          color: "white",
          display: "flex",
          alignItems: "center",
          gap: 14,
          boxShadow: "0 6px 20px rgba(139,92,246,0.35)",
        }}
      >
        <div
          style={{
            width: 50,
            height: 50,
            borderRadius: 14,
            background: "rgba(255,255,255,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ShoppingCart size={26} />
        </div>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>
            Bán dịch vụ tại quầy
          </h1>
          <p style={{ fontSize: 13, opacity: 0.85, margin: "2px 0 0" }}>
            Bán hàng không gắn với phiên chơi
          </p>
        </div>
      </div>

      {/* Info box */}
      <div
        style={{
          background: "#eff6ff",
          border: "1px solid #bfdbfe",
          borderRadius: 12,
          padding: "10px 16px",
          fontSize: 13,
          color: "#1e40af",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        ℹ️ Dành cho khách vãng lai ghé mua đồ. Dịch vụ gắn với phiên chơi sân
        → thêm trong <strong>Check-in</strong>.
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 340px",
          gap: 16,
          alignItems: "start",
        }}
      >
        {/* Left: Product selection */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Search */}
          <div style={{ position: "relative" }}>
            <Search
              size={17}
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#9ca3af",
              }}
            />
            <input
              type="text"
              placeholder="Tìm sản phẩm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                paddingLeft: 38,
                paddingRight: 16,
                paddingTop: 10,
                paddingBottom: 10,
                border: "1.5px solid #e9d5ff",
                borderRadius: 10,
                fontSize: 13,
                outline: "none",
                fontFamily: "inherit",
                background: "white",
                boxSizing: "border-box",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#8b5cf6")}
              onBlur={(e) => (e.target.style.borderColor = "#e9d5ff")}
            />
          </div>

          {/* Category tabs */}
          {!searchQuery && (
            <div
              style={{
                display: "flex",
                gap: 6,
                background: "white",
                borderRadius: 12,
                padding: "6px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                border: "1px solid #e9d5ff",
                overflowX: "auto",
              }}
            >
              {categories.map(([key, cat]) => (
                <button
                  key={key}
                  onClick={() => setActiveCategory(key)}
                  style={{
                    padding: "7px 14px",
                    borderRadius: 8,
                    border: "none",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "all 0.2s",
                    fontFamily: "inherit",
                    background:
                      activeCategory === key ? "#7c3aed" : "transparent",
                    color: activeCategory === key ? "white" : "#6b7280",
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}

          {/* Product Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
              gap: 10,
            }}
          >
            {filteredProducts.map((product) => {
              const inCart = cart.find((i) => i._id === product._id);
              const isDisabled =
                !product.isActive ||
                (product.stockQuantity <= 0 && product.category !== "rental");
              return (
                <button
                  key={product._id}
                  onClick={() => !isDisabled && addToCart(product)}
                  disabled={isDisabled}
                  style={{
                    background: inCart
                      ? "linear-gradient(135deg, #faf5ff, #ede9fe)"
                      : "white",
                    borderRadius: 12,
                    border: inCart
                      ? "2px solid #8b5cf6"
                      : "1.5px solid #e5e7eb",
                    padding: "12px 10px",
                    textAlign: "left",
                    cursor: isDisabled ? "not-allowed" : "pointer",
                    opacity: isDisabled ? 0.5 : 1,
                    transition: "all 0.2s",
                    boxShadow: inCart
                      ? "0 4px 12px rgba(139,92,246,0.2)"
                      : "0 1px 4px rgba(0,0,0,0.05)",
                    fontFamily: "inherit",
                  }}
                  onMouseEnter={(e) => {
                    if (!isDisabled && !inCart) {
                      e.currentTarget.style.borderColor = "#c4b5fd";
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(139,92,246,0.15)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!inCart) {
                      e.currentTarget.style.borderColor = "#e5e7eb";
                      e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.05)";
                    }
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 13,
                      color: "#1f2937",
                      marginBottom: 4,
                      lineHeight: 1.3,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {product.name}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: "#7c3aed",
                      marginTop: 2,
                    }}
                  >
                    {product.price.toLocaleString()}đ
                  </div>
                  {product.isRentable && (
                    <div style={{ fontSize: 10, color: "#f59e0b", marginTop: 2 }}>
                      Cọc: {product.depositAmount.toLocaleString()}đ
                    </div>
                  )}
                  <div
                    style={{
                      fontSize: 10,
                      color: "#9ca3af",
                      marginTop: 2,
                    }}
                  >
                    Kho: {product.stockQuantity}
                  </div>
                  {inCart && (
                    <div
                      style={{
                        marginTop: 6,
                        background: "#7c3aed",
                        color: "white",
                        padding: "2px 8px",
                        borderRadius: 99,
                        fontSize: 11,
                        fontWeight: 700,
                        display: "inline-block",
                      }}
                    >
                      x{inCart.quantity}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "40px 20px",
                color: "#9ca3af",
                background: "white",
                borderRadius: 12,
                border: "1.5px dashed #e5e7eb",
              }}
            >
              <Package size={36} style={{ margin: "0 auto 8px", opacity: 0.4 }} />
              <div style={{ fontSize: 14 }}>Không có sản phẩm nào</div>
            </div>
          )}
        </div>

        {/* Right: Cart */}
        <div
          style={{
            background: "white",
            borderRadius: 16,
            padding: 20,
            boxShadow: "0 4px 16px rgba(139,92,246,0.1)",
            border: "1.5px solid #e9d5ff",
            position: "sticky",
            top: 76,
            display: "flex",
            flexDirection: "column",
            gap: 0,
          }}
        >
          <h3
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: "#4c1d95",
              marginBottom: 14,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <ShoppingCart size={18} color="#7c3aed" />
            Giỏ hàng
            {cart.length > 0 && (
              <span
                style={{
                  marginLeft: "auto",
                  background: "#7c3aed",
                  color: "white",
                  borderRadius: 99,
                  width: 22,
                  height: 22,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 800,
                }}
              >
                {cart.length}
              </span>
            )}
          </h3>

          {cart.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "32px 16px",
                color: "#c4b5fd",
              }}
            >
              <ShoppingCart
                size={40}
                style={{ margin: "0 auto 10px", opacity: 0.4 }}
              />
              <div style={{ fontSize: 13, color: "#9ca3af" }}>
                Chọn sản phẩm bên trái
              </div>
            </div>
          ) : (
            <>
              {/* Cart items */}
              <div
                style={{
                  maxHeight: 240,
                  overflowY: "auto",
                  marginBottom: 12,
                }}
              >
                {cart.map((item) => (
                  <div
                    key={item._id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 0",
                      borderBottom: "1px solid #f5f3ff",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#1f2937",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.name}
                      </div>
                      <div style={{ fontSize: 11, color: "#6b7280" }}>
                        {item.price.toLocaleString()}đ
                        {item.isRentable &&
                          ` + cọc ${item.depositAmount.toLocaleString()}đ`}
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        marginLeft: 8,
                      }}
                    >
                      <button
                        onClick={() => updateQuantity(item._id, -1)}
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 8,
                          border: "1px solid #e9d5ff",
                          background: "#faf5ff",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#7c3aed",
                          padding: 0,
                        }}
                      >
                        <Minus size={12} />
                      </button>
                      <span
                        style={{
                          width: 28,
                          textAlign: "center",
                          fontWeight: 700,
                          fontSize: 13,
                          color: "#4c1d95",
                        }}
                      >
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item._id, 1)}
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 8,
                          border: "1px solid #e9d5ff",
                          background: "#faf5ff",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#7c3aed",
                          padding: 0,
                        }}
                      >
                        <Plus size={12} />
                      </button>
                      <button
                        onClick={() => removeFromCart(item._id)}
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 8,
                          border: "none",
                          background: "#fef2f2",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#ef4444",
                          padding: 0,
                          marginLeft: 2,
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div
                style={{
                  borderTop: "1.5px solid #f5f3ff",
                  paddingTop: 12,
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 13,
                    color: "#6b7280",
                    marginBottom: 4,
                  }}
                >
                  <span>Tạm tính:</span>
                  <span>{cartSubtotal.toLocaleString()}đ</span>
                </div>
                {cartDeposit > 0 && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 13,
                      color: "#f59e0b",
                      marginBottom: 4,
                    }}
                  >
                    <span>Tiền cọc:</span>
                    <span>{cartDeposit.toLocaleString()}đ</span>
                  </div>
                )}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 17,
                    fontWeight: 800,
                    color: "#4c1d95",
                    paddingTop: 8,
                    borderTop: "1px solid #e9d5ff",
                    marginTop: 4,
                  }}
                >
                  <span>Tổng cộng:</span>
                  <span>{cartTotal.toLocaleString()}đ</span>
                </div>
              </div>

              {/* Payment method */}
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                {[
                  { value: "cash", label: "💵 Tiền mặt" },
                  { value: "transfer", label: "📱 Chuyển khoản" },
                ].map((pm) => (
                  <label
                    key={pm.value}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "9px",
                      borderRadius: 10,
                      border:
                        paymentMethod === pm.value
                          ? "2px solid #7c3aed"
                          : "1.5px solid #e9d5ff",
                      background:
                        paymentMethod === pm.value ? "#faf5ff" : "white",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 700,
                      color:
                        paymentMethod === pm.value ? "#7c3aed" : "#6b7280",
                      transition: "all 0.2s",
                    }}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={pm.value}
                      checked={paymentMethod === pm.value}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      style={{ display: "none" }}
                    />
                    {pm.label}
                  </label>
                ))}
              </div>

              {/* Note */}
              <input
                type="text"
                placeholder="Ghi chú đơn hàng..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                style={{
                  width: "100%",
                  border: "1.5px solid #e9d5ff",
                  borderRadius: 10,
                  padding: "9px 12px",
                  fontSize: 13,
                  outline: "none",
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                  marginBottom: 12,
                }}
                onFocus={(e) => (e.target.style.borderColor = "#8b5cf6")}
                onBlur={(e) => (e.target.style.borderColor = "#e9d5ff")}
              />

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  width: "100%",
                  background: submitting
                    ? "#e5e7eb"
                    : "linear-gradient(135deg, #7c3aed, #8b5cf6)",
                  color: submitting ? "#9ca3af" : "white",
                  border: "none",
                  borderRadius: 12,
                  padding: "13px",
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: submitting ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  fontFamily: "inherit",
                  boxShadow: submitting
                    ? "none"
                    : "0 4px 14px rgba(139,92,246,0.4)",
                  transition: "all 0.2s",
                }}
              >
                {submitting ? (
                  <>
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        border: "2px solid rgba(255,255,255,0.4)",
                        borderTopColor: "white",
                        animation: "spin 0.8s linear infinite",
                      }}
                    />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <CreditCard size={17} />
                    Thanh toán {cartTotal.toLocaleString()}đ
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
