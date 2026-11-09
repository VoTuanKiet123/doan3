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
  - [x] **Tính năng Bảo trì sân (Maintenance) — bản cơ bản:** Phiếu bảo trì (`Pending` → `In Progress` → `Completed` / `Cancelled`), xử lý xung đột lịch đặt (đổi sân / hủy hoàn tiền / bảo trì khẩn cấp), đồng bộ trạng thái sân trên UI. _(Bản nâng cao: kiểm tra sân & báo cáo lên Admin, mã phiếu, tự bảo trì & nhật ký thực hiện, nghiệm thu — đang làm bên dưới; bảo trì định kỳ tự động để sau.)_
  - [x] **Tính năng Bán dịch vụ sân (Court Services & POS Product):** bán nước/đồ ăn, thuê vợt (có cọc), quản lý tồn kho `Products`.
  - [x] **Tính năng Thống kê & Báo cáo doanh thu (Analytics & Reporting).**
  - [x] **Actor Nhân viên POS — Mô hình "Mở phiên/Tab" (Check-in/Check-out):** `status` và `paymentStatus` tách độc lập, bán dịch vụ gộp vào màn Check-in.
  - [x] **Quản lý Quỹ tiền lẻ định mức (Cash Float / Imprest System):** `ShiftReport`, đóng ca, bàn giao ca.

