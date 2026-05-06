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

1. **Chuẩn bị Database**:
   - Tạo database `mathpro_db` trong PostgreSQL.
   - Chạy script `instruction/script_db_create.sql` để tạo bảng.

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

## Tài khoản mẫu
- **Giáo viên**: `teacher` / `Teacher@123`
- **Học sinh**: `student1` / `Student@123`
