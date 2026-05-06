# MathPro — Hệ thống học tập Toán THPT luyện thi

MathPro là một nền tảng học tập trực tuyến dành cho học sinh THPT luyện thi tốt nghiệp môn Toán, tích hợp AI Tutor hỗ trợ giải đáp thắc mắc.

## Công nghệ sử dụng

- **Backend**: Django 5.x + Django REST Framework
- **Database**: PostgreSQL + extension pgcrypto
- **Frontend**: React 19 + Vite
- **Styling**: TailwindCSS v4
- **Toán học**: KaTeX + MathLive
- **AI**: Google Gemini API

## Cấu trúc dự án

- `backend/`: Chứa mã nguồn Django và API.
- `frontend/`: Chứa mã nguồn React và giao diện người dùng.
- `instruction/`: Chứa tài liệu hướng dẫn, schema database và UI/UX mockup.

## Hướng dẫn cài đặt (Local)

1. **Cấu hình môi trường**:
   - Tạo file `.env` tại thư mục `backend/` dựa trên mẫu `.env.example`.
   - Các biến môi trường cần thiết:
     ```env
     # Database
     DB_NAME=db_datn_2026
     DB_USER=postgres
     DB_PASSWORD=your_password
     
     # Django
     SECRET_KEY=your_secret_key
     
     # Gemini API
     GEMINI_API_KEY=your_gemini_api_key
     PGCRYPTO_KEY=your_pgcrypto_key
     ```

2. **Chuẩn bị Database**:

2. **Backend**:
   - `cd backend`
   - `python -m venv venv`
   - `.\venv\Scripts\activate` (Windows)
   - `pip install -r requirements.txt`
   - Tạo file `.env` từ `.env.example`.
   - `python manage.py seed_data` (Khởi tạo dữ liệu mẫu).
   - `python manage.py runserver`.

3. **Frontend**:
   - `cd frontend`
   - `npm install`
   - `npm run dev`.
