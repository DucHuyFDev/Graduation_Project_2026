from datetime import date, timedelta
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db import connection
from config.permissions import require_auth


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _calc_streak(user_id):
    """
    Đếm streak ngày liên tiếp có hoạt động (practice_answer hoặc exam_attempt).
    Trả về số nguyên.
    """
    with connection.cursor() as c:
        # Lấy tất cả ngày có practice_answer
        c.execute("""
            SELECT DISTINCT DATE(pa.answered_at) AS day
            FROM practice_answers pa
            JOIN practice_sessions ps ON pa.session_id = ps.id
            WHERE ps.user_id = %s
        """, [user_id])
        practice_days = {row[0] for row in c.fetchall()}

        # Lấy tất cả ngày có exam_attempt đã submit
        c.execute("""
            SELECT DISTINCT DATE(submitted_at) AS day
            FROM exam_attempts
            WHERE user_id = %s AND submitted_at IS NOT NULL
        """, [user_id])
        exam_days = {row[0] for row in c.fetchall()}

    all_days = practice_days | exam_days
    if not all_days:
        return 0

    streak = 0
    check = date.today()
    while check in all_days:
        streak += 1
        check -= timedelta(days=1)
    return streak


def _topic_stats(user_id):
    """
    Tính topic_completion cho topic cấp 1 (level=1).
    Trả {topic_id: {name, done, correct}} để dùng tiếp.
    """
    with connection.cursor() as c:
        # Lấy topic cấp 1
        c.execute("""
            SELECT id, name FROM topics
            WHERE level = 1 AND is_deleted = False
            ORDER BY order_index
        """)
        top_topics = c.fetchall()

        # Lấy id tất cả topic con (đệ quy) của từng topic cấp 1
        c.execute("""
            WITH RECURSIVE sub AS (
                SELECT id, parent_id, name, level
                FROM topics WHERE is_deleted = False
                UNION ALL
                SELECT t.id, t.parent_id, t.name, t.level
                FROM topics t JOIN sub ON t.parent_id = sub.id
                WHERE t.is_deleted = False
            )
            SELECT id, parent_id FROM sub
        """)
        all_topic_rows = c.fetchall()

    # Xây map: topic_id -> set of all descendant ids (including self)
    children_map = {}  # parent -> [child_ids]
    for tid, parent in all_topic_rows:
        if parent:
            children_map.setdefault(parent, []).append(tid)

    def get_subtree(tid):
        """Lấy tất cả id trong subtree của topic tid."""
        result = {tid}
        for child in children_map.get(tid, []):
            result |= get_subtree(child)
        return result

    # Lấy số câu đúng/đã làm từ practice_answers theo question.topic_id
    with connection.cursor() as c:
        c.execute("""
            SELECT q.topic_id,
                   COUNT(*) AS done,
                   SUM(CASE WHEN pa.is_correct THEN 1 ELSE 0 END) AS correct
            FROM practice_answers pa
            JOIN practice_sessions ps ON pa.session_id = ps.id
            JOIN questions q ON pa.question_id = q.id
            WHERE ps.user_id = %s AND q.is_deleted = False
            GROUP BY q.topic_id
        """, [user_id])
        practice_rows = {row[0]: (row[1], row[2]) for row in c.fetchall()}

    result = {}
    for tid, name in top_topics:
        subtree = get_subtree(tid)
        done = sum(practice_rows.get(s, (0, 0))[0] for s in subtree)
        correct = sum(practice_rows.get(s, (0, 0))[1] for s in subtree)
        result[tid] = {"name": name, "done": done, "correct": correct}

    return result


# ─── Views ────────────────────────────────────────────────────────────────────

