require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("./src/config/db");
const Product = require("./src/models/Product");

const seedProducts = async () => {
  try {
    await connectDB();
    console.log("Đã kết nối MongoDB, bắt đầu seed sản phẩm...\n");

    // Xóa tất cả sản phẩm cũ
    await Product.deleteMany({});
    console.log("Đã xóa sản phẩm cũ.");

    const products = [
      // ========== ĐỒ UỐNG ==========
      {
        name: "Nước suối Aquafina",
        category: "drink",
        price: 10000,
        unit: "chai",
        stockQuantity: 100,
        lowStockThreshold: 20,
        description: "Nước suối tinh khiết Aquafina 500ml",
      },
      {
        name: "Sting dâu",
        category: "drink",
        price: 15000,
        unit: "lon",
        stockQuantity: 60,
        lowStockThreshold: 10,
        description: "Nước tăng lực Sting hương dâu",
      },
      {
        name: "Redbull",
        category: "drink",
        price: 20000,
        unit: "lon",
        stockQuantity: 50,
        lowStockThreshold: 10,
        description: "Nước tăng lực Redbull 250ml",
      },
      {
        name: "Nước chanh muối",
        category: "drink",
        price: 15000,
        unit: "chai",
        stockQuantity: 40,
        lowStockThreshold: 8,
        description: "Nước chanh muối tươi mát",
      },
      {
        name: "Trà đào",
        category: "drink",
        price: 20000,
        unit: "ly",
        stockQuantity: 35,
        lowStockThreshold: 5,
        description: "Trà đào cam sả thơm ngon",
      },

      // ========== ĐỒ ĂN NHẸ ==========
      {
        name: "Snack Oishi",
        category: "snack",
        price: 10000,
        unit: "gói",
        stockQuantity: 80,
        lowStockThreshold: 15,
        description: "Snack Oishi các loại",
      },
      {
        name: "Bánh tráng trộn",
        category: "snack",
        price: 15000,
        unit: "gói",
        stockQuantity: 30,
        lowStockThreshold: 5,
        description: "Bánh tráng trộn sa tế",
      },

      // ========== VẬT TƯ TIÊU HAO ==========
      {
        name: "Ống cầu lông Thành Công",
        category: "consumable",
        price: 80000,
        unit: "ống",
        stockQuantity: 40,
        lowStockThreshold: 8,
        description: "Ống cầu lông Thành Công (10 trái/ống) - Cầu lông vũ",
      },
      {
        name: "Ống cầu lông Yonex AS-02",
        category: "consumable",
        price: 150000,
        unit: "ống",
        stockQuantity: 25,
        lowStockThreshold: 5,
        description: "Ống cầu lông Yonex Aerosensa 02 chính hãng",
      },
      {
        name: "Cầu lông lẻ Thành Công",
        category: "consumable",
        price: 10000,
        unit: "trái",
        stockQuantity: 200,
        lowStockThreshold: 30,
        description: "Cầu lông Thành Công bán lẻ từng trái",
      },

      // ========== CHO THUÊ THIẾT BỊ ==========
      {
        name: "Thuê vợt cầu lông Pro",
        category: "rental",
        price: 30000,
        unit: "cây",
        stockQuantity: 20,
        lowStockThreshold: 3,
        isRentable: true,
        depositAmount: 500000,
        description: "Vợt cầu lông chuyên nghiệp cho thuê. Cọc 500,000đ/cây.",
      },
      {
        name: "Thuê vợt cầu lông Cơ bản",
        category: "rental",
        price: 20000,
        unit: "cây",
        stockQuantity: 15,
        lowStockThreshold: 3,
        isRentable: true,
        depositAmount: 300000,
        description: "Vợt cầu lông cơ bản cho thuê. Cọc 300,000đ/cây.",
      },
      {
        name: "Thuê giày cầu lông",
        category: "rental",
        price: 25000,
        unit: "đôi",
        stockQuantity: 10,
        lowStockThreshold: 2,
        isRentable: true,
        depositAmount: 200000,
        description: "Giày cầu lông cho thuê. Cọc 200,000đ/đôi.",
      },
    ];

    const created = await Product.insertMany(products);
    console.log(`✅ Đã tạo ${created.length} sản phẩm thành công!\n`);

    // In danh sách
    created.forEach((p) => {
      console.log(
        `  [${p.category}] ${p.name} - ${p.price.toLocaleString("vi-VN")}đ/${p.unit} (Tồn: ${p.stockQuantity})`,
      );
    });

    console.log("\n🎉 Seed sản phẩm hoàn tất!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Lỗi seed:", error.message);
    process.exit(1);
  }
};

seedProducts();
