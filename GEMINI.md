# GEMINI.md — Project Rules & Customization Guide
# MathPro — Hệ thống học tập Toán THPT luyện thi
# Đồ án tốt nghiệp 2026 — Lê Đức Huy

---

## 1. TỔNG QUAN DỰ ÁN

**Tên dự án:** MathPro  
**Mục tiêu:** Hệ thống học tập trực tuyến môn Toán cho học sinh THPT luyện thi tốt nghiệp.  
**Phạm vi:** Chạy local trên máy cá nhân, không cần deploy, không cần Docker.  
**Hai actor chính:** `student` (học sinh) và `teacher` (giáo viên kiêm quản trị hệ thống).

**Tech stack cố định — KHÔNG được thay thế:**

| Thành phần | Công nghệ |
|---|---|
| Backend | Django 5.x + Django REST Framework |
| Database | PostgreSQL + extension pgcrypto |
| Frontend | React 19 + Vite |
| Styling | TailwindCSS v4 |
| Toán học | KaTeX + react-katex (render) + MathLive (nhập) |
| AI | Google Gemini API (gemini-1.5-flash) |
| Charts | Chart.js + react-chartjs-2 |
| HTTP client | Axios |
| Router | React Router DOM v7 |
| Icons | lucide-react |
| Auth | PyJWT (backend) + localStorage (frontend) |
| PDF parse | PyMuPDF (fitz) |

---

## 2. QUY TẮC CẤU TRÚC THƯ MỤC

### 2.1 Tuân thủ tuyệt đối cấu trúc sau — KHÔNG tự tạo thư mục hoặc file ngoài cấu trúc này:

```
mathpro/
├── .env
├── .env.example
├── README.md
├── GEMINI.md
├── instructions/
│   └── tasks.txt                  ← file theo dõi tiến độ task
│
├── backend/
│   ├── manage.py
│   ├── requirements.txt
│   ├── config/
│   │   ├── __init__.py
│   │   ├── settings.py
│   │   ├── urls.py
│   │   ├── wsgi.py
│   │   ├── middleware.py          ← JWT middleware
│   │   └── permissions.py        ← decorator require_auth
│   └── apps/
│       ├── accounts/              ← User, PasswordHistory, LoginHistory
│       │   ├── models.py
│       │   ├── views.py
│       │   ├── urls.py
│       │   ├── utils.py           ← pgcrypto helpers
│       │   └── management/commands/seed_data.py
│       ├── topics/                ← Topic (cây chuyên đề)
│       ├── questions/             ← Question + 3 bảng con
│       ├── exams/                 ← Exam, ExamQuestion, ExamAttempt, ExamAnswer
│       │   └── management/commands/auto_submit_expired.py
│       ├── practice/              ← PracticeSession, PracticeAnswer
│       ├── documents/             ← Document
│       ├── ai_tutor/              ← AIChatSession, AIChatMessage + gemini.py
│       └── stats/                 ← chỉ có views.py và urls.py, không có models.py
│
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── contexts/AuthContext.jsx
        ├── api/
        │   └── axios.js, auth.js, topics.js, questions.js,
        │       exams.js, practice.js, stats.js, documents.js, aiTutor.js
        ├── components/
        │   └── Navbar.jsx, Footer.jsx, ProtectedRoute.jsx,
        │       MathRenderer.jsx, QuestionCard.jsx, AiTutor.jsx, TopicTreeNode.jsx
        └── pages/
            ├── Home.jsx, Login.jsx, Register.jsx, ForgotPassword.jsx
            ├── Topics.jsx, PracticeRoom.jsx, ExamList.jsx
            ├── ExamRoom.jsx, ExamResult.jsx, Documents.jsx, Stats.jsx
            └── teacher/
                └── TeacherLayout.jsx, TeacherDashboard.jsx,
                    QuestionList.jsx, QuestionForm.jsx, UploadPDF.jsx,
                    ExamManager.jsx, DocumentManager.jsx, StudentManager.jsx
```

---

## 3. QUY TẮC CODE BACKEND (Django)

- LUÔN dùng view function + JsonResponse.
- KHÔNG dùng DRF Serializer cho logic đơn giản.
- Mỗi bảng dùng `managed = False` trong `class Meta`.
- Soft delete là bắt buộc cho tất cả bảng có cột `is_deleted`.

---

## 4. QUY TẮC CODE FRONTEND (React)

- KHÔNG dùng thẻ `<form>`. Dùng `<div>` + handler.
- Styling chỉ dùng TailwindCSS.
- API calls qua `src/api/axios.js`.

---

*GEMINI.md — Phiên bản 1.0 — Đồ án tốt nghiệp 2026 — Lê Đức Huy*
