const Product = require("../models/Product");
const mongoose = require("mongoose");

// ============ HELPERS ============

/**
 * Kiểm tra tồn kho và trả về thông tin chi tiết sản phẩm nào hết/thiếu.
 * Dùng trong transaction trước khi trừ kho.
 */
const validateStock = async (items, session = null) => {
  const errors = [];
  const productUpdates = []; // Lưu các thay đổi kho

  for (const item of items) {
    const product = await Product.findById(item.product).session(
      session || null,
    );
    if (!product) {
      errors.push({
        productId: item.product,
        message: "Sản phẩm không tồn tại",
      });
      continue;
    }
    if (!product.isActive) {
      errors.push({
        productId: item.product,
        message: `Sản phẩm "${product.name}" đã ngừng bán`,
      });
      continue;
    }
    if (product.stockQuantity < item.quantity) {
      errors.push({
        productId: item.product,
        productName: product.name,
        message: `Sản phẩm "${product.name}" chỉ còn ${product.stockQuantity} trong kho (yêu cầu ${item.quantity})`,
        availableStock: product.stockQuantity,
      });
      continue;
    }
    productUpdates.push({ product, quantity: item.quantity });
  }

  return { valid: errors.length === 0, errors, productUpdates };
};

// ============ PUBLIC ENDPOINTS ============

/**
 * @desc    Lấy danh sách sản phẩm đang active (cho khách xem)
 * @route   GET /api/products
 */
const getProducts = async (req, res) => {
  try {
    const { category, search, includeInactive } = req.query;
    const filter = {};

    // Mặc định chỉ lấy sản phẩm active, trừ khi admin yêu cầu includeInactive
    if (includeInactive !== "true" || req.user?.role !== "admin") {
      filter.isActive = true;
    }
    if (category) {
      filter.category = category;
    }
    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    const products = await Product.find(filter).sort({ category: 1, name: 1 });

    res.json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Lấy chi tiết 1 sản phẩm
 * @route   GET /api/products/:id
 */
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy sản phẩm" });
    }
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============ ADMIN ENDPOINTS ============

/**
 * @desc    Tạo sản phẩm mới (Admin)
 * @route   POST /api/products
 */
const createProduct = async (req, res) => {
  try {
    const {
      name,
      category,
      price,
      unit,
      stockQuantity,
      lowStockThreshold,
      isRentable,
      depositAmount,
      imageUrl,
      description,
    } = req.body;

    // Validate category
    const validCategories = ["drink", "snack", "consumable", "rental"];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `Danh mục không hợp lệ. Chọn: ${validCategories.join(", ")}`,
      });
    }

    // Nếu là rental thì depositAmount phải có
    if (category === "rental") {
      if (!depositAmount || depositAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Sản phẩm cho thuê phải có tiền cọc > 0",
        });
      }
    }

    const product = await Product.create({
      name,
      category,
      price,
      unit: unit || "cái",
      stockQuantity: stockQuantity || 0,
      lowStockThreshold: lowStockThreshold || 5,
      isRentable: isRentable || category === "rental",
      depositAmount: depositAmount || 0,
      imageUrl: imageUrl || "",
      description: description || "",
    });

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res
        .status(400)
        .json({ success: false, message: messages.join(". ") });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Cập nhật sản phẩm (Admin)
 * @route   PUT /api/products/:id
 */
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy sản phẩm" });
    }

    const updates = req.body;
    // Không cho update category nếu không hợp lệ
    if (updates.category) {
      const validCategories = ["drink", "snack", "consumable", "rental"];
      if (!validCategories.includes(updates.category)) {
        return res
          .status(400)
          .json({ success: false, message: "Danh mục không hợp lệ" });
      }
    }

    const updated = await Product.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res
        .status(400)
        .json({ success: false, message: messages.join(". ") });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Xóa sản phẩm (Admin - soft delete: set isActive = false)
 * @route   DELETE /api/products/:id
 */
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy sản phẩm" });
    }

    product.isActive = false;
    await product.save();

    res.json({ success: true, message: "Đã ngừng bán sản phẩm" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Nhập thêm hàng vào kho (Admin)
 * @route   PUT /api/products/:id/restock
 */
const restockProduct = async (req, res) => {
  try {
    const { quantity } = req.body;
    if (!quantity || quantity <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Số lượng nhập phải > 0" });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy sản phẩm" });
    }

    product.stockQuantity += quantity;
    await product.save();

    res.json({
      success: true,
      message: `Đã nhập thêm ${quantity} ${product.unit}. Tồn kho hiện tại: ${product.stockQuantity}`,
      data: product,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Lấy danh sách sản phẩm sắp hết hàng (Admin)
 * @route   GET /api/products/low-stock
 */
const getLowStockProducts = async (req, res) => {
  try {
    // Dùng $expr để so sánh 2 field trong cùng document
    const products = await Product.find({
      isActive: true,
      $expr: { $lte: ["$stockQuantity", "$lowStockThreshold"] },
    }).sort({ stockQuantity: 1 });

    res.json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Kiểm tra tồn kho trước khi đặt (dùng cho frontend validate)
 * @route   POST /api/products/check-stock
 */
const checkStock = async (req, res) => {
  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Vui lòng gửi danh sách sản phẩm" });
    }

    const { valid, errors } = await validateStock(items);
    res.json({ success: true, valid, errors });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  restockProduct,
  getLowStockProducts,
  checkStock,
  validateStock, // Export để dùng trong serviceOrderController
};
