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
  - [x] **Tính năng Đặt lịch cố định (Theo tháng):** sinh lịch tự động theo thứ trong tuần, Bulk Conflict Check trong `Bookings`.
  - [x] **Tính năng Bảo trì sân (Maintenance):** Quy trình Phiếu bảo trì (Pending → In Progress → Completed/Cancelled), xử lý xung đột lịch đặt khi bảo trì, đồng bộ trạng thái Sân trên UI.
  - [x] **Tính năng Bán dịch vụ sân (Court Services & POS):** Bán nước/đồ ăn nhẹ, thuê vợt/thiết bị (có cọc), quản lý tồn kho, POS bán tại quầy. _(Sẽ bổ sung chi tiết sau — tạm ổn ở mức cơ bản)_.

- [/] **ĐANG LÀM (TẬP TRUNG CHÍNH):**
  - [ ] **Tính năng Thống kê & Báo cáo doanh thu (Analytics & Reporting):**
    - **Nguồn dữ liệu tổng hợp (Data Sources — cần join/aggregate từ nhiều Collection):**
      - `Bookings` (tiền sân: vãng lai + cố định theo tháng).
      - `ServiceOrders` (tiền dịch vụ: nước, đồ ăn, thuê vợt, cọc).
      - `Maintenance` (chi phí sửa chữa — được tính là **chi phí**, trừ ngược vào lợi nhuận, không phải doanh thu).
      - `Payments`/`Transactions` (nếu tách riêng bảng giao dịch thanh toán — khuyến nghị có, để xử lý hoàn tiền/refund dễ dàng).

    - **Các loại báo cáo cần có (theo đúng luồng thực tế quản lý sân thể thao):**
      1. **Báo cáo doanh thu theo ngày (Daily Revenue):**
         - Tổng doanh thu = Tiền sân + Tiền dịch vụ (không tính cọc thuê đồ vì cọc là tiền giữ, không phải doanh thu thật sự cho đến khi bị trừ do hư/mất).
         - Breakdown theo khung giờ (sáng/chiều/tối) → xác định khung giờ vàng (peak hours).
         - Breakdown theo hình thức thanh toán (Tiền mặt / Chuyển khoản / Ví điện tử) — rất quan trọng để đối soát quỹ cuối ngày (đóng ca/end-of-shift reconciliation), sân thể thao ngoài đời luôn có bước này.
      2. **Báo cáo doanh thu theo tháng (Monthly Revenue):**
         - Tổng hợp theo tuần/theo ngày trong tháng (dạng biểu đồ đường/cột).
         - So sánh với tháng trước (tăng/giảm bao nhiêu %) — chủ sân luôn cần con số so sánh (MoM growth).
         - Tỷ trọng doanh thu: % từ Tiền sân vs % từ Dịch vụ đi kèm (giúp chủ sân biết dịch vụ có đáng đầu tư thêm không).
      3. **Báo cáo công suất sử dụng sân (Occupancy Rate):**
         - Tỷ lệ lấp đầy = (Số giờ có khách đặt / Tổng số giờ sân mở cửa) × 100%.
         - Theo từng sân riêng lẻ → phát hiện sân nào ế (để có chính sách giảm giá) và sân nào luôn full (cân nhắc tăng giá giờ vàng hoặc mở thêm sân).
         - Tách riêng thời gian sân bị "Bảo trì" ra khỏi mẫu số tính công suất (tránh làm sai lệch số liệu — sân đang sửa không tính là "sân trống ế khách").
      4. **Báo cáo lợi nhuận ròng (Net Profit):**
         - Lợi nhuận = Tổng doanh thu − Chi phí bảo trì − Giá vốn hàng bán dịch vụ (COGS, ví dụ giá nhập nước/cầu) − Chi phí vận hành khác (nếu có nhập tay).
         - Đây là báo cáo "thật" mà chủ sân quan tâm nhất, không chỉ là doanh thu gộp.
      5. **Báo cáo Top khách hàng / Khách quen (Customer Insight):**
         - Khách đặt cố định theo tháng nào sắp hết hạn gói → nhắc gia hạn (rất phổ biến ở mô hình sân cầu lông/pickleball ngoài đời, vì khách tháng là nguồn thu ổn định nhất).
         - Khách chi tiêu nhiều nhất (VIP) để có chính sách ưu đãi giữ chân.
      6. **Xuất báo cáo (Export):**
         - Xuất Excel (.xlsx) và PDF theo khoảng thời gian tùy chọn (date range picker) — dùng để chủ sân gửi kế toán hoặc lưu trữ nội bộ.
         - Cho phép lọc export theo: 1 sân cụ thể / tất cả sân, theo loại doanh thu (chỉ tiền sân / chỉ dịch vụ / tất cả).

    - **Giải thuật MongoDB (trọng tâm kỹ thuật):**
      - Dùng **Aggregation Pipeline** (`$match` theo khoảng ngày → `$group` theo ngày/tháng/sân → `$sum` doanh thu) thay vì query rồi tính tay ở Node.js, để tối ưu hiệu năng khi dữ liệu lớn.
      - Index bắt buộc trên trường `createdAt`/`bookingDate` ở các Collection `Bookings`, `ServiceOrders`, `Maintenance` để pipeline lọc theo ngày chạy nhanh.
      - Cân nhắc dùng `$facet` để chạy nhiều loại thống kê (doanh thu, công suất, top khách hàng) trong **1 lần query duy nhất**, tránh gọi DB nhiều lần cho 1 dashboard.
      - Với hệ thống lớn, cân nhắc job cron (chạy lúc nửa đêm) để **pre-aggregate** dữ liệu ngày hôm đó vào 1 Collection `DailyStats` riêng — tránh việc mỗi lần Admin mở Dashboard phải quét toàn bộ Bookings/ServiceOrders lịch sử.

    - **Trải nghiệm người dùng (UX/UI):**
      - _Admin/Chủ sân (Dashboard):_
        - Trang tổng quan (Overview) hiển thị 4 chỉ số nhanh dạng card: Doanh thu hôm nay, Doanh thu tháng này, Công suất lấp đầy, Số phiếu bảo trì đang xử lý.
        - Biểu đồ đường (Line Chart) doanh thu theo ngày trong tháng + biểu đồ tròn (Pie Chart) tỷ trọng Tiền sân/Dịch vụ.
        - Bảng chi tiết có thể lọc theo khoảng ngày tùy chỉnh + nút "Xuất báo cáo".
      - _Nhân viên (nếu có phân quyền riêng):_ Chỉ xem được báo cáo đối soát ca làm của mình (tiền mặt thu trong ca), không xem được lợi nhuận ròng toàn hệ thống — cần phân quyền Middleware chặn theo role.

    - **Tính năng mở rộng (Advanced):**
      - Dự báo doanh thu tháng tới dựa trên xu hướng lịch sử (đơn giản: trung bình trượt/moving average, chưa cần AI phức tạp).
      - Cảnh báo tự động: nếu doanh thu ngày hôm nay giảm quá X% so với trung bình cùng thứ trong 4 tuần gần nhất → gửi thông báo cho chủ sân kiểm tra.

- [ ] **SẮP LÀM (BACKLOG):**
  - [ ] Làm chuẩn chỉnh lại phần Auth (JWT, Refresh Token, Quên mật khẩu, OTP, Phân quyền Middleware).
  - [ ] Tích hợp cổng thanh toán (VNPay / Momo / Chuyển khoản QR).

## 3. Quy ước viết code (Coding Standards)

- **Ngôn ngữ:** Code bằng tiếng Anh (biến, hàm, tên Model/Collection trong MongoDB), comment và giải thích logic bằng tiếng Việt.
- **Xử lý logic:** Tất cả logic kiểm tra trùng lịch (Conflict Check) phải được xử lý ở Backend bằng các truy vấn `Mongoose/MongoDB` (Sử dụng `Session/Transaction` nếu cần để tránh race condition).
- **Yêu cầu AI:** Tập trung vào giải thuật tối ưu cho MongoDB (ví dụ: cách index trường dữ liệu ngày tháng, cách dùng toán tử để truy vấn nhanh). Không viết giải thích lý thuyết dông dài, hãy đi thẳng vào code thực tế.