- [/] **ĐANG LÀM (TẬP TRUNG CHÍNH):**
  - [ ] **Bảo trì sân nâng cao (Court Maintenance v2) — Kiểm tra & Báo cáo → Phiếu bảo trì → Tự bảo trì → Nghiệm thu:** *(chốt 2026-11-08: MỘT người làm toàn bộ, bỏ phương án chia 2 người — giữ nguyên mã việc N1.x/N2.x để đối chiếu)*
    - **Mục tiêu:** Nâng bản bảo trì cơ bản (đã xong) lên đúng quy trình quản lý sân ngoài đời: nhân viên trực sân **kiểm tra sân và báo cáo lỗi lên Admin**; Admin **tạo phiếu bảo trì** (có mã tra cứu) và **không cho khách đặt/thuê sân đó**; nhân viên **tự bảo trì** và ghi nhật ký; sau sửa nhân viên **kiểm tra lại**, Admin **duyệt** thì sân mới mở lại. **Dùng lại model `Maintenance` hiện có** (nhóm gọi là `MaintenanceTicket`) và toàn bộ luồng xung đột lịch đặt đã làm — chỉ **mở rộng**, không viết lại, không tạo bảng song song.

    - **Vai trò (KHÔNG thêm actor mới):**
      - `admin` (quản lý): nhận báo cáo, tạo/sửa/hủy phiếu, quyết định đóng sân, nhập chi phí nhà thầu, duyệt kết quả cuối (Hoàn thành / Trả về làm lại), xem báo cáo thống kê.
      - `pos_staff` (nhân viên trực sân): kiểm tra sân, ghi lỗi và gửi báo cáo lên Admin, **tự thực hiện bảo trì nhẹ** và ghi nhật ký, kiểm tra lại sau sửa. **Không** tạo/sửa/hủy phiếu, không xem chi phí tổng hay lợi nhuận.
      - `customer`: không tham gia; chỉ thấy ô giờ bị xám với tag "Bảo trì"/"Không khả dụng" khi sân bị chặn (như đã có).
      - "Người thực hiện" trên phiếu chỉ là **thông tin** (nhân viên của sân hoặc tên nhà thầu), không phải vai trò mới.

    - **Các quyết định đã chốt:**
      1. Báo cáo lỗi mức **nghiêm trọng** → sân **tạm ngưng nhận khách ngay** (không đợi Admin). Tạm ngưng kết thúc khi Admin tạo phiếu (phiếu quyết định đóng sân) hoặc Admin bỏ qua báo cáo (kèm lý do).
      2. Nhân viên POS **có** tự thực hiện bảo trì nhẹ (lau sàn, thay lưới, thay đèn, siết trụ). Việc nhà thầu làm thì nhân viên chỉ ghi giờ vào/ra và tình trạng, chi phí do Admin nhập trên phiếu.
      3. **Bảo trì định kỳ tự động** (cron tự sinh phiếu): **để sau**, chỉ làm khi hoàn thành xong phần cốt lõi (mục N1.12).

    - **Bối cảnh thực tế (vì sao thiết kế như vậy):**
      - Hạng mục hay hỏng: **thảm/sàn** (trơn, phồng, bong mép, ẩm do dột), **đèn**, **lưới & trụ**, **vạch kẻ sân**, **quạt/thông gió**, **mái/trần/tường**.
      - Phần lớn việc là **nhỏ** (siết trụ, thay lưới) → **không cần đóng sân**; chỉ việc lớn/nguy hiểm mới đóng. Người nhìn thấy sân mỗi ngày là nhân viên trực, còn quyết định đóng sân và duyệt mở lại thuộc quản lý — **người làm và người duyệt khác nhau** để kiểm soát chéo.
      - Chủ sân quan tâm: sân **đóng bao lâu** (mất doanh thu bao nhiêu), **tốn bao nhiêu tiền**, **ai làm và đã đạt chưa**.

    - **Luồng nghiệp vụ tổng thể:**

      ```
      [POS] Kiểm tra sân (Inspection "routine") → có lỗi → chọn mức độ (nhẹ / cần sửa / nghiêm trọng) → GỬI BÁO CÁO
              │ nghiêm trọng ⇒ sân TẠM NGƯNG ngay
              ▼
      [Admin] Xem báo cáo ──► "Tạo phiếu bảo trì" (form điền sẵn, chọn đóng sân ngay / theo giờ / không đóng)
              │               └► hoặc "Bỏ qua" (ghi lý do) ⇒ hết tạm ngưng
              ▼
      Phiếu "Chờ xử lý" ──[POS bắt đầu]──► "Đang bảo trì" ⇄ "Tạm dừng" (chờ vật tư)
              │   POS ghi MaintenanceLog (việc đã làm, vật tư, ảnh, chi phí)
              └──[POS hoàn tất công việc]──► "Chờ nghiệm thu" (sân vẫn đóng)
                      │  [POS] Kiểm tra lại sau sửa (Inspection "acceptance": đạt / không đạt + lý do)
                      ▼
      [Admin] Duyệt ──► "Hoàn thành" (chỉ khi lần kiểm tra lại gần nhất = đạt) ⇒ sân mở lại nếu không còn phiếu/báo cáo chặn khác
              └──────► "Trả về làm lại" ⇒ về "Đang bảo trì", sân tiếp tục đóng
      ```

    - **Trạng thái phiếu & ai thao tác:**
      | Trạng thái | Ai thao tác chuyển vào |
      |---|---|
      | `pending` (Chờ xử lý) | Admin (tạo phiếu) |
      | `in_progress` (Đang bảo trì) | POS bấm Bắt đầu; Admin "Trả về làm lại" |
      | `on_hold` (Tạm dừng) | POS |
      | `pending_acceptance` (Chờ nghiệm thu) | POS bấm Hoàn tất công việc |
      | `completed` (Hoàn thành) | Admin duyệt |
      | `cancelled` (Đã hủy) | Admin |
      - Chuyển hợp lệ: `pending → in_progress → pending_acceptance → completed`; `pending_acceptance → in_progress` (trả về); `in_progress ⇄ on_hold`; `pending/in_progress/on_hold → cancelled`. `completed` và `cancelled` là **cuối** (khóa). *(✅ Đã hiện thực: enum lowercase trong model, giữ nguyên 4 trạng thái cũ để không vỡ dữ liệu cũ — chỉ thêm `on_hold`, `pending_acceptance`.)* *(Ngoại lệ tạm: `in_progress → completed` thẳng được cho phép để UI cũ/emergency chưa có luồng nghiệm thu vẫn bấm "Hoàn thành" chạy — Phase 6 sẽ xem lại khi màn POS "Hoàn tất" ra đời.)*
      - ✅ **ĐÃ XONG:** mọi lần đổi trạng thái đi qua **một hàm duy nhất** `changeTicketStatus` trong `backend/src/services/maintenanceService.js` (state machine, ghi `statusHistory`, tính `downtimeMinutes`, đóng/mở sân theo `requiresClosure`, chạy trong Mongoose Transaction). Endpoint `PUT /api/maintenance/:id/status` đã nối vào hàm này.

    - **Các collection (✅ model đã tạo trong `backend/src/models/`):**
      | Bảng | Nội dung |
      |---|---|
      | `Maintenance` (mở rộng) | Phiếu bảo trì |
      | `Counter` | Bộ đếm sinh mã phiếu |
      | `MaintenancePlan` (làm sau) | Kế hoạch bảo trì định kỳ |
      | `MaintenanceLog` | Nhật ký thực hiện, thuộc 1 phiếu (1-nhiều) |
      | `Inspection` | Báo cáo kiểm tra (thường kỳ và kiểm tra lại sau sửa) |
      | `ChecklistTemplate` | Mục kiểm tra mẫu, Admin chỉnh được |
      - **`Maintenance` (thêm field, giữ tương thích phiếu cũ — ✅ đã hiện thực):**
        ```
        // QUY ƯỚC ÁNH XẠ so với thiết kế ban đầu (giữ field cũ để không vỡ UI/luồng đang chạy):
        //   courtId          → field "court" (như model cũ)
        //   scheduledStart/End → startDate/endDate + startTime/endTime dạng String "YYYY-MM-DD"/"HH:mm" (như cũ)
        //   type             → maintenanceType (scheduled = corrective, periodic = preventive, emergency giữ nguyên)
        //   executorName     → assignedTo (như cũ)
        {
          ticketCode (unique, "BT-YYMMDD-NNN" — hook pre-save sinh qua Counter.$inc, không dùng count+1),
          category: "floor" | "lighting" | "net_post" | "line_marking" | "ventilation" | "roof_wall" | "other",
          priority: "low" | "medium" | "high" | "urgent",
          requiresClosure: Boolean,          // false = việc nhỏ, KHÔNG chặn lịch đặt
          actualStart, actualEnd, downtimeMinutes,   // Date, do changeTicketStatus ghi
          executorType: "in_house" | "contractor",
          contractor { name, phone, invoiceNo }, isUnderWarranty,
          inspection (ref Inspection, nếu tạo từ báo cáo),
          costLabor, costMaterial, costContractor, costTotal,   // cost/costNote cũ giữ cho phiếu legacy
          photosBefore[], attachments[],
          statusHistory [{ status, by, at, note }],
          isDeleted, deletedAt                // xóa mềm
        }
        ```
        Phiếu cũ mặc định sau migrate (`backend/migrateMaintenanceV2.js` — ✅ đã chạy trên DB dev): `maintenanceType: scheduled`, `priority: medium`, `requiresClosure: true`, `executorType: in_house`, `cost` cũ → `costContractor`.
      - **`MaintenanceLog`:** ✅ đã hiện thực (`backend/src/models/MaintenanceLog.js`) — field ref tên `ticket`, `court`, `performedBy`; có sẵn `court` để query chi phí theo sân không cần $lookup.
      - **`Inspection`:** ✅ đã hiện thực (`backend/src/models/Inspection.js`) — field ref tên `court`, `ticket`; `date` dạng String "YYYY-MM-DD" (như Booking); `dismissal` sub-document (chưa bỏ qua = field chưa tồn tại, query `dismissal: null` khớp).

        - **Trạng thái báo cáo routine (suy ra, không lưu thừa):** _Chờ xử lý_ = `severity != none`, chưa có phiếu nào có `inspection` trỏ tới, chưa `dismissal`; _Đã tạo phiếu_ = có phiếu `inspection` trỏ tới; _Đã bỏ qua_ = có `dismissal`. (✅ helper `hasPendingCriticalReport` trong maintenanceService đã dùng đúng quy tắc này.)
        - **Sân tạm ngưng** = có báo cáo `routine` với `severity = critical` ở trạng thái _Chờ xử lý_.

    - **Quy tắc chặn đặt/thuê sân (đọc cả hai bảng):** sân **không nhận đặt** trong khung giờ `[start, end]` nếu (a) có phiếu `requiresClosure = true`, `status ∈ {pending, in_progress, on_hold, pending_acceptance}` (constant `ACTIVE_STATUSES` trong maintenanceService) giao khung giờ đó, hoặc (b) sân đang **tạm ngưng** (báo cáo nghiêm trọng chờ xử lý). Phiếu `requiresClosure = false` **không** chặn và không hiện gì cho khách. Khách đã đặt trước bị ảnh hưởng thì xử lý bằng luồng xung đột lịch đặt đã có (đổi sân / hủy hoàn tiền / khẩn cấp). Giờ đóng sân do bảo trì **loại khỏi mẫu số** công suất lấp đầy; phiếu không đóng sân thì không loại. _(Cập nhật một phần: `scheduleService`, walk-in check, board POS, active-courts đã dùng `ACTIVE_STATUSES` + filter `requiresClosure: true` — màn khách/ô xám + `isCourtBlocked` đầy đủ làm ở Phase 3.)_

    - **Các mối nối chức năng (ghi nhớ khi code, trước đây là "điểm nối giữa 2 người"):**
      1. **Báo cáo → Phiếu:** nút "Tạo phiếu bảo trì" ở màn Admin xem báo cáo mở form tạo phiếu với `inspection` điền sẵn thông tin sân, hạng mục, mô tả, ảnh, mức độ (nghiêm trọng ⇒ gợi ý `urgent` + đóng sân ngay).
      2. **Chi tiết phiếu:** hiện nhật ký `MaintenanceLog` và các `Inspection` liên quan (chỉ đọc) và nút "Thực hiện bảo trì" mở màn POS.
      3. **Duyệt cuối:** nút "Hoàn thành / Trả về làm lại" đọc lần `Inspection acceptance` gần nhất.
      4. **Đổi trạng thái:** MỌI thao tác (kể cả endpoint cũ `PUT /:id/status`) đi qua `changeTicketStatus(ticketId, toStatus, { by, note, session })` — ✅ đã xong, controller chỉ là wrapper.
      - Trang thống kê bảo trì gộp cả phiếu, nhật ký và báo cáo kiểm tra.

    ***
    - **📋 CỤM A (mã N1.x) — Lập & quản lý phiếu, đóng/mở sân (giao diện Admin):**
      1. ✅ **N1.1 Nền (XONG — Phase 1):** mở rộng schema `Maintenance` và enum trạng thái; `Counter` + `ticketCode` sinh bằng `findOneAndUpdate({ $inc: { seq: 1 } }, { upsert: true, new: true })` (không dùng `count + 1`) + unique index; script migrate `backend/migrateMaintenanceV2.js` gán mã và giá trị mặc định cho phiếu cũ (đã chạy, 3 phiếu cũ có mã, index cũ đã drop); hàm `changeTicketStatus` với state machine + `statusHistory` + downtime + đồng bộ sân (transaction); self-check `node backend/testMaintenanceV2.js` — 17/17 đạt.
      2. ✅ **N1.2 Tạo phiếu:** form trong `AdminMaintenance.jsx` đã có hạng mục, ưu tiên, **đóng sân / việc nhỏ không chặn lịch**, người thực hiện (nhân viên/nhà thầu + SĐT), preview xung đột (chỉ hiện khi đóng sân; phiếu việc nhỏ backend bỏ qua xung đột). Nút "từ báo cáo" (`?inspection=`) chờ Phase 4 ghép.
      3. ✅ **N1.3 Danh sách phiếu:** tìm theo mã/tiêu đề/sân (client-side), tabs đủ 6 trạng thái, sắp xếp **quá hạn → ưu tiên → mới nhất**, chip Quá hạn + nâng ưu tiên hiển thị (tính khi đọc, không cron). Lọc theo khoảng ngày: chưa làm (thiếu nhu cầu thực tế — ghi backlog nhỏ).
      4. ✅ **N1.4 Chi tiết phiếu:** trang riêng `/admin/maintenance/:id` (`MaintenanceTicketDetail.jsx`) — timeline `statusHistory` (tên người + note), thông tin v2, chi phí tách 3 nguồn, **nhật ký `MaintenanceLog` + kiểm tra nghiệm thu `Inspection` hiển thị chỉ đọc** (tự hiện khi có dữ liệu ở Phase 5–6), nút hành động theo trạng thái. Ảnh trước/sau: chờ hạ tầng upload Phase 4.
      5. ✅ **N1.5 Sửa phiếu theo trạng thái:** backend whitelist theo status (`EDITABLE_FIELDS_BY_STATUS`) — pending sửa hết; đang làm chỉ 5 field; completed chỉ chi phí/hóa đơn **kèm lý do bắt buộc**; cancelled khóa. UI: modal Sửa trong trang chi tiết hiện field đúng theo trạng thái. Mọi lần sửa ghi một `statusHistory` note "Sửa: ...".
      6. ✅ **N1.6 Xóa mềm & Hủy:** `DELETE` giờ set `isDeleted` (không xóa cứng); chỉ pending (chưa có log/nghiệm thu) hoặc cancelled; completed từ chối; đang làm → thông báo phải Hủy. Hủy từ in_progress/on_hold **bắt buộc lý do** (enforce trong `changeTicketStatus`). Danh sách/sơ đồ/slot chặn đều lọc `isDeleted`.
      7. ✅ **N1.7 Chặn đặt/thuê sân (XONG — Phase 3):** MỘT nguồn sự thật trong `maintenanceService`: `getBlockingInfo(courtId)` → {suspended, windows}, `isSlotBlocked(courtId, date, start, end)` (tạm ngưng thắng trước — chặn mọi slot; phiếu `requiresClosure` chặn theo cửa sổ; phiếu việc nhỏ & phiếu `isDeleted` không chặn), `getSuspendedCourtIds()` bulk 2-query. Đã nối vào: `checkMaintenanceConflict` (booking vãng lai — message riêng khi tạm ngưng), đặt lịch tháng (block trực tiếp + `bulkCheckConflicts`), walk-in POS (dùng session), `GET /maintenance/active-courts` (+= `suspendedCourts`), board POS (trạng thái mới `suspended`). Frontend: BookingPage banner "Sân đang tạm ngưng nhận khách" + khóa 2 form submit, `CourtsPage` badge "Tạm ngưng" + hết nút đặt, `POSDashboard`/`POSWalkIn` thêm cấu hình `suspended` (cam). Test: section 7 của `testMaintenanceV2.js` (9 check). **Ghi chú còn lại của N1.7:** "giờ đóng sân loại khỏi mẫu số công suất lấp đầy" để Phase 7 (N1.11).
      8. ✅ **N1.8 Duyệt kết quả cuối:** gate nằm trong `changeTicketStatus` (state machine, chạy trong transaction): `pending_acceptance → completed` bị **400 nếu không có `Inspection acceptance`**, hoặc **lần gần nhất = fail**; `pending_acceptance → in_progress` (trả về làm lại) bắt buộc lý do. *(Ngoại lệ có chủ đích: đường tắt legacy `in_progress → completed` không gate — để UI cũ/emergency dùng; cân nhắc bỏ khi Phase 7 xong.)* Nút Duyệt/Trả về đã có ở trang chi tiết từ Phase 2; chi phí chốt từ log khi completed (N1.9). E2e: `node testPhase6API.js` 14/14.
      9. **N1.9 Chi phí:** `costTotal = costLabor + costMaterial + costContractor`; `costLabor/costMaterial` **tính từ `MaintenanceLog`** (chỉ đọc, tính khi xem và khi hoàn thành); `costContractor`, `invoiceNo`, `attachments` do Admin nhập. `isUnderWarranty = true` → chi phí 0 nhưng **vẫn ghi nhận** để đánh giá nhà thầu.
      10. **N1.10 Calendar/Timeline sân:** màu phiếu — sửa chữa (sọc đỏ gạch), khẩn cấp (đỏ đậm), sân tạm ngưng (viền cam), chấm cảnh báo quá hạn.
      11. **N1.11 Báo cáo:** chi phí bảo trì theo sân/tháng/hạng mục (tính theo `actualEnd`, nối vào báo cáo lợi nhuận ròng đã có); **downtime** và ước tính **doanh thu mất** = downtime × giá thuê trung bình; so sánh **nhà thầu**; số phiếu theo loại. Dùng Aggregation Pipeline.
      12. **N1.12 (Để sau, chỉ làm nếu còn thời gian) Bảo trì định kỳ tự động:** model `MaintenancePlan` (chu kỳ ngày/tuần/tháng/quý/năm, `basedOn: calendar | completion`, khung giờ ưu tiên, `requiresClosure`, mục kiểm tra mẫu, `nextDueAt`) + trang Admin + cron `node-cron` mỗi đêm sinh phiếu `type: preventive` (idempotent bằng unique index `{ planId, dueDate }`, catch-up khi khởi động, xếp khung giờ trống, **dời khung nếu đụng khách chứ không hủy khách**).
      - ✅ **Index CỤM A (đã tạo):** `ticketCode` (unique); `{ court:1, status:1, startDate:1, endDate:1 }`; `{ status:1, priority:-1, endDate:1 }`; `{ inspection:1 }`; `{ isDeleted:1, createdAt:-1 }`. (Dùng field `court`/`startDate`/`endDate` dạng String "YYYY-MM-DD" như model cũ — không đổi tên để không vỡ truy vấn đang chạy; String date YYYY-MM-DD so sánh đúng thứ tự và index được.)

    - **📋 CỤM B (mã N2.x) — Kiểm tra sân, báo cáo & tự bảo trì (giao diện POS + màn xem báo cáo của Admin):**
      1. ✅ **N2.1 Mục kiểm tra mẫu (`ChecklistTemplate`):** model + seed mặc định (chạy `node seedMaintenance.js` khi DB trống) + màn Admin CRUD trong `AdminInspections.jsx` (thêm / bật-tắt, không xóa cứng).
      2. ✅ **N2.2 Kiểm tra sân (POS):** màn `/pos/checklist` (`POSCourtCheck.jsx`) — chọn sân (chip badge "Chưa kiểm tra hôm nay"), chạm từng mục Đạt/Cần lưu ý/Hỏng + ghi chú lỗi, chọn mức độ (nhẹ/cần sửa/nghiêm trọng, có cảnh báo xác nhận khi nghiêm trọng), gửi báo cáo; khối "Báo cáo hôm nay". Ảnh: chưa có hạ tầng upload (để sau, field `photos[]` đã sẵn trong schema).
      3. ✅ **N2.3 Sân tạm ngưng khi nghiêm trọng:** gửi severity critical ⇒ derived chặn đặt có hiệu lực tức thì (Phase 3), màn POS hiện cảnh báo + board POS "Tạm ngưng chờ xác nhận"; menu Admin hiện badge **số báo cáo chờ xử lý** (poll 60s).
      4. ✅ **N2.4 Admin xem & xử lý báo cáo:** `/admin/inspections` (`AdminInspections.jsx`) — tabs Chờ xử lý / Đã tạo phiếu / Đã bỏ qua / Tất cả (trạng thái suy ra, có counts), card chi tiết (sân, mức độ, người kiểm, mục lỗi, mô tả), nút **"Tạo phiếu bảo trì"** (mở form AdminMaintenance điền sẵn qua `?inspection=` — critical ⇒ urgent + đóng sân + emergency; needs_repair ⇒ high + đóng; minor ⇒ low + việc nhỏ) và **"Bỏ qua"** (bắt buộc lý do; từ chối nếu báo cáo đã có phiếu). Link ngược Phiếu ↔ Báo cáo 2 chiều. Test e2e: `node testPhase4API.js` — 15/15.
      5. ✅ **N2.5 Danh sách sân cần bảo trì:** `GET /api/maintenance-logs/queue` — phiếu `pending/in_progress/on_hold` (ẩn `isDeleted`), quá hạn tính khi đọc, kèm "ai đang làm" (log open + openByMe), sắp khẩn → quá hạn; khối "sân chờ Admin tạo phiếu" (báo cáo chưa phiếu). Màn `/pos/maintenance`.
      6. ✅ **N2.6 Bắt đầu bảo trì:** `POST /start {ticketId}` — pending/on_hold, cùng người thì dùng lại ca dở; **unique index partial `{ticket, status:"open"}`** chặn 2 người nhận cùng phiếu (race-safe, 409). Tạo log open + `changeTicketStatus(→ in_progress)` trong 1 transaction.
      7. ✅ **N2.7 Ghi nhận quá trình:** panel trong `POSMaintenance.jsx` — thêm/sửa từng việc (steps), vật tư (name×qty×unitCost), công/vật tư/khác (đ), ghi chú; [Lưu] khi đang làm; 1 phiếu nhiều log (nhiều ca). Nhà thầu: nhân viên ghi via steps/note, chi phí nhà thầu Admin nhập trên phiếu (đã có từ Phase 2).
      8. ✅ **N2.8 Sửa/hủy nội dung đã bảo trì:** `PUT /:id` chỉ chủ ca (hoặc admin), bị khóa khi phiếu `completed` (403); `POST /:id/void {reason bắt buộc}` — **không xóa log bao giờ**, chỉ `voided`.
      9. ✅ **N2.9 Tạm dừng / Hoàn tất:** `POST /pause {ticketId, reason}` đóng ca mở + → `on_hold` (lý do vào timeline); `POST /finish {ticketId}` đóng ca + → `pending_acceptance` (sân **chưa mở** — verify cảnh 4 e2e). Cả 2 chạy trong transaction với changeTicketStatus.
      10. ✅ **N2.10 Kiểm tra lại sau sửa (nghiệm thu):** `POST /api/inspections/acceptance {ticketId, items, result, failReason}` (`posStaffOnly`) — chỉ khi phiếu `pending_acceptance` (400 nếu không), `fail` bắt buộc lý do, được gửi nhiều lần (mỗi lần 1 `Inspection type=acceptance`, lần gần nhất được tính). UI: khối "Chờ nghiệm thu" trong `/pos/maintenance` (checklist theo `category` của phiếu, chạm Đạt/Không-đạt từng mục + tổng kết; có mục Hỏng thì không cho báo ĐẠT; hiện kết quả lần kiểm trước).
      11. **N2.11 Thống kê kiểm tra:** tỷ lệ đạt/không đạt, hạng mục và sân hay lỗi, thời gian xử lý trung bình (từ lúc bắt đầu đến khi duyệt hoàn thành), số sân bị bỏ sót kiểm tra trong ngày.
      - ✅ **Index CỤM B (đã tạo trong model):** `MaintenanceLog`: `{ ticket:1, startedAt:-1 }`, `{ performedBy:1, status:1 }`; `Inspection`: `{ court:1, date:-1 }`, `{ ticket:1, createdAt:-1 }`, `{ type:1, severity:1 }`.

    - **Quy tắc làm việc (cho agent):**
      - Một người làm hết theo thứ tự Phase bên dưới — không còn quy tắc chia file/sở hữu.
      - Mã code đặt tên tiếng Anh, comment tiếng Việt (theo quy ước dự án).
      - Mọi đổi trạng thái phiếu chỉ qua `changeTicketStatus` (maintenanceService) — không controller nào tự gán `status`.

    - **Thứ tự làm (solo, mỗi Phase kết thúc bằng 1 cảnh nghiệm thu chạy được):**
      - ✅ **Phase 1 — Nền:** N1.1 + N2.1 (model + seed) + `changeTicketStatus` + state machine 6 trạng thái + migration. **XONG 2026-11-08**, self-check `node testMaintenanceV2.js` 17/17 đạt.
      - ✅ **Phase 2 — Phiếu (N1.2–N1.6): XONG.** Form tạo có field v2 + chế độ đóng/không đóng sân; danh sách tìm mã + 6 tabs + sắp quá hạn/ưu tiên; trang chi tiết riêng `/admin/maintenance/:id`; sửa theo whitelist trạng thái; xóa mềm + Hủy bắt buộc lý do. Build frontend OK, self-check backend 19/19. Nút "từ báo cáo" (`?inspection=`) chờ Phase 4 ghép.
      - ✅ **Phase 3 — Chặn lịch (N1.7): XONG.** `isSlotBlocked`/`getBlockingInfo`/`getSuspendedCourtIds` trong maintenanceService — 5 điểm chặn backend + 4 màn frontend dùng chung một nguồn. Self-check 28/28, build OK. Test tay: cảnh 1 (việc nhỏ vẫn đặt), cảnh 2 (tạm ngưng chặn hết — chèn `Inspection` critical bằng mongosh tới khi API Phase 4 ra đời), cảnh 3 (dismissal hết chặn).
      - ✅ **Phase 4 — Kiểm tra & báo cáo (N2.1–N2.4): XONG.** `inspectionController` + routes `/api/inspections` (checklist CRUD, gửi báo cáo POS, danh sách + trạng thái suy ra + counts, pending-count, dismiss bắt buộc lý do); màn POS `POSCourtCheck`; màn Admin `AdminInspections` + badge menu; form tạo phiếu điền sẵn từ báo cáo (`?inspection=`). Test e2e `node testPhase4API.js` 15/15, regression `testMaintenanceV2.js` 28/28, build OK.
      - ✅ **Phase 5 — POS thực hiện (N2.5–N2.9): XONG.** `maintenanceLogController` + routes `/api/maintenance-logs` (queue, start/pause/finish transaction, PUT/void log, unique index 1-ca-mở/phiếu); màn `/pos/maintenance`. N1.9 chốt một nửa: `changeTicketStatus` completed **aggregate cost từ log** (trừ voided) + detail page hiển thị live-sum. E2e `node testPhase5API.js` 26/26 (kèm cảnh 4), regression `testMaintenanceV2.js` 28/28, build OK.
      - ✅ **Phase 6 — Nghiệm thu (N2.10, N1.8, N1.9): XONG.** `POST /inspections/acceptance` (chỉ khi pending_acceptance, fail cần lý do, nhiều lần — lần gần nhất tính); gate trong `changeTicketStatus`: duyệt từ `pending_acceptance` cần acceptance gần nhất = pass, trả về làm lại cần lý do; `completed` aggregate costLabor/Material từ log (trừ voided) + costTotal 3 nguồn; queue trả `acceptanceTasks` kèm lastAcceptance; panel "Chờ nghiệm thu" trong `/pos/maintenance`. Test: `testPhase6API.js` 14/14, `testPhase5API.js` 27/27, regression `testMaintenanceV2.js` 28/28, build OK. **Cảnh 5, 6, 7 chạy trọn bằng UI.**
      - ✅ **Phase 7 — Chốt (N1.10, N1.11, N2.11): XONG (2026-11-09).** `GET /api/analytics/maintenance?from=&to=` — chi phí/downtime theo hạng mục·sân·tháng (theo `actualEnd`, phiếu cũ fallback `completedAt`), doanh thu mất = downtime × giá từng sân, so sánh nhà thầu (`contractor.name` fallback `assignedTo`, kèm số phiếu bảo hành), số phiếu theo loại; occupancy: chỉ phiếu `requiresClosure` + trạng thái hiệu lực (chưa xóa mềm) mới loại khỏi mẫu số (N1.11). N2.11: tỷ lệ nghiệm thu đạt, mục/sân hay hỏng nhất, sân chưa kiểm hôm nay, TB phút xử lý. UI: tab **"Bảo trì"** trong Thống kê + trang **Lịch bảo trì** `/admin/maintenance/calendar` (sọc đỏ gạch sửa chữa / đỏ đậm khẩn cấp / xanh định kỳ / viền cam tạm ngưng / ⚠ quá hạn, click bar vào chi tiết phiếu). Test: `testPhase7API.js` 13/13; toàn bộ P1–P7 xanh; build OK. **Nợ cố ý còn lại:** ảnh hiện trường (chờ endpoint upload chung), nối tắt `in_progress→completed` không gate (cho UI cũ/emergency), N1.12 cron để sau.
      - **(Còn thời gian) N1.12:** bảo trì định kỳ tự động.

    - **Quy trình Git (solo):** làm trực tiếp trên `feature/maintenance-v2` (nhánh hiện tại), tag `before-maintenance-v2` đã có ở main; chỉ merge về `main` khi trọn 8 kịch bản nghiệm thu. Không commit `.env`.

    - **Kịch bản nghiệm thu chung (chạy trên cùng bộ seed trước khi merge vào `main`):**
      1. Nhân viên kiểm tra thấy lỗi nhẹ → gửi báo cáo → Admin tạo phiếu **việc nhỏ không đóng sân** → khách **vẫn đặt được** sân.
      2. Nhân viên báo lỗi **nghiêm trọng** → sân **tạm ngưng ngay**, khách không đặt được → Admin tạo phiếu đóng sân → khách đã đặt trong khung giờ được xử lý bằng luồng xung đột.
      3. Admin **Bỏ qua** báo cáo nghiêm trọng (có lý do) → sân hết tạm ngưng.
      4. Nhân viên bắt đầu → ghi nhật ký nhiều ngày → tạm dừng → hoàn tất → phiếu `Chờ nghiệm thu`, sân vẫn đóng.
      5. Nhân viên kiểm tra lại **đạt** → Admin **Hoàn thành** → sân mở lại, khách đặt được; chi phí và downtime ghi đúng.
      6. Nhân viên kiểm tra lại **không đạt** → Admin **Trả về làm lại** → phiếu về `Đang bảo trì`, sân tiếp tục đóng.
      7. Chặn đúng quy tắc: sửa/xóa phiếu `Completed`; xóa phiếu đã có nhật ký (chỉ được Hủy); bấm Hoàn thành khi chưa có lần kiểm tra lại đạt; nhân viên POS thử tạo/hủy phiếu.
      8. Số liệu trên báo cáo (chi phí, thời gian đóng sân, tỷ lệ đạt) khớp với dữ liệu phiếu và nhật ký.

