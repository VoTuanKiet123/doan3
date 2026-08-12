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
  - [x] Giao diện Trang chủ và luồng Đặt sân vãng lai.
  - [x] **Tính năng Đặt lịch cố định (Theo tháng).**
  - [x] **Tính năng Bảo trì sân (Maintenance).**
  - [x] **Tính năng Bán dịch vụ sân (Court Services & POS Product).**
  - [x] **Tính năng Thống kê & Báo cáo doanh thu (Analytics & Reporting).**
  - [x] **Actor Nhân viên POS — Mô hình vận hành "Mở phiên/Tab" (Check-in/Check-out).**
  - [x] **Quản lý Quỹ tiền lẻ định mức (Cash Float / Imprest System).**

- [/] **ĐANG LÀM (TẬP TRUNG CHÍNH):**
  - [ ] **Tích hợp cổng thanh toán VNPay (Sandbox) — dùng chung cho Online & POS:**
    - **Cấu hình đã có sẵn (đã set trong `backend/.env`):**
      - `VNP_TMN_CODE`, `VNP_HASH_SECRET`, `VNP_URL` (`https://sandbox.vnpayment.vn/paymentv2/vpcpay.html`), `VNP_RETURN_URL`, `VNP_IPN_URL` (cần domain public qua ngrok khi test local).

    - **Model mới cần tạo: `Transaction`:**
      {
      \_ id, orderId (mã đơn duy nhất tự sinh, dùng làm vnp_TxnRef),
      bookingId (ref, optional), serviceOrderId (ref, optional),
      amount, method: "vnpay" | "cash" | "transfer",
      type: "payment" | "refund",
      status: "pending" | "success" | "failed",
      vnpTransactionNo, vnpResponseCode, vnpBankCode,
      createdAt, paidAt
      }
      - **Luồng Online (Redirect Flow):**
      1. Khách bấm "Thanh toán online" tại bước checkout booking → Backend tạo `Transaction` (`status: pending`), sinh `orderId` duy nhất.
      2. Backend build URL thanh toán: gom tham số (`vnp_Amount` x100, `vnp_TxnRef`, `vnp_OrderInfo`, `vnp_ReturnUrl`, `vnp_IpAddr`...) → sort alphabet → ký `HMAC SHA512` bằng `VNP_HASH_SECRET` → gắn `vnp_SecureHash` vào URL.
      3. Redirect khách sang `VNP_URL` kèm URL vừa build.
      4. Khách thanh toán xong, VNPay redirect về `VNP_RETURN_URL` (chỉ để hiển thị UI "đang xử lý", **không dùng để xác nhận thanh toán thật**).
      5. VNPay gọi ngầm **IPN** đến `VNP_IPN_URL` → Backend verify lại chữ ký (`vnp_SecureHash`) → nếu khớp và `vnp_ResponseCode = "00"` → cập nhật `Transaction.status = success`, `Booking.paymentStatus = paid`.
      6. Backend phải trả về đúng format JSON `{RspCode, Message}` mà VNPay yêu cầu trong response của IPN, nếu không VNPay sẽ gọi lại nhiều lần.

    - **Luồng POS (VNPAY-QR tại quầy):**
      1. Nhân viên chọn "Thanh toán chuyển khoản" ở bước Check-out → Backend gọi API sinh mã QR VNPay (cùng cơ chế ký như trên, nhưng trả về ảnh QR thay vì redirect).
      2. Frontend POS hiển thị QR ngay trên màn hình, khách quét bằng app ngân hàng bất kỳ.
      3. VNPay gửi IPN về **cùng 1 endpoint** với luồng online → Backend cập nhật `Transaction.status = success` → tự động cập nhật `Booking.status = checked_out`, cộng vào `ShiftReport.totalTransferIn` — **không cần nhân viên tự xác nhận bằng tay**.
      4. Frontend POS polling (hoặc dùng WebSocket/SSE nếu muốn realtime hơn) theo `orderId` để tự chuyển màn hình "Thanh toán thành công" ngay khi Backend nhận được IPN.

    - **Xử lý các trường hợp đặc biệt:**
      - Khách đóng trình duyệt giữa chừng (không quay lại `ReturnUrl`) → không sao, vì `IPN` vẫn chạy ngầm, `Booking` vẫn được cập nhật đúng.
      - Giao dịch hết hạn (khách mở QR/link nhưng không thanh toán) → cron job quét `Transaction` ở trạng thái `pending` quá X phút → tự chuyển `status = failed`, nhả lại slot/sản phẩm nếu có giữ chỗ tạm.
      - IPN gọi về nhưng `Transaction` không tồn tại/đã xử lý rồi (VNPay có thể gọi trùng) → check idempotent: nếu `status` đã là `success` thì trả về `RspCode: "02"` (đã xác nhận trước đó), không xử lý lại lần 2.

    - **Bảo mật:**
      - `VNP_HASH_SECRET` chỉ dùng ở Backend, không bao giờ gửi ra Frontend.
      - Luôn verify lại chữ ký ở bước IPN (không tin tưởng dữ liệu redirect từ `ReturnUrl` vì có thể bị giả mạo tham số trên URL).

    - **Việc cần làm thủ công song song (không phải code):**
      - Chạy `ngrok http <port_backend>` khi test, cập nhật `VNP_IPN_URL` trong `.env` mỗi lần ngrok đổi URL.
      - Test bằng thẻ ngân hàng giả lập của Sandbox VNPay (danh sách thẻ test có trong tài liệu devreg).

- [ ] **SẮP LÀM (BACKLOG):**
  - [ ] Làm chuẩn chỉnh lại phần Auth (JWT, Refresh Token, Quên mật khẩu, OTP, Phân quyền Middleware).

## 3. Quy ước viết code (Coding Standards)

- **Ngôn ngữ:** Code bằng tiếng Anh (biến, hàm, tên Model/Collection trong MongoDB), comment và giải thích logic bằng tiếng Việt.
- **Xử lý logic:** Tất cả logic kiểm tra trùng lịch (Conflict Check) phải được xử lý ở Backend bằng các truy vấn `Mongoose/MongoDB` (Sử dụng `Session/Transaction` nếu cần để tránh race condition).
- **Yêu cầu AI:** Tập trung vào giải thuật tối ưu cho MongoDB (ví dụ: cách index trường dữ liệu ngày tháng, cách dùng toán tử để truy vấn nhanh). Không viết giải thích lý thuyết dông dài, hãy đi thẳng vào code thực tế.
