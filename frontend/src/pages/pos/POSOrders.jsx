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
} from "lucide-react";

export default function POSOrders() {
  const [products, setProducts] = useState({});
  const [allProducts, setAllProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [bookingId, setBookingId] = useState("");
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
        bookingId: bookingId || undefined,
        paymentMethod,
        note,
      });
      toast.success(res.data.message);
      setCart([]);
      setBookingId("");
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
          p.category.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : products[activeCategory] || [];

  const categories = [
    { key: "drink", label: "🥤 Đồ uống" },
    { key: "snack", label: "🍿 Đồ ăn" },
    { key: "consumable", label: "🏸 Vật tư" },
    { key: "rental", label: "🔑 Thuê đồ" },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
        <ShoppingCart size={24} className="text-purple-600" />
        Bán dịch vụ tại quầy
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Product Selection - Left 2/3 */}
        <div className="lg:col-span-2 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Tìm sản phẩm..."
              className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Category Tabs */}
          {!searchQuery && (
            <div className="flex gap-1 bg-white rounded-lg p-1 shadow-sm border overflow-x-auto">
              {categories.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(cat.key)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition ${
                    activeCategory === cat.key
                      ? "bg-purple-600 text-white"
                      : "hover:bg-gray-100 text-gray-600"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}

          {/* Product Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {filteredProducts.map((product) => (
              <button
                key={product._id}
                onClick={() => addToCart(product)}
                disabled={
                  !product.isActive ||
                  (product.stockQuantity <= 0 && product.category !== "rental")
                }
                className={`bg-white rounded-xl p-3 border shadow-sm text-left transition hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${
                  cart.find((i) => i._id === product._id)
                    ? "border-purple-400 ring-1 ring-purple-400"
                    : "border-gray-200"
                }`}
              >
                <div className="font-semibold text-sm line-clamp-2">
                  {product.name}
                </div>
                <div className="text-purple-700 font-bold mt-1">
                  {product.price.toLocaleString()}đ
                </div>
                {product.isRentable && (
                  <div className="text-xs text-orange-600 mt-0.5">
                    Cọc: {product.depositAmount.toLocaleString()}đ
                  </div>
                )}
                <div className="text-xs text-gray-400 mt-1">
                  {product.category === "rental"
                    ? `Còn: ${product.stockQuantity}`
                    : `Kho: ${product.stockQuantity}`}
                </div>
                {cart.find((i) => i._id === product._id) && (
                  <div className="mt-1 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full inline-block">
                    x{cart.find((i) => i._id === product._id).quantity}
                  </div>
                )}
              </button>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              Không có sản phẩm nào
            </div>
          )}
        </div>

        {/* Cart - Right 1/3 */}
        <div className="bg-white rounded-xl p-4 shadow-sm border flex flex-col">
          <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <ShoppingCart size={18} /> Giỏ hàng ({cart.length})
          </h3>

          {cart.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              Chọn sản phẩm bên trái để thêm vào giỏ
            </div>
          ) : (
            <>
              <div className="flex-1 space-y-2 overflow-y-auto max-h-64">
                {cart.map((item) => (
                  <div
                    key={item._id}
                    className="flex items-center justify-between py-2 border-b border-gray-100"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {item.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {item.price.toLocaleString()}đ
                        {item.isRentable &&
                          ` + cọc ${item.depositAmount.toLocaleString()}đ`}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateQuantity(item._id, -1)}
                        className="p-1 hover:bg-gray-100 rounded text-gray-500"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-8 text-center font-medium text-sm">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item._id, 1)}
                        className="p-1 hover:bg-gray-100 rounded text-gray-500"
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

              {/* Totals */}
              <div className="border-t pt-3 mt-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Tạm tính:</span>
                  <span>{cartSubtotal.toLocaleString()}đ</span>
                </div>
                {cartDeposit > 0 && (
                  <div className="flex justify-between">
                    <span className="text-orange-500">Tiền cọc:</span>
                    <span className="text-orange-600">
                      {cartDeposit.toLocaleString()}đ
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-1 border-t">
                  <span>Tổng:</span>
                  <span className="text-purple-700">
                    {cartTotal.toLocaleString()}đ
                  </span>
                </div>
              </div>

              {/* Booking link */}
              <div className="mt-3">
                <input
                  type="text"
                  placeholder="Gắn với booking (mã ID, tuỳ chọn)"
                  value={bookingId}
                  onChange={(e) => setBookingId(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              {/* Payment */}
              <div className="mt-2 flex gap-2">
                <label
                  className={`flex-1 text-center py-2 rounded-lg text-sm font-medium cursor-pointer transition ${
                    paymentMethod === "cash"
                      ? "bg-green-600 text-white"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  <input
                    type="radio"
                    name="pm"
                    value="cash"
                    checked={paymentMethod === "cash"}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="hidden"
                  />
                  💵 TM
                </label>
                <label
                  className={`flex-1 text-center py-2 rounded-lg text-sm font-medium cursor-pointer transition ${
                    paymentMethod === "transfer"
                      ? "bg-green-600 text-white"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  <input
                    type="radio"
                    name="pm"
                    value="transfer"
                    checked={paymentMethod === "transfer"}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="hidden"
                  />
                  📱 CK
                </label>
              </div>

              {/* Note */}
              <input
                type="text"
                placeholder="Ghi chú..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm mt-2 focus:ring-2 focus:ring-purple-500 outline-none"
              />

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white py-3 rounded-xl font-bold mt-3 transition flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <CreditCard size={18} />
                    Thanh toán {cartTotal.toLocaleString()}đ
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