@csrf_exempt
@require_auth(roles=["student"])
def stats_me(request):
    """Thống kê cá nhân cho student."""
    if request.method != 'GET':
        return JsonResponse({"error": "Method not allowed"}, status=405)

    uid = request.user_id

    try:
        # 1. Streak
        streak = _calc_streak(uid)

        # 2. Topic completion + radar + strong/weak
        topic_data = _topic_stats(uid)
        topic_completion = []
        topic_radar = []

        for tid, info in topic_data.items():
            done = info["done"]
            correct = info["correct"]
            percent = round((correct / done * 100), 1) if done > 0 else 0.0
            correct_rate = round(correct / done, 3) if done > 0 else 0.0
            topic_completion.append({
                "topic_id": tid,
                "name": info["name"],
                "percent": percent,
                "done": done,
                "correct": correct,
            })
            topic_radar.append({
                "name": info["name"],
                "correct_rate": correct_rate,
            })

        sorted_by_rate = sorted(
            topic_completion,
            key=lambda x: x["percent"],
            reverse=True
        )
        strong_topics = sorted_by_rate[:3]
        weak_topics = list(reversed(sorted_by_rate))[:3]

        # 3. Exam scores history (7 lần gần nhất)
        with connection.cursor() as c:
            c.execute("""
                SELECT e.title, ea.score, ea.submitted_at
                FROM exam_attempts ea
                JOIN exams e ON ea.exam_id = e.id
                WHERE ea.user_id = %s
                  AND ea.submitted_at IS NOT NULL
                  AND e.is_deleted = False
                ORDER BY ea.submitted_at DESC
                LIMIT 7
            """, [uid])
            exam_rows = c.fetchall()
        exam_scores_history = [
            {
                "title": row[0],
                "score": float(row[1]) if row[1] is not None else 0.0,
                "date": row[2].date().isoformat(),
            }
            for row in exam_rows
        ]

        # 4. Daily activity (7 ngày gần nhất)
        today = date.today()
        with connection.cursor() as c:
            c.execute("""
                SELECT DATE(pa.answered_at) AS day, COUNT(*) AS cnt
                FROM practice_answers pa
                JOIN practice_sessions ps ON pa.session_id = ps.id
                WHERE ps.user_id = %s
                  AND pa.answered_at >= %s
                GROUP BY day
            """, [uid, today - timedelta(days=6)])
            practice_activity = {row[0]: row[1] for row in c.fetchall()}

            c.execute("""
                SELECT DATE(submitted_at) AS day, COUNT(*) AS cnt
                FROM exam_attempts
                WHERE user_id = %s
                  AND submitted_at IS NOT NULL
                  AND submitted_at >= %s
                GROUP BY day
            """, [uid, today - timedelta(days=6)])
            exam_activity = {row[0]: row[1] for row in c.fetchall()}

        daily_activity = []
        for i in range(6, -1, -1):
            d = today - timedelta(days=i)
            cnt = practice_activity.get(d, 0) + exam_activity.get(d, 0)
            daily_activity.append({"date": d.isoformat(), "count": cnt})

        # 5. Total study time (phút → giờ)
        with connection.cursor() as c:
            c.execute("""
                SELECT COALESCE(
                    SUM(
                        EXTRACT(EPOCH FROM (
                            COALESCE(ended_at, NOW()) - started_at
                        )) / 60
                    ), 0
                )
                FROM practice_sessions
                WHERE user_id = %s
            """, [uid])
            practice_minutes = float(c.fetchone()[0])

            c.execute("""
                SELECT COALESCE(
                    SUM(
                        EXTRACT(EPOCH FROM (
                            COALESCE(submitted_at, NOW()) - started_at
                        )) / 60
                    ), 0
                )
                FROM exam_attempts
                WHERE user_id = %s
            """, [uid])
            exam_minutes = float(c.fetchone()[0])

        total_study_hours = round((practice_minutes + exam_minutes) / 60, 1)

        # 6. Recent activity (5 gần nhất — kết hợp practice + exam)
        with connection.cursor() as c:
            c.execute("""
                (
                    SELECT 'practice' AS type,
                           ps.id AS ref_id,
                           t.name AS label,
                           ps.started_at AS ts
                    FROM practice_sessions ps
                    JOIN topics t ON ps.topic_id = t.id
                    WHERE ps.user_id = %s
                    ORDER BY ps.started_at DESC
                    LIMIT 5
                )
                UNION ALL
                (
                    SELECT 'exam' AS type,
                           ea.id AS ref_id,
                           e.title AS label,
                           ea.started_at AS ts
                    FROM exam_attempts ea
                    JOIN exams e ON ea.exam_id = e.id
                    WHERE ea.user_id = %s
                    ORDER BY ea.started_at DESC
                    LIMIT 5
                )
                ORDER BY ts DESC
                LIMIT 5
            """, [uid, uid])
            activity_rows = c.fetchall()

        recent_activity = [
            {
                "type": row[0],
                "ref_id": row[1],
                "label": row[2],
                "timestamp": row[3].isoformat(),
            }
            for row in activity_rows
        ]

        return JsonResponse({
            "streak": streak,
            "topic_completion": topic_completion,
            "strong_topics": strong_topics,
            "weak_topics": weak_topics,
            "exam_scores_history": exam_scores_history,
            "topic_radar": topic_radar,
            "daily_activity": daily_activity,
            "total_study_hours": total_study_hours,
            "recent_activity": recent_activity,
        })

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@require_auth(roles=["teacher"])
def stats_teacher(request):
    """Tổng quan hệ thống cho teacher."""
    if request.method != 'GET':
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        today = date.today()

        with connection.cursor() as c:
            # ── Tổng số liệu ──────────────────────────────────────────
            c.execute("SELECT COUNT(*) FROM users WHERE is_deleted=False AND role='student'")
            total_students = c.fetchone()[0]

            c.execute("SELECT COUNT(*) FROM questions WHERE is_deleted=False")
            total_questions = c.fetchone()[0]

            c.execute("SELECT COUNT(*) FROM exams WHERE is_deleted=False")
            total_exams = c.fetchone()[0]

            c.execute("SELECT COUNT(*) FROM practice_sessions")
            total_practice = c.fetchone()[0]

            c.execute("SELECT COUNT(*) FROM exam_attempts WHERE submitted_at IS NOT NULL")
            total_attempts = c.fetchone()[0]

            # ── Avg score toàn bộ ──────────────────────────────────────
            c.execute("""
                SELECT ROUND(AVG(score)::numeric, 2)
                FROM exam_attempts WHERE submitted_at IS NOT NULL
            """)
            global_avg = c.fetchone()[0]

            # ── Hoạt động 30 ngày gần nhất ────────────────────────────
            c.execute("""
                SELECT DATE(submitted_at) AS day, COUNT(*) AS cnt
                FROM exam_attempts
                WHERE submitted_at IS NOT NULL
                  AND submitted_at >= %s
                GROUP BY day
                ORDER BY day
            """, [today - timedelta(days=29)])
            attempt_by_day_rows = c.fetchall()

            c.execute("""
                SELECT DATE(started_at) AS day, COUNT(*) AS cnt
                FROM practice_sessions
                WHERE started_at >= %s
                GROUP BY day
                ORDER BY day
            """, [today - timedelta(days=29)])
            practice_by_day_rows = c.fetchall()

            # ── Phân bố loại câu hỏi ──────────────────────────────────
            c.execute("""
                SELECT question_type, COUNT(*) AS cnt
                FROM questions WHERE is_deleted=False
                GROUP BY question_type
            """)
            q_type_rows = c.fetchall()

            # ── Top 5 đề thi nhiều lượt làm ───────────────────────────
            c.execute("""
                SELECT e.id, e.title, e.exam_type,
                       COUNT(ea.id) AS attempt_count,
                       ROUND(AVG(ea.score)::numeric, 2) AS avg_score
                FROM exams e
                LEFT JOIN exam_attempts ea
                    ON ea.exam_id = e.id AND ea.submitted_at IS NOT NULL
                WHERE e.is_deleted = False
                GROUP BY e.id, e.title, e.exam_type
                ORDER BY attempt_count DESC
                LIMIT 5
            """)
            top_exam_rows = c.fetchall()

            # ── Tất cả exams cho bảng ─────────────────────────────────
            c.execute("""
                SELECT e.id, e.title, e.exam_type,
                       COUNT(ea.id) AS attempt_count,
                       ROUND(AVG(ea.score)::numeric, 2) AS avg_score
                FROM exams e
                LEFT JOIN exam_attempts ea
                    ON ea.exam_id = e.id AND ea.submitted_at IS NOT NULL
                WHERE e.is_deleted = False
                GROUP BY e.id, e.title, e.exam_type
                ORDER BY e.created_at DESC
            """)
            exam_rows = c.fetchall()

        # Build daily_activity (30 ngày)
        attempt_map = {row[0]: row[1] for row in attempt_by_day_rows}
        practice_map = {row[0]: row[1] for row in practice_by_day_rows}
        daily_activity = []
        for i in range(29, -1, -1):
            d = today - timedelta(days=i)
            daily_activity.append({
                "date": d.isoformat(),
                "exam_count": attempt_map.get(d, 0),
                "practice_count": practice_map.get(d, 0),
            })

        # Phân bố loại câu hỏi
        question_type_dist = [
            {"type": row[0], "count": row[1]}
            for row in q_type_rows
        ]

        # Top exams
        top_exams = [
            {
                "id": row[0],
                "title": row[1],
                "exam_type": row[2],
                "attempt_count": row[3],
                "avg_score": float(row[4]) if row[4] is not None else None,
            }
            for row in top_exam_rows
        ]

        exams = [
            {
                "id": row[0],
                "title": row[1],
                "exam_type": row[2],
                "attempt_count": row[3],
                "avg_score": float(row[4]) if row[4] is not None else None,
            }
            for row in exam_rows
        ]

        return JsonResponse({
            "total_students": total_students,
            "total_questions": total_questions,
            "total_exams": total_exams,
            "total_practice_sessions": total_practice,
            "total_attempts": total_attempts,
            "global_avg_score": float(global_avg) if global_avg is not None else None,
            "daily_activity": daily_activity,
            "question_type_dist": question_type_dist,
            "top_exams": top_exams,
            "exams": exams,
        })

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@require_auth(roles=["teacher"])
def stats_exam(request, exam_id):
    """Thống kê chi tiết 1 đề thi cho teacher."""
    if request.method != 'GET':
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        with connection.cursor() as c:
            # Kiểm tra exam tồn tại
            c.execute(
                "SELECT id, title FROM exams WHERE id=%s AND is_deleted=False",
                [exam_id]
            )
            exam_row = c.fetchone()
            if not exam_row:
                return JsonResponse({"error": "Không tìm thấy đề thi"}, status=404)

            # Tổng học sinh đã làm, avg_score
            c.execute("""
                SELECT COUNT(DISTINCT user_id) AS student_count,
                       ROUND(AVG(score)::numeric, 2) AS avg_score
                FROM exam_attempts
                WHERE exam_id = %s AND submitted_at IS NOT NULL
            """, [exam_id])
            summary = c.fetchone()

            # Tỉ lệ sai từng câu
            c.execute("""
                SELECT q.id, q.question_type,
                       COUNT(*) AS total,
                       SUM(CASE WHEN ea.is_correct = False THEN 1 ELSE 0 END) AS wrong
                FROM exam_answers ea
                JOIN exam_attempts att ON ea.attempt_id = att.id
                JOIN questions q ON ea.question_id = q.id
                WHERE att.exam_id = %s AND att.submitted_at IS NOT NULL
                GROUP BY q.id, q.question_type
                ORDER BY q.id
            """, [exam_id])
            q_rows = c.fetchall()

        per_question = [
            {
                "question_id": row[0],
                "question_type": row[1],
                "total_answers": row[2],
                "wrong_count": row[3],
                "wrong_rate": round(row[3] / row[2], 3) if row[2] > 0 else 0.0,
            }
            for row in q_rows
        ]

        return JsonResponse({
            "exam_id": exam_row[0],
            "title": exam_row[1],
            "student_count": summary[0],
            "avg_score": float(summary[1]) if summary[1] is not None else None,
            "per_question_wrong_rate": per_question,
        })

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@require_auth(roles=["teacher"])
def students_list(request):
    """Danh sách học sinh kèm thống kê cơ bản (teacher)."""
    if request.method != 'GET':
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        page = int(request.GET.get('page', 1))
        q = request.GET.get('q', '').strip()
        per_page = 20
        offset = (page - 1) * per_page

        from django.conf import settings
        key = settings.PGCRYPTO_KEY

        with connection.cursor() as c:
            # Đếm tổng
            if q:
                c.execute("""
                    SELECT COUNT(*) FROM users
                    WHERE role='student'
                    AND pgp_sym_decrypt(username_enc, %s) ILIKE %s
                """, [key, f'%{q}%'])
            else:
                c.execute("SELECT COUNT(*) FROM users WHERE role='student'")
            total = c.fetchone()[0]

            # Lấy danh sách kèm thống kê
            base_select = """
                SELECT u.id,
                       pgp_sym_decrypt(u.username_enc, %s) AS username,
                       pgp_sym_decrypt(u.email_enc, %s) AS email,
                       u.created_at,
                       u.last_login,
                       COUNT(DISTINCT ps.id) AS practice_count,
                       COUNT(DISTINCT ea.id) AS exam_count,
                       ROUND(AVG(ea.score)::numeric, 2) AS avg_score,
                       u.is_deleted
                FROM users u
                LEFT JOIN practice_sessions ps ON ps.user_id = u.id
                LEFT JOIN exam_attempts ea ON ea.user_id = u.id AND ea.submitted_at IS NOT NULL
                WHERE u.role='student'
            """
            if q:
                c.execute(
                    base_select + " AND pgp_sym_decrypt(u.username_enc, %s) ILIKE %s"
                    " GROUP BY u.id ORDER BY u.created_at DESC LIMIT %s OFFSET %s",
                    [key, key, key, f'%{q}%', per_page, offset]
                )
            else:
                c.execute(
                    base_select + " GROUP BY u.id ORDER BY u.created_at DESC LIMIT %s OFFSET %s",
                    [key, key, per_page, offset]
                )

            rows = c.fetchall()

        results = [
            {
                "id": row[0],
                "username": row[1],
                "email": row[2],
                "joined_at": row[3].isoformat() if row[3] else None,
                "last_login": row[4].isoformat() if row[4] else None,
                "practice_count": row[5] or 0,
                "exam_count": row[6] or 0,
                "avg_score": float(row[7]) if row[7] is not None else None,
                "is_deleted": bool(row[8]),
            }
            for row in rows
        ]

        return JsonResponse({"total": total, "page": page, "results": results})

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@require_auth(roles=["teacher"])
def lock_student(request, user_id):
    """Khóa tài khoản học sinh."""
    if request.method != 'POST':
        return JsonResponse({"error": "Method not allowed"}, status=405)
    
    try:
        with connection.cursor() as c:
            c.execute("UPDATE users SET is_deleted = True WHERE id = %s AND role = 'student'", [user_id])
            if c.rowcount == 0:
                return JsonResponse({"error": "Không tìm thấy học sinh"}, status=404)
        return JsonResponse({"message": "Khóa tài khoản thành công"})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@require_auth(roles=["teacher"])
def unlock_student(request, user_id):
    """Mở khóa tài khoản học sinh."""
    if request.method != 'POST':
        return JsonResponse({"error": "Method not allowed"}, status=405)
    
    try:
        with connection.cursor() as c:
            c.execute("UPDATE users SET is_deleted = False WHERE id = %s AND role = 'student'", [user_id])
            if c.rowcount == 0:
                return JsonResponse({"error": "Không tìm thấy học sinh"}, status=404)
        return JsonResponse({"message": "Mở khóa tài khoản thành công"})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

