-- ============================================================
-- HỆ THỐNG HỌC TẬP TOÁN THPT
-- Đồ án tốt nghiệp 2026 - Lê Đức Huy
-- 2 role: student | teacher (teacher = quản lý hệ thống)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 1. USERS
-- ============================================================
CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    username_enc  BYTEA        NOT NULL UNIQUE,
    email_enc     BYTEA        NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(10)  NOT NULL DEFAULT 'student'
                      CHECK (role IN ('student', 'teacher')),
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    is_deleted    BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    last_login    TIMESTAMPTZ
);

CREATE INDEX idx_users_role      ON users (role);
CREATE INDEX idx_users_is_active ON users (is_active, is_deleted);

-- ============================================================
-- 2. PASSWORD HISTORY
-- ============================================================
CREATE TABLE password_history (
    id            SERIAL PRIMARY KEY,
    user_id       INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    password_hash VARCHAR(255) NOT NULL,
    changed_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pwdhist_user ON password_history (user_id, changed_at DESC);

-- ============================================================
-- 3. LOGIN HISTORY
-- ============================================================
CREATE TABLE login_history (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    login_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address INET,
    success    BOOLEAN     NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_loginhist_user ON login_history (user_id, login_at DESC);

-- ============================================================
-- 4. TOPICS (cây chuyên đề tối đa 5 cấp)
-- ============================================================
CREATE TABLE topics (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    parent_id   INTEGER      REFERENCES topics(id) ON DELETE SET NULL,
    level       SMALLINT     NOT NULL CHECK (level BETWEEN 1 AND 5),
    order_index SMALLINT     NOT NULL DEFAULT 0,
    is_deleted  BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_topics_parent  ON topics (parent_id);
CREATE INDEX idx_topics_level   ON topics (level);
CREATE INDEX idx_topics_deleted ON topics (is_deleted);

-- ============================================================
-- 5. QUESTIONS
-- ============================================================
CREATE TABLE questions (
    id            SERIAL PRIMARY KEY,
    topic_id      INTEGER      REFERENCES topics(id) ON DELETE SET NULL,
    question_type VARCHAR(20)  NOT NULL
                      CHECK (question_type IN ('mcq', 'true_false', 'short_answer')),
    content_json  JSONB        NOT NULL,
    image_url     VARCHAR(500),
    difficulty    NUMERIC(3,2) CHECK (difficulty BETWEEN 0 AND 1),
    is_deleted    BOOLEAN      NOT NULL DEFAULT FALSE,
    created_by    INTEGER      REFERENCES users(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_questions_topic   ON questions (topic_id);
CREATE INDEX idx_questions_type    ON questions (question_type);
CREATE INDEX idx_questions_deleted ON questions (is_deleted);
CREATE INDEX idx_questions_content ON questions USING GIN (content_json);

-- ============================================================
-- 6. QUESTION OPTIONS (MCQ)
-- ============================================================
CREATE TABLE question_options (
    id           SERIAL PRIMARY KEY,
    question_id  INTEGER  NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    option_key   CHAR(1)  NOT NULL CHECK (option_key IN ('A','B','C','D')),
    content_json JSONB    NOT NULL,
    is_correct   BOOLEAN  NOT NULL DEFAULT FALSE,
    UNIQUE (question_id, option_key)
);

CREATE INDEX idx_qopts_question ON question_options (question_id);

-- ============================================================
-- 7. QUESTION TF STATEMENTS (True/False)
-- ============================================================
CREATE TABLE question_tf_statements (
    id            SERIAL PRIMARY KEY,
    question_id   INTEGER  NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    statement_key CHAR(1)  NOT NULL CHECK (statement_key IN ('a','b','c','d')),
    content_json  JSONB    NOT NULL,
    is_true       BOOLEAN  NOT NULL,
    UNIQUE (question_id, statement_key)
);

CREATE INDEX idx_qtf_question ON question_tf_statements (question_id);

-- ============================================================
-- 8. QUESTION SHORT ANSWERS
-- ============================================================
CREATE TABLE question_short_answers (
    id             SERIAL PRIMARY KEY,
    question_id    INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    correct_answer NUMERIC NOT NULL,
    UNIQUE (question_id)
);

-- ============================================================
-- 9. EXAMS
-- ============================================================
CREATE TABLE exams (
    id               SERIAL PRIMARY KEY,
    title            VARCHAR(255) NOT NULL,
    exam_type        VARCHAR(20)  NOT NULL
                         CHECK (exam_type IN ('topic','midterm','final','graduation')),
    topic_id         INTEGER      REFERENCES topics(id) ON DELETE SET NULL,
    duration_minutes SMALLINT     NOT NULL DEFAULT 90,
    answer_pdf_url   VARCHAR(500),
    is_deleted       BOOLEAN      NOT NULL DEFAULT FALSE,
    created_by       INTEGER      REFERENCES users(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_exams_type    ON exams (exam_type);
CREATE INDEX idx_exams_deleted ON exams (is_deleted);

-- ============================================================
-- 10. EXAM QUESTIONS (bảng trung gian N-N)
-- ============================================================
CREATE TABLE exam_questions (
    id          SERIAL PRIMARY KEY,
    exam_id     INTEGER  NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    question_id INTEGER  NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    order_index SMALLINT NOT NULL DEFAULT 0,
    UNIQUE (exam_id, question_id)
);

CREATE INDEX idx_examq_exam     ON exam_questions (exam_id);
CREATE INDEX idx_examq_question ON exam_questions (question_id);

-- ============================================================
-- 11. PRACTICE SESSIONS
-- ============================================================
CREATE TABLE practice_sessions (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    topic_id   INTEGER     NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at   TIMESTAMPTZ
);

CREATE INDEX idx_practice_user  ON practice_sessions (user_id);
CREATE INDEX idx_practice_topic ON practice_sessions (topic_id);

-- ============================================================
-- 12. PRACTICE ANSWERS
-- ============================================================
CREATE TABLE practice_answers (
    id          SERIAL PRIMARY KEY,
    session_id  INTEGER     NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
    question_id INTEGER     NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    -- MCQ:        {"selected": "A"}
    -- True/False: {"answers": {"a": true, "b": false, "c": true, "d": false}}
    -- Short Ans:  {"value": 1.33}
    answer_data JSONB       NOT NULL,
    is_correct  BOOLEAN,
    answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pa_session  ON practice_answers (session_id);
CREATE INDEX idx_pa_question ON practice_answers (question_id);

-- ============================================================
-- 13. EXAM ATTEMPTS (tối đa 3 lần / học sinh / đề)
-- ============================================================
CREATE TABLE exam_attempts (
    id                SERIAL PRIMARY KEY,
    user_id           INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exam_id           INTEGER      NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    started_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    submitted_at      TIMESTAMPTZ,
    score             NUMERIC(5,2),
    attempt_number    SMALLINT     NOT NULL DEFAULT 1
                          CHECK (attempt_number BETWEEN 1 AND 3),
    is_auto_submitted BOOLEAN      NOT NULL DEFAULT FALSE,
    UNIQUE (user_id, exam_id, attempt_number)
);

CREATE INDEX idx_attempts_user ON exam_attempts (user_id);
CREATE INDEX idx_attempts_exam ON exam_attempts (exam_id);

-- ============================================================
-- 14. EXAM ANSWERS
-- ============================================================
CREATE TABLE exam_answers (
    id          SERIAL PRIMARY KEY,
    attempt_id  INTEGER NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    answer_data JSONB   NOT NULL,
    is_correct  BOOLEAN,
    UNIQUE (attempt_id, question_id)
);

CREATE INDEX idx_ea_attempt  ON exam_answers (attempt_id);
CREATE INDEX idx_ea_question ON exam_answers (question_id);

-- ============================================================
-- 15. AI CHAT SESSIONS
-- ============================================================
CREATE TABLE ai_chat_sessions (
    id           SERIAL PRIMARY KEY,
    user_id      INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    context_type VARCHAR(20) NOT NULL DEFAULT 'general'
                     CHECK (context_type IN ('practice', 'general')),
    context_id   INTEGER,   -- FK logic đến practice_sessions.id, nullable
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_aichat_user ON ai_chat_sessions (user_id);

-- ============================================================
-- 16. AI CHAT MESSAGES
-- ============================================================
CREATE TABLE ai_chat_messages (
    id         SERIAL PRIMARY KEY,
    session_id INTEGER     NOT NULL REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
    role       VARCHAR(10) NOT NULL CHECK (role IN ('user', 'assistant')),
    content    TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_aimsg_session ON ai_chat_messages (session_id, created_at ASC);

-- ============================================================
-- 17. DOCUMENTS
-- ============================================================
CREATE TABLE documents (
    id          SERIAL PRIMARY KEY,
    title       VARCHAR(255) NOT NULL,
    description TEXT,
    file_url    VARCHAR(500) NOT NULL,
    uploaded_by INTEGER      REFERENCES users(id) ON DELETE SET NULL,
    is_deleted  BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_docs_deleted ON documents (is_deleted);

-- ============================================================
-- TRIGGER: tự cập nhật updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_questions_updated
    BEFORE UPDATE ON questions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_exams_updated
    BEFORE UPDATE ON exams
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- VIEW: giải mã username/email (dùng trong Django shell/debug)
-- Yêu cầu: SET app.secret_key = 'your-key' trước khi dùng
-- ============================================================
CREATE OR REPLACE VIEW v_users_plain AS
SELECT
    id,
    pgp_sym_decrypt(username_enc, current_setting('app.secret_key')) AS username,
    pgp_sym_decrypt(email_enc,    current_setting('app.secret_key')) AS email,
    role,
    is_active,
    is_deleted,
    created_at,
    last_login
FROM users
WHERE is_deleted = FALSE;