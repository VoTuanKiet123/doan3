import { useEffect, useState, useRef } from "react";
import api from "../../services/api";
import toast from "react-hot-toast";
import {
  Pencil,
  Trash2,
  PlusCircle,
  Volleyball,
  Image,
  X,
  Upload,
  Link,
} from "lucide-react";

const emptyForm = {
  name: "",
  description: "",
  pricePerHour: "",
  status: "active",
  imageUrls: "",
};

export default function AdminCourts() {
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const fileInputRef = useRef(null);

  const fetchCourts = () => {
    api.get("/courts").then((res) => {
      setCourts(res.data.courts);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchCourts();
  }, []);

  const openAdd = () => {
    setForm(emptyForm);
    setEditId(null);
    setSelectedFiles([]);
    setExistingImages([]);
    setShowModal(true);
  };

  const openEdit = (court) => {
    setForm({
      name: court.name,
      description: court.description || "",
      pricePerHour: court.pricePerHour,
      status: court.status,
      imageUrls: "",
    });
    setEditId(court._id);
    setSelectedFiles([]);
    setExistingImages(court.images || []);
    setShowModal(true);
  };

  const handleFileSelect = (e) => {
    setSelectedFiles((prev) => [...prev, ...Array.from(e.target.files)]);
    e.target.value = "";
  };

  const removeSelectedFile = (index) =>
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  const removeExistingImage = (index) =>
    setExistingImages((prev) => prev.filter((_, i) => i !== index));

  const addImageUrl = () => {
    const url = form.imageUrls?.trim();
    if (!url) return;
    setExistingImages((prev) => [...prev, url]);
    setForm((f) => ({ ...f, imageUrls: "" }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", form.name);
      fd.append("description", form.description || "");
      fd.append("pricePerHour", form.pricePerHour);
      fd.append("status", form.status);
      selectedFiles.forEach((f) => fd.append("images", f));

      const urlImages = existingImages.filter((img) => img.startsWith("http"));
      if (urlImages.length > 0) fd.append("imageUrls", urlImages.join(","));

      const localImages = existingImages.filter(
        (img) => !img.startsWith("http"),
      );
      if (localImages.length > 0)
        fd.append("keepImages", JSON.stringify(localImages));

      if (editId) {
        await api.put(`/courts/${editId}`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Cập nhật sân thành công");
      } else {
        await api.post("/courts", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Thêm sân thành công");
      }
      setShowModal(false);
      fetchCourts();
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi khi lưu");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa sân này?")) return;
    try {
      await api.delete(`/courts/${id}`);
      toast.success("Xóa sân thành công");
      fetchCourts();
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi khi xóa");
    }
  };

  const statusMap = {
    active: "Hoạt động",
    inactive: "Tạm đóng",
    maintenance: "Bảo trì",
  };
  const statusCls = {
    active: "badge badge-active",
    inactive: "badge badge-inactive",
    maintenance: "badge badge-maintenance",
  };

  const allPreviewImages = [
    ...existingImages.map((url) => ({ type: "existing", src: url, key: url })),
    ...selectedFiles.map((file, i) => ({
      type: "file",
      src: URL.createObjectURL(file),
      key: "file-" + i,
      fileIndex: i,
    })),
  ];

  return (
    <div className="admin-page-content">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Quản lý sân</h1>
          <p className="admin-page-subtitle">Thêm, sửa, xóa sân cầu lông</p>
        </div>
        <button
          onClick={openAdd}
          className="admin-header-btn"
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <PlusCircle size={16} /> Thêm sân
        </button>
      </div>

      {loading ? (
        <div className="admin-loading">
          <div className="admin-loading-spinner"></div>
          <span>Đang tải dữ liệu...</span>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Tên sân</th>
                <th>Ảnh</th>
                <th>Mô tả</th>
                <th>Giá/giờ</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {courts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="admin-table-empty">
                    Chưa có sân nào
                  </td>
                </tr>
              ) : (
                courts.map((court) => (
                  <tr key={court._id}>
                    <td
                      className="admin-user-name"
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <Volleyball
                        size={15}
                        style={{ color: "#0D9D57", flexShrink: 0 }}
                      />{" "}
                      {court.name}
                    </td>
                    <td>
                      {court.images?.length > 0 ? (
                        <div style={{ display: "flex", gap: 4 }}>
                          {court.images.slice(0, 3).map((img, i) => (
                            <img
                              key={i}
                              src={img}
                              alt=""
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: 8,
                                objectFit: "cover",
                                border: "2px solid #e2e8f0",
                              }}
                            />
                          ))}
                          {court.images.length > 3 && (
                            <span
                              style={{
                                fontSize: 12,
                                color: "#64748b",
                                alignSelf: "center",
                              }}
                            >
                              +{court.images.length - 3}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="admin-text-secondary">—</span>
                      )}
                    </td>
                    <td className="admin-text-secondary admin-text-truncate">
                      {court.description || "—"}
                    </td>
                    <td className="admin-text-price">
                      {court.pricePerHour?.toLocaleString("vi-VN")}đ
                    </td>
                    <td>
                      <span className={statusCls[court.status]}>
                        {statusMap[court.status]}
                      </span>
                    </td>
                    <td>
                      <div className="admin-action-group">
                        <button
                          onClick={() => openEdit(court)}
                          className="admin-action-btn admin-action-btn--edit"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <Pencil size={13} /> Sửa
                        </button>
                        <button
                          onClick={() => handleDelete(court._id)}
                          className="admin-action-btn admin-action-btn--danger"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <Trash2 size={13} /> Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal" style={{ maxWidth: 560 }}>
            <h2 className="admin-modal-title">
              {editId ? "Sửa sân" : "Thêm sân mới"}
            </h2>
            <form onSubmit={handleSave} className="admin-modal-form">
              <div className="form-group">
                <label className="form-label">Tên sân *</label>
                <input
                  required
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="form-input"
                  placeholder="Sân A1"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Mô tả</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  className="form-input"
                  placeholder="Mô tả sân..."
                  style={{ resize: "none" }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Giá/giờ (đồng) *</label>
                <input
                  required
                  type="number"
                  min="0"
                  value={form.pricePerHour}
                  onChange={(e) =>
                    setForm({ ...form, pricePerHour: e.target.value })
                  }
                  className="form-input"
                  placeholder="50000"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Trạng thái</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="form-input"
                >
                  <option value="active">Hoạt động</option>
                  <option value="inactive">Tạm đóng</option>
                  <option value="maintenance">Bảo trì</option>
                </select>
              </div>

              {/* ===== HÌNH ẢNH ===== */}
              <div className="form-group">
                <label
                  className="form-label"
                  style={{ display: "flex", alignItems: "center", gap: 6 }}
                >
                  <Image size={16} /> Hình ảnh sân
                </label>

                {allPreviewImages.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                      marginBottom: 12,
                    }}
                  >
                    {allPreviewImages.map((img) => (
                      <div
                        key={img.key}
                        style={{ position: "relative", width: 72, height: 72 }}
                      >
                        <img
                          src={img.src}
                          alt=""
                          style={{
                            width: "100%",
                            height: "100%",
                            borderRadius: 10,
                            objectFit: "cover",
                            border: "2px solid #e2e8f0",
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (img.type === "existing") {
                              const idx = existingImages.indexOf(img.src);
                              if (idx > -1) removeExistingImage(idx);
                            } else {
                              removeSelectedFile(img.fileIndex);
                            }
                          }}
                          style={{
                            position: "absolute",
                            top: -6,
                            right: -6,
                            width: 22,
                            height: 22,
                            borderRadius: "50%",
                            background: "#EF4444",
                            color: "#fff",
                            border: "none",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  style={{ display: "none" }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="admin-btn admin-btn--outline"
                  style={{
                    width: "100%",
                    justifyContent: "center",
                    marginBottom: 8,
                  }}
                >
                  <Upload size={14} /> Chọn ảnh từ máy tính
                </button>

                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text"
                    value={form.imageUrls}
                    onChange={(e) =>
                      setForm({ ...form, imageUrls: e.target.value })
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addImageUrl();
                      }
                    }}
                    className="form-input"
                    placeholder="Hoặc dán URL ảnh..."
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={addImageUrl}
                    className="admin-btn admin-btn--outline"
                  >
                    <Link size={14} /> Thêm
                  </button>
                </div>
                <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
                  Hỗ trợ JPG, PNG, GIF, WebP. Tối đa 5MB/ảnh.
                </p>
              </div>

              <div className="admin-modal-actions">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="admin-modal-cancel"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="admin-modal-submit"
                >
                  {saving ? "Đang lưu..." : editId ? "Cập nhật" : "Thêm sân"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
