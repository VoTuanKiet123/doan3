import { useEffect, useState } from "react";
import api from "../../services/api";
import toast from "react-hot-toast";
import {
  Package,
  Plus,
  X,
  Pencil,
  Trash2,
  ArrowUpCircle,
  Coffee,
  Cookie,
  Zap,
  Wrench,
  AlertTriangle,
  Search,
} from "lucide-react";

// ============ CONSTANTS ============
const CATEGORIES = [
  { value: "drink", label: "Đồ uống", icon: <Coffee size={16} /> },
  { value: "snack", label: "Đồ ăn nhẹ", icon: <Cookie size={16} /> },
  { value: "consumable", label: "Vật tư tiêu hao", icon: <Zap size={16} /> },
  { value: "rental", label: "Cho thuê thiết bị", icon: <Wrench size={16} /> },
];

const CATEGORY_COLORS = {
  drink: "bg-blue-100 text-blue-700",
  snack: "bg-orange-100 text-orange-700",
  consumable: "bg-purple-100 text-purple-700",
  rental: "bg-amber-100 text-amber-700",
};

const EMPTY_FORM = {
  name: "",
  category: "drink",
  price: "",
  unit: "cái",
  stockQuantity: "0",
  lowStockThreshold: "5",
  isRentable: false,
  depositAmount: "0",
  description: "",
};

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [showRestockModal, setShowRestockModal] = useState(null);
  const [restockQty, setRestockQty] = useState("");

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await api.get("/products?includeInactive=true");
      setProducts(res.data.data);
    } catch {
      toast.error("Không tải được danh sách sản phẩm");
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      category: product.category,
      price: product.price.toString(),
      unit: product.unit,
      stockQuantity: product.stockQuantity.toString(),
      lowStockThreshold: product.lowStockThreshold.toString(),
      isRentable: product.isRentable,
      depositAmount: (product.depositAmount || 0).toString(),
      description: product.description || "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        name: form.name,
        category: form.category,
        price: Number(form.price),
        unit: form.unit,
        stockQuantity: Number(form.stockQuantity),
        lowStockThreshold: Number(form.lowStockThreshold),
        isRentable: form.isRentable || form.category === "rental",
        depositAmount: Number(form.depositAmount),
        description: form.description,
      };

      if (editingProduct) {
        await api.put(`/products/${editingProduct._id}`, payload);
        toast.success("Cập nhật sản phẩm thành công!");
      } else {
        await api.post("/products", payload);
        toast.success("Thêm sản phẩm thành công!");
      }

      setShowModal(false);
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi lưu sản phẩm");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (product) => {
    if (!confirm(`Ngừng bán "${product.name}"?`)) return;
    try {
      await api.delete(`/products/${product._id}`);
      toast.success("Đã ngừng bán sản phẩm");
      fetchProducts();
    } catch {
      toast.error("Lỗi xóa sản phẩm");
    }
  };

  const handleRestock = async () => {
    if (!restockQty || Number(restockQty) <= 0) {
      return toast.error("Số lượng phải > 0");
    }
    try {
      await api.put(`/products/${showRestockModal._id}/restock`, {
        quantity: Number(restockQty),
      });
      toast.success(`Đã nhập thêm ${restockQty} ${showRestockModal.unit}`);
      setShowRestockModal(null);
      setRestockQty("");
      fetchProducts();
    } catch {
      toast.error("Lỗi nhập hàng");
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter ? p.category === catFilter : true;
    return matchSearch && matchCat;
  });

  const lowStockCount = products.filter(
    (p) => p.isActive && p.stockQuantity <= p.lowStockThreshold,
  ).length;

  if (loading) return <div className="admin-loading">Đang tải...</div>;

  return (
    <div className="admin-products">
      <div className="admin-page-header">
        <div>
          <h2 className="admin-page-title">
            <Package size={22} /> Quản lý Sản phẩm & Kho
          </h2>
          <p className="admin-page-subtitle">
            {products.length} sản phẩm
            {lowStockCount > 0 && (
              <span className="admin-badge-danger ml-2">
                <AlertTriangle size={12} /> {lowStockCount} sắp hết
              </span>
            )}
          </p>
        </div>
        <button
          className="admin-btn admin-btn-primary"
          onClick={openCreateModal}
        >
          <Plus size={16} /> Thêm sản phẩm
        </button>
      </div>

      {/* Filters */}
      <div className="admin-toolbar">
        <div className="admin-search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Tìm sản phẩm..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="admin-filter-chips">
          <button
            className={`admin-chip ${!catFilter ? "active" : ""}`}
            onClick={() => setCatFilter("")}
          >
            Tất cả
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              className={`admin-chip ${catFilter === cat.value ? "active" : ""}`}
              onClick={() => setCatFilter(cat.value)}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Low Stock Alert Banner */}
      {lowStockCount > 0 && (
        <div className="admin-alert admin-alert-warning">
          <AlertTriangle size={18} />
          <span>
            Có {lowStockCount} sản phẩm sắp hết hàng. Vui lòng nhập thêm để đảm
            bảo phục vụ khách hàng.
          </span>
        </div>
      )}

      {/* Product Table */}
      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Sản phẩm</th>
              <th>Danh mục</th>
              <th>Giá bán</th>
              <th>Tồn kho</th>
              <th>Ngưỡng</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product) => {
              const isLowStock =
                product.stockQuantity <= product.lowStockThreshold;
              const isOutOfStock = product.stockQuantity <= 0;
              return (
                <tr
                  key={product._id}
                  className={!product.isActive ? "opacity-50" : ""}
                >
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="admin-product-avatar">
                        {CATEGORIES.find((c) => c.value === product.category)
                          ?.icon || <Package size={16} />}
                      </div>
                      <div>
                        <div className="font-semibold">{product.name}</div>
                        <div className="text-xs text-muted">{product.unit}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span
                      className={`badge ${CATEGORY_COLORS[product.category]}`}
                    >
                      {
                        CATEGORIES.find((c) => c.value === product.category)
                          ?.label
                      }
                    </span>
                    {product.isRentable && (
                      <span className="badge badge-rental ml-1">Thuê</span>
                    )}
                  </td>
                  <td className="font-semibold">
                    {product.price.toLocaleString("vi-VN")}đ
                    {product.isRentable && product.depositAmount > 0 && (
                      <div className="text-xs text-muted">
                        Cọc: {product.depositAmount.toLocaleString("vi-VN")}đ
                      </div>
                    )}
                  </td>
                  <td>
                    <span
                      className={`font-bold ${isOutOfStock ? "text-red-500" : isLowStock ? "text-amber-500" : "text-green-600"}`}
                    >
                      {product.stockQuantity}
                    </span>
                  </td>
                  <td className="text-sm text-muted">
                    {product.lowStockThreshold}
                  </td>
                  <td>
                    <span
                      className={`badge ${isOutOfStock ? "badge-cancelled" : isLowStock ? "badge-pending" : "badge-confirmed"}`}
                    >
                      {isOutOfStock
                        ? "Hết hàng"
                        : isLowStock
                          ? "Sắp hết"
                          : "Còn hàng"}
                    </span>
                  </td>
                  <td>
                    <div className="admin-actions">
                      <button
                        className="admin-btn-icon"
                        title="Nhập thêm hàng"
                        onClick={() => {
                          setShowRestockModal(product);
                          setRestockQty("");
                        }}
                      >
                        <ArrowUpCircle size={16} />
                      </button>
                      <button
                        className="admin-btn-icon"
                        title="Sửa"
                        onClick={() => openEditModal(product)}
                      >
                        <Pencil size={16} />
                      </button>
                      {product.isActive && (
                        <button
                          className="admin-btn-icon danger"
                          title="Ngừng bán"
                          onClick={() => handleDelete(product)}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ============ CREATE/EDIT MODAL ============ */}
      {showModal && (
        <div
          className="admin-modal-overlay"
          onClick={() => setShowModal(false)}
        >
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>{editingProduct ? "Sửa sản phẩm" : "Thêm sản phẩm mới"}</h3>
              <button onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="admin-modal-body">
              <div className="admin-form-group">
                <label>Tên sản phẩm *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  placeholder="VD: Nước suối Aquafina"
                />
              </div>

              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Danh mục *</label>
                  <select
                    value={form.category}
                    onChange={(e) => {
                      const cat = e.target.value;
                      setForm({
                        ...form,
                        category: cat,
                        isRentable: cat === "rental",
                      });
                    }}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="admin-form-group">
                  <label>Đơn vị tính</label>
                  <input
                    type="text"
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    placeholder="cái, chai, lon..."
                  />
                </div>
              </div>

              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Giá bán (VNĐ) *</label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) =>
                      setForm({ ...form, price: e.target.value })
                    }
                    required
                    min="0"
                    placeholder="10000"
                  />
                </div>
                <div className="admin-form-group">
                  <label>Tồn kho ban đầu</label>
                  <input
                    type="number"
                    value={form.stockQuantity}
                    onChange={(e) =>
                      setForm({ ...form, stockQuantity: e.target.value })
                    }
                    min="0"
                  />
                </div>
              </div>

              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Ngưỡng cảnh báo tồn thấp</label>
                  <input
                    type="number"
                    value={form.lowStockThreshold}
                    onChange={(e) =>
                      setForm({ ...form, lowStockThreshold: e.target.value })
                    }
                    min="0"
                  />
                </div>
                {form.category === "rental" && (
                  <div className="admin-form-group">
                    <label>Tiền cọc (VNĐ) *</label>
                    <input
                      type="number"
                      value={form.depositAmount}
                      onChange={(e) =>
                        setForm({ ...form, depositAmount: e.target.value })
                      }
                      required
                      min="0"
                      placeholder="500000"
                    />
                  </div>
                )}
              </div>

              <div className="admin-form-group">
                <label>Mô tả</label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  rows={2}
                  placeholder="Mô tả ngắn về sản phẩm..."
                />
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-btn admin-btn-outline"
                  onClick={() => setShowModal(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="admin-btn admin-btn-primary"
                  disabled={submitting}
                >
                  {submitting
                    ? "Đang lưu..."
                    : editingProduct
                      ? "Cập nhật"
                      : "Thêm mới"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============ RESTOCK MODAL ============ */}
      {showRestockModal && (
        <div
          className="admin-modal-overlay"
          onClick={() => setShowRestockModal(null)}
        >
          <div
            className="admin-modal admin-modal-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-modal-header">
              <h3>Nhập thêm hàng: {showRestockModal.name}</h3>
              <button onClick={() => setShowRestockModal(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="admin-modal-body">
              <p className="text-sm text-muted mb-3">
                Tồn kho hiện tại:{" "}
                <strong>{showRestockModal.stockQuantity}</strong>{" "}
                {showRestockModal.unit}
              </p>
              <div className="admin-form-group">
                <label>Số lượng nhập thêm *</label>
                <input
                  type="number"
                  value={restockQty}
                  onChange={(e) => setRestockQty(e.target.value)}
                  min="1"
                  placeholder="Nhập số lượng..."
                  autoFocus
                />
              </div>
              <div className="admin-modal-footer">
                <button
                  className="admin-btn admin-btn-outline"
                  onClick={() => setShowRestockModal(null)}
                >
                  Hủy
                </button>
                <button
                  className="admin-btn admin-btn-primary"
                  onClick={handleRestock}
                >
                  <ArrowUpCircle size={16} /> Nhập hàng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