- [ ] **SẮP LÀM (BACKLOG):**
  - [ ] **Dịch vụ căng dây & sửa vợt (Racket Stringing & Repair Service) + nâng cấp quản lý vợt cho thuê:**
    - **Phạm vi (đã chốt):** Sân chỉ có **vợt cho thuê** và **dịch vụ căng dây/sửa vợt cho khách**. Sân **không bán vợt**, nên **không làm** module bảo hành của hãng và không có luồng gửi hãng sửa. Chỉ có **bảo hành dịch vụ của chính sân** (căng lại miễn phí nếu lỗi do thợ, trong thời hạn ngắn), tích hợp thẳng vào phiếu dịch vụ.

    - **PHẦN A — Phiếu dịch vụ căng dây/sửa vợt (trọng tâm):**
      - **Các loại dịch vụ (Admin cấu hình bảng giá):**
        - `stringing` (căng dây), `grip` (thay quấn cán), `frame_repair` (sửa khung/dán lại), `other` (vệ sinh/khác).
        - Giá công theo loại dịch vụ. Dây và quấn cán do sân bán được tính riêng, lấy từ `Products` (category mới `string`, `grip`). Khách được chọn dây của sân hoặc tự mang dây (`isCustomerString = true`, không tính tiền dây, không trừ kho).

      - **Model `RacketServiceTicket`:**

        ```
        {
          ticketCode (unique, tự sinh, VD "SV-20261011-001"),
          customerId (ref, optional), customerName, customerPhone,
          racketBrand, racketDescription, conditionAtReceive, photos[],
          serviceType: "stringing" | "grip" | "frame_repair" | "other",
          stringProductId (ref Products, optional), isCustomerString,
          tensionLbs, serviceFee, materialFee, totalAmount,
          status, receivedAt, estimatedReadyAt, completedAt, pickedUpAt,
          receivedBy (staffId), processedBy (staffId/technicianId),
          paymentStatus: "unpaid" | "paid",
          loanedRacketId (ref Racket, optional),
          // --- bảo hành dịch vụ tích hợp ---
          warrantyUntil, isWarrantyClaim, originalTicketId (ref),
          warrantyDecision: "accepted" | "rejected" | null, warrantyNote,
          note
        }
        ```

      - **Trạng thái phiếu (`status`):**
        - `received` (Đã tiếp nhận): nhận vợt, ghi tình trạng, ảnh lúc nhận.
        - `in_progress` (Đang xử lý): thợ đang làm.
        - `completed` (Hoàn thành, chờ khách lấy): đã xong, chờ khách đến nhận.
        - `picked_up` (Đã trả khách): đã thanh toán và giao vợt.
        - `cancelled` (Đã hủy): khách hủy trước khi làm hoặc từ chối giá.

      - **Quy trình nghiệp vụ:**
        `Khách mang vợt đến` → `POS tiếp nhận` (tạo phiếu, chọn dịch vụ, dây, lực căng, ghi tình trạng/chụp ảnh, báo giá và giờ hẹn trả) → _(tùy chọn)_ `Cho mượn vợt tạm` → `Thợ xử lý` (trừ kho dây/cán khi bấm hoàn thành) → `Hoàn thành, chờ lấy` → `Khách đến lấy` → `Thanh toán + giao vợt` (thu tiền, ghi `Transaction`, cộng vào `ShiftReport`) → `Đóng phiếu` và tính `warrantyUntil`.
        - **Thu tiền lúc trả vợt**, không thu lúc nhận, đúng thực tế các tiệm căng dây. Nếu khách hủy giữa chừng khi thợ đã làm, tính phí công theo cấu hình.

      - **Bảo hành dịch vụ (tích hợp trong phiếu, không tách module):**
        - Khi trả vợt, hệ thống tự tính `warrantyUntil = pickedUpAt + warrantyDays` (Admin cấu hình, VD 3–7 ngày, áp dụng cho căng dây/thay cán).
        - Khách quay lại phàn nàn (đứt dây sớm, căng sai lực) → POS tra phiếu cũ theo SĐT/mã phiếu → hệ thống kiểm tra còn trong `warrantyUntil` hay không → nhân viên chọn `accepted` (tạo phiếu mới, `isWarrantyClaim = true`, `originalTicketId` trỏ phiếu gốc, tiền công = 0) hoặc `rejected` (ghi lý do, tính phí bình thường).
        - **Không bảo hành:** quá hạn, lỗi do khách (đập vợt xuống sàn, va đập, đánh đứt do dùng mạnh), dây khách tự mang bị lỗi chất lượng. Danh sách lý do từ chối là enum để báo cáo.
        - Phiếu bảo hành giá 0đ vẫn trừ kho dây (vật tư thực tế đã dùng), tính vào chi phí, không tính vào doanh thu.

      - **Vợt cho mượn tạm trong lúc chờ sửa:**
        - POS chọn 1 vợt từ đội vợt cho thuê, liên kết `loanedRacketId` vào phiếu, vợt chuyển trạng thái `loaned`.
        - Khi khách nhận vợt về, bắt buộc trả vợt mượn trước khi đóng phiếu (kiểm tra tình trạng vợt mượn như lúc trả vợt thuê). Hư/mất tính phí theo bảng phí hư hỏng.
        - Cho mượn tạm **miễn phí hay tính phí** do Admin cấu hình.

      - **Xử lý xung đột / tình huống đặc biệt:**
        - _Hết dây/quấn cán:_ chặn tại Backend khi chọn dây có tồn kho = 0, gợi ý loại dây thay thế. Cảnh báo `lowStockThreshold` cho Admin.
        - _Hết vợt mượn tạm:_ cho phép tạo phiếu không mượn, thông báo rõ cho nhân viên.
        - _Khách không đến lấy vợt:_ sau X ngày (config) sau `completed`, hệ thống cảnh báo Admin/POS gọi khách; quá Y ngày thì đánh dấu `unclaimed` theo chính sách sân.
        - _Quá giờ hẹn trả:_ cảnh báo phiếu trễ `estimatedReadyAt` mà chưa `completed`.
        - _Phiếu bảo hành gửi cho phiếu gốc đã hết hạn:_ chặn `accepted`, chỉ cho `rejected` hoặc tạo phiếu thường.

      - **Phân quyền:**
        - `pos_staff`: tiếp nhận, cập nhật trạng thái, thu tiền, trả vợt, xử lý bảo hành trong thời hạn.
        - (Tùy chọn) role `technician` chỉ thấy phiếu cần làm và bấm bắt đầu/hoàn thành, không xem tiền.
        - `admin`: cấu hình bảng giá/số ngày bảo hành, duyệt bảo hành đặc biệt (ngoài hạn), xem báo cáo.

    - **PHẦN B — Nâng cấp quản lý vợt cho thuê (quản lý theo từng cây):**
      - **Model `Racket`:** mỗi cây vợt có mã riêng (dán tem/QR):
        ```
        { code (unique, VD "VOT-014"), brand, model, tier: "standard" | "premium",
          status, rentalCount, purchasePrice, purchaseDate, condition, note }
        ```
        Giá thuê và mức cọc theo `tier`.
      - **Vòng đời `Racket.status`:** `available` → `rented` → `pending_inspection` (khách vừa trả) → `available` hoặc `needs_maintenance` → `in_maintenance` → `available`; ngoài ra có `loaned` (đang cho khách mượn tạm), `retired` (thanh lý), `lost`.
      - **Kiểm tra lúc giao và lúc trả (`RacketInspection`):** `{ racketId, bookingId, type: "handover" | "return", checklist {frame, string, grip}, photos[], staffId }`. Làm bằng chứng tính phí hư hỏng, nối vào luồng **cọc** đã có trong Check-out.
      - **Bảng phí hư hỏng (Admin cấu hình):** đứt dây, thay quấn cán, cong/nứt khung, mất vợt. Phí được trừ vào cọc hoặc cộng vào bill Check-out.
      - **Bảo dưỡng vợt cho thuê:** căng lại dây khi đứt/chùng, thay quấn cán định kỳ → tạo phiếu **nội bộ** dùng chung `RacketServiceTicket` (`customerId = null`, `isInternal = true`, giá 0đ), chi phí vật tư tính vào chi phí/lợi nhuận ròng trong báo cáo.
      - **Cảnh báo tuổi thọ:** khi `rentalCount` vượt ngưỡng (config) → cảnh báo kiểm tra hoặc thanh lý.
      - **Mở rộng (làm sau):** đặt vợt trước theo khung giờ (Conflict Check availability như sân), báo cáo ROI từng cây vợt (doanh thu thuê so với giá mua + chi phí bảo dưỡng).

    - **Tích hợp với các module đã có:**
      - `Transaction`: thu tiền khi trả vợt, loại `payment`; hoàn/trừ phí hư hỏng. Giai đoạn này thanh toán bằng **tiền mặt hoặc chuyển khoản xác nhận tay** vì VNPay chưa hoàn thiện, sau này tự dùng luồng VNPay khi hoàn tất.
      - `ShiftReport`: tiền mặt thu từ phiếu dịch vụ cộng vào `cashRevenue` của ca hiện tại, chuyển khoản cộng vào `totalTransferIn`.
      - `Products`: dây, quấn cán dùng lại bảng sản phẩm và tồn kho hiện có.
      - Báo cáo: thêm nhóm doanh thu `racket_service`, tách riêng khỏi tiền sân và dịch vụ bán hàng.

    - **UX/UI:**
      - _POS:_ màn **"Dịch vụ vợt"** gồm danh sách phiếu lọc theo trạng thái (tab: Đã nhận / Đang xử lý / Chờ lấy / Quá hạn), nút **"Tiếp nhận vợt"** (form nhanh: SĐT tự gợi ý khách cũ, loại dịch vụ, dây, lực căng, giờ hẹn), tìm phiếu theo SĐT hoặc mã phiếu, nút **"Trả vợt & Thanh toán"**, nút **"Yêu cầu bảo hành"** hiện khi còn trong hạn.
      - _In/hiển thị mã phiếu_ (hoặc QR) để khách mang đến nhận vợt.
      - _Khách hàng (web):_ xem trạng thái phiếu của mình theo SĐT/mã phiếu (Đang xử lý / Đã xong, đến lấy).
      - _Admin:_ cấu hình bảng giá dịch vụ, số ngày bảo hành, phí hư hỏng; quản lý danh sách `Racket`; báo cáo.
      - Badge trạng thái phiếu: 🔵 Đã nhận, 🟡 Đang xử lý, 🟠 Chờ khách lấy, 🟢 Đã trả khách, ⚪ Đã hủy.

    - **Báo cáo đặc thù:**
      - Doanh thu dịch vụ vợt theo ngày/tháng và theo loại dịch vụ.
      - Lượng dây/quấn cán tiêu thụ, loại dây bán chạy.
      - Tỷ lệ bảo hành (số phiếu `isWarrantyClaim` so với tổng phiếu, tỷ lệ `accepted`/`rejected`), giúp đánh giá chất lượng thợ.
      - Chi phí bảo dưỡng vợt cho thuê, đưa vào báo cáo lợi nhuận ròng.

    - **Giải thuật MongoDB:**
      - Index: `ticketCode` (unique), `customerPhone`, `{ status: 1, estimatedReadyAt: 1 }` (quét phiếu trễ hẹn), `{ status: 1, completedAt: 1 }` (phiếu chờ lấy lâu), `warrantyUntil`, `originalTicketId`. Với `Racket`: `code` (unique), `{ status: 1, tier: 1 }`.
      - Dùng **Mongoose Transaction (Session)** khi hoàn thành phiếu/trả vợt: cập nhật `RacketServiceTicket`, trừ kho `Products`, cập nhật `Racket.status` (vợt mượn), tạo `Transaction`, cập nhật `ShiftReport`. Tất cả cùng thành công hoặc cùng rollback.
      - Trừ kho dây/cán tại thời điểm thợ bấm **hoàn thành**, kèm kiểm tra tồn kho trong cùng transaction để tránh âm kho.
      - Báo cáo dùng Aggregation Pipeline (`$match` ngày, `$group` theo `serviceType`/tháng).

    - **Thứ tự triển khai gợi ý (để agent làm từng bước):**
      1. Model `Racket`, `RacketServiceTicket`, bảng cấu hình giá/bảo hành (Settings) và seed dữ liệu mẫu.
      2. API và UI POS: tiếp nhận, đổi trạng thái, trả vợt và thanh toán (kèm trừ kho, `Transaction`, `ShiftReport`).
      3. Bảo hành tích hợp (kiểm tra `warrantyUntil`, phiếu bảo hành giá 0đ).
      4. Vợt mượn tạm + quản lý `Racket` theo vòng đời, `RacketInspection`, phí hư hỏng nối vào cọc Check-out.
      5. Báo cáo và cảnh báo (trễ hẹn, chờ lấy lâu, tồn kho dây thấp).

  - [ ] **Tích hợp cổng thanh toán VNPay (Sandbox) — dùng chung cho Online & POS.**
    - **Trạng thái hiện tại:** mới xong **giao diện cơ bản**. **Chưa có** backend tạo giao dịch, xử lý IPN, sinh QR. Cấu hình đã có trong `backend/.env`: `VNP_TMN_CODE`, `VNP_HASH_SECRET`, `VNP_URL`, `VNP_RETURN_URL`, `VNP_IPN_URL` (cần ngrok khi test local).
    - **Model `Transaction`:**
      ```
      { _id, orderId (duy nhất, dùng làm vnp_TxnRef),
        bookingId (ref, optional), serviceOrderId (ref, optional), serviceTicketId (ref, optional),
        amount, method: "vnpay" | "cash" | "transfer",
        type: "payment" | "refund", status: "pending" | "success" | "failed",
        vnpTransactionNo, vnpResponseCode, vnpBankCode, createdAt, paidAt }
      ```
    - **Luồng Online (Redirect):** tạo `Transaction` (`pending`) → build URL (`vnp_Amount` x100, `vnp_TxnRef`, `vnp_OrderInfo`, `vnp_ReturnUrl`, `vnp_IpAddr`...; sort alphabet; ký `HMAC SHA512` bằng `VNP_HASH_SECRET`) → redirect → `VNP_RETURN_URL` chỉ để hiển thị UI, **không dùng để xác nhận thanh toán** → IPN verify chữ ký, `vnp_ResponseCode = "00"` thì cập nhật `Transaction.status = success`, `paymentStatus = paid`. Trả đúng JSON `{RspCode, Message}` cho VNPay.
    - **Luồng POS (VNPAY-QR):** nhân viên chọn chuyển khoản ở Check-out → backend sinh QR → frontend hiển thị và polling theo `orderId` → IPN về cùng endpoint → tự cập nhật `Transaction`, `Booking`/phiếu dịch vụ, `ShiftReport.totalTransferIn`, không cần nhân viên xác nhận tay.
    - **Trường hợp đặc biệt:** khách đóng trình duyệt (IPN vẫn chạy ngầm); giao dịch `pending` quá X phút thì cron chuyển `failed`; IPN gọi trùng thì idempotent (trả `RspCode: "02"` nếu đã `success`).
    - **Bảo mật:** `VNP_HASH_SECRET` chỉ ở Backend; luôn verify chữ ký ở IPN; `.env` không commit, cập nhật `.env.example` (không chứa giá trị thật).
    - **Thủ công song song:** chạy `ngrok http <port>` khi test, cập nhật `VNP_IPN_URL` mỗi lần đổi URL; test bằng thẻ test của Sandbox VNPay.
  - [ ] Làm chuẩn chỉnh lại phần Auth (JWT, Refresh Token, Quên mật khẩu, OTP, Phân quyền Middleware — cần mở rộng role `pos_staff`, tùy chọn `technician`).

## 3. Quy ước viết code (Coding Standards)

- **Ngôn ngữ:** Code bằng tiếng Anh (biến, hàm, tên Model/Collection trong MongoDB), comment và giải thích logic bằng tiếng Việt.
- **Xử lý logic:** Tất cả logic kiểm tra trùng lịch (Conflict Check) phải được xử lý ở Backend bằng các truy vấn `Mongoose/MongoDB` (Sử dụng `Session/Transaction` nếu cần để tránh race condition).
- **Yêu cầu AI:** Tập trung vào giải thuật tối ưu cho MongoDB (ví dụ: cách index trường dữ liệu ngày tháng, cách dùng toán tử để truy vấn nhanh). Không viết giải thích lý thuyết dông dài, hãy đi thẳng vào code thực tế.
