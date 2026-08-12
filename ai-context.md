# BỐI CẢNH DỰ ÁN: WEB ĐẶT SÂN CẦU LÔNG & THUÊ VỢT

## 1. Tổng quan & Công nghệ (Tech Stack)

- **Tên dự án:** Hệ thống đặt sân cầu lông và cho thuê vợt trực tuyến.
- **Frontend:** ReactJS, TailwindCSS (Giao diện Responsive, Mobile-first).
- **Backend:** Node.js (Express framework).
- **Database:** MongoDB (Sử dụng Mongoose ODM để quản lý Schema).
- **Mục tiêu cốt lõi:** Quản lý lịch sân trống, tránh trùng lịch (overbooking) bằng các truy vấn MongoDB tối ưu, tính toán chi phí thuê sân + thuê vợt đi kèm.

## 2. Tiến độ & Luồng công việc (Workflow & Tasks)

- [x] **ĐÃ HOÀN THÀNH:**
  - [x] Đăng ký / Đăng nhập (Frontend + Backend Node.js/MongoDB cơ bản).
  - [x] Giao diện Admin cơ bản (CRUD Sân, CRUD Người dùng).
  - [x] Giao diện Trang chủ và luồng Đặt sân vãng lai (Đặt theo ngày/giờ cụ thể).
  - [x] **Tính năng Đặt lịch cố định (Theo tháng):** sinh lịch tự động theo thứ trong tuần, Bulk Conflict Check.
  - [x] **Tính năng Bảo trì sân (Maintenance):** Quy trình Phiếu bảo trì, xử lý xung đột lịch đặt, đồng bộ trạng thái Sân.
  - [x] **Tính năng Bán dịch vụ sân (Court Services & POS Product):** Bán nước/đồ ăn, thuê vợt (có cọc), quản lý tồn kho.
  - [x] **Tính năng Thống kê & Báo cáo doanh thu (Analytics & Reporting):** Doanh thu ngày/tháng, công suất lấp đầy, lợi nhuận ròng, xuất Excel/PDF, Aggregation Pipeline + `DailyStats` pre-aggregate.
  - [x] **Actor Nhân viên POS (Front-desk Staff) — Mô hình vận hành "Mở phiên/Tab":**
    - `Check-in` = mở phiên chơi (chưa thanh toán), `Check-out` = kết phiên (tổng hợp bill tiền sân + dịch vụ ± cọc, thu tiền 1 lần).
    - Tách 2 field độc lập trong `Booking`: `status` (`pending`/`checked_in`/`checked_out`/`no_show`/`cancelled`) và `paymentStatus` (`unpaid`/`paid`); `status = checked_in` luôn đi kèm `paymentStatus = unpaid`.
    - Gộp Bán dịch vụ vào màn Check-in (thêm dịch vụ trực tiếp trong chi tiết phiên, tự gắn `bookingId`), giữ tab `/pos/orders` riêng chỉ cho bán hàng không gắn booking.
    - Luồng Check-out: tính tiền sân (kèm phụ thu quá giờ nếu có) + tổng dịch vụ ± cọc thiết bị thuê → chọn thanh toán → tạo `Transaction` → cập nhật `status/paymentStatus` → cộng vào Shift.
    - Đồng bộ Walk-in tạo booking `checked_in`/`unpaid` (không `paid` ngay như thiết kế cũ); sân chỉ về `Trống` khi `status = checked_out`.

- [/] **ĐANG LÀM (TẬP TRUNG CHÍNH):**
  - [x] **Quản lý Quỹ tiền lẻ định mức (Cash Float / Imprest System) ✅ ĐÃ HOÀN THÀNH**

- [ ] **SẮP LÀM (BACKLOG):**
  - [ ] Làm chuẩn chỉnh lại phần Auth (JWT, Refresh Token, Quên mật khẩu, OTP, Phân quyền Middleware — cần mở rộng thêm role `pos_staff`).
  - [ ] Tích hợp cổng thanh toán (VNPay / Momo / Chuyển khoản QR).

## 3. Quy ước viết code (Coding Standards)

- **Ngôn ngữ:** Code bằng tiếng Anh (biến, hàm, tên Model/Collection trong MongoDB), comment và giải thích logic bằng tiếng Việt.
- **Xử lý logic:** Tất cả logic kiểm tra trùng lịch (Conflict Check) phải được xử lý ở Backend bằng các truy vấn `Mongoose/MongoDB` (Sử dụng `Session/Transaction` nếu cần để tránh race condition).
- **Yêu cầu AI:** Tập trung vào giải thuật tối ưu cho MongoDB (ví dụ: cách index trường dữ liệu ngày tháng, cách dùng toán tử để truy vấn nhanh). Không viết giải thích lý thuyết dông dài, hãy đi thẳng vào code thực tế.
