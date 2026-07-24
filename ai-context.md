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

- [/] **ĐANG LÀM (TẬP TRUNG CHÍNH):**
  - [ ] **Actor mới: Nhân viên POS (Front-desk Staff) — Quản lý vận hành tại quầy:**
    - **Vai trò & Phân quyền (Role & Middleware):**
      - Thêm role `pos_staff` vào `User` schema (bên cạnh `admin`, `customer`).
      - Middleware giới hạn: Nhân viên POS **chỉ** được truy cập các API check-in, bán dịch vụ, hủy/dời lịch tại sân của mình phụ trách — **không** được xem báo cáo lợi nhuận ròng toàn hệ thống hay CRUD Sân/Người dùng (phân quyền chặt hơn Admin).
      - Mỗi thao tác của POS Staff cần lưu `staffId` vào bản ghi (Booking, ServiceOrder, Transaction) để phục vụ đối soát ca sau này.

    - **Quy trình nghiệp vụ tổng quát (Workflow — bám theo thực tế sân thể thao):**
      `Khách đến sân` → `Nhân viên xác định loại khách (Đã đặt / Chưa đặt)` → `Thực hiện Check-in tương ứng` → `(Tùy chọn) Bán thêm dịch vụ tại quầy` → `Khách chơi xong` → `Trả sân / Trả đồ thuê` → `Đóng phiên (Session) sân đó`.

    - **Case 1 — Khách ĐÃ đặt trước (Có Booking) → Check-in:**
      - Nhân viên tra cứu booking bằng SĐT/mã đặt lịch/tên khách (search nhanh, không bắt gõ chính xác).
      - **Nếu đã thanh toán online (status = `Paid`):** chỉ cần xác nhận check-in → chuyển `Booking.status` từ `Confirmed` → `Checked-in`. Đây là tình huống cần chú ý: _"Đặt & đã trả tiền vẫn phải làm thủ tục nhận sân"_ — vì hệ thống cần biết chính xác giờ khách **thực sự** có mặt và bắt đầu sử dụng sân (khác với giờ đặt trên hệ thống), phục vụ cho việc: xử lý trễ giờ, đối soát công suất thực tế, và làm bằng chứng nếu có tranh chấp.
      - **Nếu đặt giữ chỗ nhưng chưa thanh toán (status = `Pending`):** nhân viên thu tiền tại quầy (tiền mặt/chuyển khoản/quét QR) → hệ thống ghi nhận `Transaction` → sau đó mới cho check-in.
      - **No-show:** nếu quá X phút (config được, VD 15 phút) kể từ giờ đặt mà khách chưa đến và chưa liên hệ → nhân viên có thể đánh dấu `No-show` → áp dụng chính sách phạt (mất cọc/giữ % tiền tùy rule đã cấu hình).

    - **Case 2 — Khách CHƯA đặt trước (Walk-in) → Đặt & Check-in gộp làm 1 bước:**
      - Nhân viên chọn sân trống theo khung giờ hiện tại (dùng lại giải thuật check trùng lịch đã có) → tạo nhanh 1 `Booking` tại chỗ (gắn `createdBy: staffId`, `bookingType: "walk-in"`) → thu tiền ngay → hệ thống tự động set `status = Checked-in` luôn (bỏ qua bước `Confirmed` trung gian vì không cần vì khách đã đứng tại quầy).
      - Đây là **luồng ngắn hơn** Case 1 vì không có độ trễ giữa "đặt" và "đến" — đúng bản chất khách vãng lai.

    - **Case 3 — Hủy lịch: Xử lý trả giờ / trả tiền (Cancellation & Refund):**
      - **Chính sách hủy (Cancellation Policy — cấu hình được ở Admin):** ví dụ hủy trước ≥ 24h hoàn 100%, trước 2–24h hoàn 50%, dưới 2h không hoàn.
      - Nhân viên POS thực hiện hủy theo yêu cầu khách tại quầy hoặc qua điện thoại → hệ thống tự tính % hoàn tiền theo policy và thời điểm hủy so với giờ đặt → tạo `Transaction` loại `refund` → **giải phóng khung giờ đó** trong `Bookings` để khách khác có thể đặt lại.
      - **Trả giờ / Đổi giờ (Slot swap):** nếu khách muốn đổi sang khung giờ khác cùng ngày (VD đến trễ, xin đổi ca sau) → nhân viên kiểm tra sân trống ở giờ mới → nếu có, dời lịch (update `Bookings`) mà **không cần** hủy + tạo lại từ đầu, tránh phát sinh 2 giao dịch thanh toán không cần thiết.

    - **Case 4 — Bán dịch vụ trực tiếp tại sân (POS Sales):**
      - Dùng lại `Products`/`ServiceOrders` đã có, nhưng UI tối giản hóa cho thao tác nhanh (giống máy POS thật: bấm số lượng, quét mã hoặc chọn nhanh top sản phẩm bán chạy) — vì nhân viên thao tác trong lúc khách đang đứng chờ, cần tốc độ cao hơn giao diện Admin thông thường.
      - Gắn `staffId` vào mỗi `ServiceOrder` để đối soát doanh thu theo từng nhân viên trong ca.

    - **Đối soát ca làm (Shift/Cash Reconciliation) — phần bắt buộc phải có với actor POS:**
      - Đầu ca: nhân viên nhập số tiền mặt tồn quỹ ban đầu (`openingCash`).
      - Trong ca: mọi giao dịch tiền mặt (booking + dịch vụ + hoàn tiền) được cộng/trừ tự động vào quỹ ca đó.
      - Cuối ca: hệ thống tính `expectedCash = openingCash + tổng thu tiền mặt - tổng hoàn tiền mặt`, nhân viên nhập số tiền mặt thực đếm được (`actualCash`) → hệ thống so sánh, nếu lệch thì ghi chú lý do (thất thoát/nhầm lẫn) để Admin xem báo cáo.

    - **Trải nghiệm người dùng (UX/UI):**
      - Giao diện tối giản, thao tác nhanh (giống POS thật): màn hình chính chia 2 nút lớn **"Check-in khách đã đặt"** và **"Khách vãng lai / Đặt mới"**.
      - Sơ đồ sân trực quan (dùng lại từ tính năng Bảo trì) để nhân viên nhìn nhanh sân nào đang trống/đang có khách/đang bảo trì mà không cần tra cứu.
      - Nút "Hủy/Đổi giờ" chỉ hiện ra khi tra được đúng booking, kèm cảnh báo rõ % hoàn tiền trước khi nhân viên xác nhận (tránh sai sót thao tác).

    - **Giải thuật MongoDB liên quan:**
      - Query tra cứu booking theo SĐT/tên nên index trên field `customerPhone` để tìm nhanh khi khách đứng chờ tại quầy.
      - Transaction (Mongoose Session) bắt buộc khi vừa update `Booking.status`, vừa trừ kho `Products`, vừa ghi `Transaction` cùng lúc — tránh trường hợp lỗi giữa chừng làm sai lệch dữ liệu (VD: đã trừ tiền nhưng chưa check-in).

    - **Tính năng mở rộng (Advanced):**
      - Chấm công nhân viên POS theo ca (Time tracking) tích hợp luôn với bước mở ca/đóng ca.
      - In hóa đơn/biên nhận tại quầy (kết nối máy in nhiệt qua Web Bluetooth/USB — có thể để giai đoạn sau).

    - **Lưu ý kỹ thuật**:
      - Nên thêm state Checked-in riêng vào enum Booking.status (không gộp chung với Paid/Confirmed), vì đây là 2 khái niệm khác nhau: đã trả tiền ≠ đã thực sự có mặt sử dụng sân.
      - Transaction nên là Collection độc lập (không suy ra từ status), để lưu được cả lịch sử refund — vì nghiệp vụ hủy/trả giờ ở Case 3 bắt buộc phải có bằng chứng giao dịch hoàn tiền tách biệt.
      - Đối soát ca (ShiftReport) nên là 1 Collection riêng, snapshot dữ liệu tại thời điểm đóng ca — không nên tính real-time mỗi lần xem, tránh sai lệch nếu có giao dịch phát sinh sau khi đã đóng ca.

- [ ] **SẮP LÀM (BACKLOG):**
  - [ ] Làm chuẩn chỉnh lại phần Auth (JWT, Refresh Token, Quên mật khẩu, OTP, Phân quyền Middleware — cần mở rộng thêm role `pos_staff`).
  - [ ] Tích hợp cổng thanh toán (VNPay / Momo / Chuyển khoản QR).

## 3. Quy ước viết code (Coding Standards)

- **Ngôn ngữ:** Code bằng tiếng Anh (biến, hàm, tên Model/Collection trong MongoDB), comment và giải thích logic bằng tiếng Việt.
- **Xử lý logic:** Tất cả logic kiểm tra trùng lịch (Conflict Check) phải được xử lý ở Backend bằng các truy vấn `Mongoose/MongoDB` (Sử dụng `Session/Transaction` nếu cần để tránh race condition).
- **Yêu cầu AI:** Tập trung vào giải thuật tối ưu cho MongoDB (ví dụ: cách index trường dữ liệu ngày tháng, cách dùng toán tử để truy vấn nhanh). Không viết giải thích lý thuyết dông dài, hãy đi thẳng vào code thực tế.
