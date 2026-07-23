const express = require("express");
const router = express.Router();
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  restockProduct,
  getLowStockProducts,
  checkStock,
} = require("../controllers/productController");
const { protect, adminOnly } = require("../middleware/auth");

// ========== Public / User ==========
router.get("/", protect, getProducts);
router.get("/low-stock", protect, adminOnly, getLowStockProducts); // Phải đặt trước /:id
router.post("/check-stock", protect, checkStock);
router.get("/:id", protect, getProductById);

// ========== Admin only ==========
router.post("/", protect, adminOnly, createProduct);
router.put("/:id", protect, adminOnly, updateProduct);
router.delete("/:id", protect, adminOnly, deleteProduct);
router.put("/:id/restock", protect, adminOnly, restockProduct);

module.exports = router;
