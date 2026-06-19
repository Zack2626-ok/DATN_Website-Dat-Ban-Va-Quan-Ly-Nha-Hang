# 🖼️ Image Upload App

Ứng dụng upload ảnh đơn giản với React + Node.js + Express.

---

## 📋 Yêu cầu trước khi bắt đầu

**Cài đặt những thứ sau trên máy:**

- **Node.js >= 18** → [Download](https://nodejs.org)
- **npm >= 9** (kèm theo Node.js)
- **Git** → [Download](https://git-scm.com)

**Kiểm tra đã cài chưa:**

```bash
node --version    # Phải >= v18.x.x
npm --version     # Phải >= 9.x.x
git --version     # Phải >= 2.x.x
```

---

## 🚀 Hướng dẫn khởi động (Cách nhanh nhất)

### **Bước 1: Clone repository**

```bash
git clone <repo-url>
cd todo-project
```

### **Bước 2: Setup Backend (Terminal 1)**

```bash
cd be

# Cài dependencies
npm install

# Tạo file .env
cp .env.example .env

# Nếu bạn muốn dùng MySQL cho backend (khuyên dùng khi làm nhóm)
# 1. Cài MySQL nếu chưa cài.
# 2. Mở MySQL shell hoặc client:
#    mysql -u root -p
# 3. Tạo database:
#    CREATE DATABASE todo_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
# 4. Nếu cần user riêng:
#    CREATE USER 'todo_user'@'localhost' IDENTIFIED BY 'your_password';
#    GRANT ALL PRIVILEGES ON todo_app.* TO 'todo_user'@'localhost';
#    FLUSH PRIVILEGES;
# 5. Cập nhật DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME trong .env.

**Chạy Backend:**

```bash
npm run dev
```

**Kết quả:** Sẽ thấy dòng này ✅

```
🚀 Server chạy tại http://localhost:5000
```

### **Bước 3: Setup Frontend (Terminal 2 - mở terminal khác)**

```bash
cd fe

# Cài dependencies
npm install

# Chạy Frontend
npm run dev
```

**Kết quả:** Sẽ thấy dòng này ✅

```
  ➜  Local:   http://localhost:5173/
```

---

## ✅ Kiểm tra server hoạt động

**Mở browser truy cập:** `http://localhost:5000/health`

**Phản hồi thành công:**

```json
{
  "status": "ok",
  "timestamp": "2026-06-11T10:30:45.123Z"
}
```

---

## 📂 Cấu trúc thư mục

```
todo-project/
├── README.md                 # Hướng dẫn này
├── .gitignore               # Những file không push git
│
├── be/                       # Backend (Node.js + Express)
│   ├── src/
│   │   ├── server.ts        # Main file
│   │   ├── controllers/     # Xử lý upload
│   │   ├── routes/          # API routes
│   │   ├── middlewares/     # Multer (upload)
│   │   └── utils/           # Helper functions
│   ├── .env.example         # Template .env
│   ├── .env                 # File thật (DO NOT PUSH)
│   └── package.json         # Dependencies
│
└── fe/                       # Frontend (React + Vite)
    ├── src/
    │   ├── App.tsx          # Component chính
    │   ├── main.tsx         # Entry point
    │   └── index.css        # Styles
    ├── .env.example         # Template .env
    └── package.json         # Dependencies
```

---

## 🔌 API Endpoints

| Method | Endpoint      | Mô tả                     |
| ------ | ------------- | ------------------------- |
| GET    | `/health`     | Kiểm tra server hoạt động |
| POST   | `/api/upload` | Upload ảnh (max 5MB)      |

### Thử upload ảnh

**Dùng curl (Windows PowerShell):**

```powershell
$form = @{
    image = Get-Item -Path "C:\path\to\image.jpg"
}
Invoke-WebRequest -Uri "http://localhost:5000/api/upload" -Form $form
```

**Dùng curl (Linux/Mac):**

```bash
curl -X POST http://localhost:5000/api/upload \
  -F "image=@/path/to/image.jpg"
```

**Phản hồi thành công:**

```json
{
  "success": true,
  "message": "Image uploaded successfully",
  "data": {
    "imageUrl": "/uploads/1234567890-123456789.jpg"
  }
}
```

---

## 🛠️ Các lệnh hữu ích

**Backend:**

```bash
cd be
npm run dev      # Chạy dev mode
npm run build    # Build TypeScript
npm start        # Chạy production
```

**Frontend:**

```bash
cd fe
npm run dev      # Chạy dev mode
npm run build    # Build production
npm run preview  # Xem build output
```

---

## ⚠️ Các lỗi thường gặp

| Lỗi                                          | Nguyên nhân                  | Cách fix                                           |
| -------------------------------------------- | ---------------------------- | -------------------------------------------------- |
| `Cannot find module 'express'`               | Chưa cài dependencies        | Chạy `npm install`                                 |
| `EADDRINUSE: address already in use :::5000` | Port 5000 đang bị dùng       | Đóng process khác hoặc đổi PORT trong .env         |
| `ENOENT: no such file or directory`          | File .env không tồn tại      | Chạy `cp .env.example .env`                        |
| `Module not found: Can't resolve 'react'`    | Frontend node_modules bị lỗi | Chạy `cd fe && rm -rf node_modules && npm install` |

---

## 📝 File .env là gì?

`.env` chứa các biến môi trường (passwords, secrets, config)

**Không được commit lên Git!** (đã trong .gitignore)

**Cách setup:**

```bash
# Copy file mẫu
cp .env.example .env

# Mở file .env và sửa nếu cần
```

---

## 🤝 Workflow nhóm

1. **Mỗi người clone repo:**

   ```bash
   git clone <repo-url>
   ```

2. **Setup lần đầu (1 lần duy nhất):**

   ```bash
   cd be && npm install && cp .env.example .env
   cd ../fe && npm install && cp .env.example .env
   ```

3. **Chạy hàng ngày:**

   ```bash
   # Terminal 1 - Backend
   cd be && npm run dev

   # Terminal 2 - Frontend
   cd fe && npm run dev
   ```

4. **Push code:**
   ```bash
   git add .
   git commit -m "description"
   git push origin main
   ```

---

## 📚 Tech Stack

| Công cụ    | Phiên bản    | Mục đích           |
| ---------- | ------------ | ------------------ |
| Node.js    | >= 18        | Runtime            |
| Express    | ^4.19.2      | Web framework      |
| React      | ^19.0.0      | Frontend framework |
| TypeScript | ^5.4.5       | Type safety        |
| Vite       | ^5.3.1       | Build tool         |
| Multer     | ^1.4.5-lts.1 | File upload        |
| Axios      | ^1.7.2       | HTTP client        |

---

## ❓ Cần giúp?

- Kiểm tra lại Node.js version: `node --version`
- Xóa `node_modules` và cài lại: `rm -rf node_modules && npm install`
- Restart terminal và thử lại

---

**Made with ❤️ by the team**
