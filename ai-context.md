# BỐI CẢNH DỰ ÁN: WEB ĐẶT SÂN CẦU LÔNG & THUÊ VỢT

## 1. Tổng quan & Công nghệ (Tech Stack)

- **Tên dự án:** Hệ thống đặt sân cầu lông và cho thuê vợt trực tuyến.
- **Frontend:** ReactJS, TailwindCSS (Giao diện Responsive, Mobile-first).
- **Backend:** Node.js (Express framework).
- **Database:** MongoDB (Sử dụng Mongoose ODM để quản lý Schema).
- **Mục tiêu cốt lõi:** Quản lý lịch sân trống, tránh trùng lịch (overbooking) bằng các truy vấn MongoDB tối ưu, tính toán chi phí thuê sân + thuê vợt đi kèm.

## 2. Tiến độ & Luồng công việc (Workflow & Tasks)

- [x] **ĐÃ HOÀN THÀNH (Mức độ cơ bản):**
  - [x] Đăng ký / Đăng nhập (Frontend + Backend Node.js/MongoDB cơ bản).
  - [x] Giao diện Admin cơ bản (CRUD Sân, CRUD Người dùng).
  - [x] Giao diện Trang chủ và luồng Đặt sân vãng lai (Đặt theo ngày/giờ cụ thể).

- [/] **ĐANG LÀM (TẬP TRUNG CHÍNH):**
  - [ ] **Tính năng Đặt lịch cố định (Theo tháng):**
    - Giao diện (React + Tailwind): Thêm option chọn "Đặt vãng lai" hoặc "Đặt cố định theo tháng".
    - Logic Backend (Node.js): Tự động sinh ra các ngày trong tháng dựa trên thứ trong tuần được chọn (Ví dụ: Thứ 2-4-6 hàng tuần từ ngày bắt đầu đến ngày kết thúc).
    - Giải thuật MongoDB: Kiểm tra trùng lịch hàng loạt (Bulk Conflict Check). Quét trong Collection `Bookings` xem các ngày tự sinh ra có bị trùng với lịch vãng lai hoặc lịch cố định nào khác không.

- [ ] **SẮP LÀM (BACKLOG):**
  - [ ] Tích hợp tính năng Thuê vợt đi kèm khi đặt sân (Quản lý kho vợt trong MongoDB).
  - [ ] Làm chuẩn chỉ lại phần Auth (JWT, Refresh Token, Quên mật khẩu, OTP, Phân quyền Middleware).
  - [ ] Tích hợp cổng thanh toán (VNPay / Momo / Chuyển khoản QR).

## 3. Quy ước viết code (Coding Standards)

- **Ngôn ngữ:** Code bằng tiếng Anh (biến, hàm, tên Model/Collection trong MongoDB), comment và giải thích logic bằng tiếng Việt.
- **Xử lý logic:** Tất cả logic kiểm tra trùng lịch (Conflict Check) phải được xử lý ở Backend bằng các truy vấn `Mongoose/MongoDB` (Sử dụng `Session/Transaction` nếu cần để tránh race condition).
- **Yêu cầu AI:** Tập trung vào giải thuật tối ưu cho MongoDB (ví dụ: cách index trường dữ liệu ngày tháng, cách dùng toán tử để truy vấn nhanh). Không viết giải thích lý thuyết dông dài, hãy đi thẳng vào code thực tế.
