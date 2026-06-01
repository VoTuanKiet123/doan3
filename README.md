# Hướng dẫn chạy dự án

## Yêu cầu
- Node.js >= 18
- MongoDB đang chạy (local hoặc Atlas)

## Cách chạy

### 1. Backend
```bash
cd backend
npm run dev
# Chạy tại: http://localhost:5000
```

### 2. Frontend
```bash
cd frontend
npm run dev
# Chạy tại: http://localhost:5173
```

## Tài khoản Admin đầu tiên
Để tạo tài khoản admin, dùng MongoDB Compass hoặc mongosh để sửa field `role` thành `"admin"` cho user vừa đăng ký.

```js
// Trong mongosh
use badminton_db
db.users.updateOne({ email: "admin@email.com" }, { $set: { role: "admin" } })
```
