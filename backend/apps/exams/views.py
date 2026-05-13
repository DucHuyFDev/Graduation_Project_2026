import json
from datetime import timedelta
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from config.permissions import require_auth
from apps.exams.models import Exam, ExamQuestion, ExamAttempt, ExamAnswer
from apps.questions.models import Question
from apps.questions.views import serialize_question


# ─────────────────────────────────────────────
# Helper: Serialize đề thi (ẩn answer_pdf_url mặc định)
# ─────────────────────────────────────────────
def serialize_exam(exam, include_pdf=False):
    """Trả dict thông tin đề thi, mặc định ẩn answer_pdf_url."""
    data = {
        "id": exam.id,
        "title": exam.title,
        "exam_type": exam.exam_type,
        "topic_id": exam.topic_id,
        "duration_minutes": exam.duration_minutes,
        "question_count": ExamQuestion.objects.filter(exam=exam).count(),
        "created_at": exam.created_at.isoformat() if exam.created_at else None,
    }
    if include_pdf and exam.answer_pdf:
        data["answer_pdf_url"] = exam.answer_pdf.url
    return data


# ─────────────────────────────────────────────
# Helper: Tính điểm trong Python (KHÔNG dùng SQL aggregate)
# MCQ đúng: 0.25đ | TF mỗi ý đúng: 0.1đ (max 0.4đ/câu) | SA đúng: 0.5đ
# Quy về thang 10: score = (earned / max_possible) * 10
# ─────────────────────────────────────────────
def calculate_score(attempt):
    """Tính tổng điểm và số câu đúng cho attempt từ ExamAnswer đã lưu."""
    answers = ExamAnswer.objects.filter(attempt=attempt).select_related('question')

    earned = 0.0
    max_possible = 0.0
    correct_count = 0

    for ans in answers:
        q = ans.question

        if q.question_type == 'mcq':
            max_possible += 0.25
            if ans.is_correct:
                earned += 0.25
                correct_count += 1

        elif q.question_type == 'true_false':
            # Mỗi câu TF tối đa 1đ, thang điểm bậc thang theo số câu nhỏ đúng:
            # 1 đúng → 0.10đ | 2 đúng → 0.25đ | 3 đúng → 0.50đ | 4 đúng → 1.00đ
            TF_SCALE = {0: 0.0, 1: 0.1, 2: 0.25, 3: 0.5, 4: 1.0}
            max_possible += 1.0

            answer_data = ans.answer_data or {}
            answers_map = answer_data.get("answers", {})
            statements = list(q.questiontfstatement_set.all())
            stmt_correct = 0
            for st in statements:
                val = answers_map.get(st.statement_key)
                if val is not None and bool(val) == st.is_true:
                    stmt_correct += 1

            # Lấy điểm theo bậc thang, cap tối đa ở 4 câu nhỏ
            tf_score = TF_SCALE.get(min(stmt_correct, 4), 0.0)
            earned += tf_score
            if stmt_correct == len(statements) and len(statements) > 0:
                correct_count += 1

        elif q.question_type == 'short_answer':
            max_possible += 0.5
            if ans.is_correct:
                earned += 0.5
                correct_count += 1

    if max_possible == 0:
        score = 0.0
    else:
        score = (earned / max_possible) * 10

    return round(score, 2), correct_count


# ─────────────────────────────────────────────
# Helper: Chấm điểm và lưu từng ExamAnswer
# ─────────────────────────────────────────────
def grade_and_save_answers(attempt, answers_list):
    """Chấm từng câu trả lời, lưu ExamAnswer. Trả (correct_count, total)."""
    correct_count = 0
    total = len(answers_list)

    for item in answers_list:
        question_id = item.get("question_id")
        answer_data = item.get("answer_data", {})

        try:
            q = Question.objects.get(id=question_id, is_deleted=False)
        except Question.DoesNotExist:
            continue

        is_correct = False

        if q.question_type == 'mcq':
            selected = answer_data.get("selected")
            correct_opt = q.questionoption_set.filter(is_correct=True).first()
            if correct_opt and selected == correct_opt.option_key:
                is_correct = True

        elif q.question_type == 'true_false':
            # TF is_correct = True chỉ khi TẤT CẢ statements đúng
            answers_map = answer_data.get("answers", {})
            all_correct = True
            for st in q.questiontfstatement_set.all():
                val = answers_map.get(st.statement_key)
                if val is None or bool(val) != st.is_true:
                    all_correct = False
                    break
            is_correct = all_correct

        elif q.question_type == 'short_answer':
            val = answer_data.get("value")
            try:
                sa = q.questionshortanswer
                if val is not None and abs(float(val) - float(sa.correct_answer)) < 0.01:
                    is_correct = True
            except Exception:
                pass

        ExamAnswer.objects.create(
            attempt=attempt,
            question=q,
            answer_data=answer_data,
            is_correct=is_correct
        )

        if is_correct:
            correct_count += 1

    return correct_count, total


# ─────────────────────────────────────────────
# EXAM VIEWS
# ─────────────────────────────────────────────

@csrf_exempt
def exams_list_or_create(request):
    """GET danh sách đề thi (public) | POST tạo đề mới (teacher)."""
    if request.method == 'GET':
        qs = Exam.objects.filter(is_deleted=False).order_by('-created_at')

        exam_type = request.GET.get('exam_type')
        topic_id = request.GET.get('topic_id')
        if exam_type:
            qs = qs.filter(exam_type=exam_type)
        if topic_id:
            qs = qs.filter(topic_id=topic_id)

        try:
            page = int(request.GET.get('page', 1))
        except ValueError:
            page = 1

        offset = (page - 1) * 20
        total = qs.count()
        exams = qs[offset:offset + 20]

        return JsonResponse({
            "total": total,
            "page": page,
            "results": [serialize_exam(e) for e in exams]
        })

    elif request.method == 'POST':
        return require_auth(roles=["teacher"])(create_exam)(request)

    return JsonResponse({"error": "Method not allowed"}, status=405)


def create_exam(request):
    """Tạo đề thi mới kèm danh sách câu hỏi (teacher)."""
    try:
        data = json.loads(request.body)
        title = data.get('title', '').strip()
        exam_type = data.get('exam_type', '').strip()
        topic_id = data.get('topic_id')
        # Hỗ trợ cả 'duration_minutes' lẫn 'duration' từ frontend
        raw_duration = data.get('duration_minutes') or data.get('duration')
        question_ids = data.get('question_ids', [])

        if not title or not exam_type:
            return JsonResponse({"error": "Thiếu title hoặc exam_type"}, status=400)

        # Validate duration bắt buộc
        if raw_duration is None or raw_duration == '':
            return JsonResponse({"error": "Vui lòng nhập thời gian làm bài (phút)"}, status=400)
        try:
            duration_minutes = int(raw_duration)
            if duration_minutes < 1 or duration_minutes > 300:
                return JsonResponse({"error": "Thời gian làm bài phải từ 1 đến 300 phút"}, status=400)
        except (ValueError, TypeError):
            return JsonResponse({"error": "Thời gian làm bài không hợp lệ"}, status=400)

        valid_types = ['topic', 'midterm', 'final', 'graduation']
        if exam_type not in valid_types:
            return JsonResponse(
                {"error": f"exam_type phải là một trong: {', '.join(valid_types)}"},
                status=400
            )

        exam = Exam.objects.create(
            title=title,
            exam_type=exam_type,
            topic_id=topic_id if topic_id else None,
            duration_minutes=int(duration_minutes),
            created_by_id=request.user_id
        )

        # Tạo ExamQuestion theo thứ tự question_ids truyền vào
        created_count = 0
        for idx, qid in enumerate(question_ids):
            try:
                q = Question.objects.get(id=int(qid), is_deleted=False)
                ExamQuestion.objects.create(exam=exam, question=q, order_index=idx + 1)
                created_count += 1
            except (Question.DoesNotExist, ValueError, TypeError):
                continue

        result = serialize_exam(exam)
        result['question_count'] = created_count
        return JsonResponse(result, status=201)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
def exam_detail_update_delete(request, exam_id):
    """GET chi tiết | PUT cập nhật | DELETE xóa mềm."""
    if request.method == 'GET':
        return get_exam_detail(request, exam_id)
    elif request.method == 'PUT':
        return require_auth(roles=["teacher"])(update_exam)(request, exam_id)
    elif request.method == 'DELETE':
        return require_auth(roles=["teacher"])(delete_exam)(request, exam_id)
    return JsonResponse({"error": "Method not allowed"}, status=405)


def get_exam_detail(request, exam_id):
    """Chi tiết đề thi + questions (ẩn đáp án). Nếu authenticated thêm attempt_count."""
    try:
        exam = Exam.objects.get(id=exam_id, is_deleted=False)
    except Exam.DoesNotExist:
        return JsonResponse({"error": "Đề thi không tồn tại"}, status=404)

    exam_questions = ExamQuestion.objects.filter(exam=exam).order_by('order_index')
    questions_list = [serialize_question(eq.question) for eq in exam_questions]

    data = serialize_exam(exam)
    data["questions"] = questions_list

    # Thêm attempt_count nếu user đã đăng nhập
    if request.user_id:
        attempt_count = ExamAttempt.objects.filter(
            exam=exam, user_id=request.user_id
        ).count()
        data["attempt_count"] = attempt_count

    return JsonResponse(data)


def update_exam(request, exam_id):
    """Cập nhật thông tin và câu hỏi của đề thi (teacher)."""
    try:
        exam = Exam.objects.get(id=exam_id, is_deleted=False)
    except Exam.DoesNotExist:
        return JsonResponse({"error": "Đề thi không tồn tại"}, status=404)

    try:
        data = json.loads(request.body)

        if 'title' in data:
            exam.title = data['title']
        if 'exam_type' in data:
            exam.exam_type = data['exam_type']
        if 'topic_id' in data:
            exam.topic_id = data['topic_id']
        if 'duration_minutes' in data:
            exam.duration_minutes = data['duration_minutes']
        exam.save()

        # Cập nhật danh sách câu hỏi nếu có
        if 'question_ids' in data:
            ExamQuestion.objects.filter(exam=exam).delete()
            for idx, qid in enumerate(data['question_ids']):
                try:
                    q = Question.objects.get(id=qid, is_deleted=False)
                    ExamQuestion.objects.create(exam=exam, question=q, order_index=idx + 1)
                except Question.DoesNotExist:
                    continue

        return JsonResponse({"id": exam.id, "message": "Cập nhật thành công"})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


def delete_exam(request, exam_id):
    """Soft delete đề thi (teacher)."""
    try:
        exam = Exam.objects.get(id=exam_id, is_deleted=False)
        exam.is_deleted = True
        exam.save(update_fields=['is_deleted'])
        return JsonResponse({"message": "Đã xóa đề thi"})
    except Exam.DoesNotExist:
        return JsonResponse({"error": "Đề thi không tồn tại"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@require_auth(roles=["teacher"])
def upload_exam_pdf(request, exam_id):
    """Upload file PDF đáp án, lưu vào media/exam_pdfs/<exam_id>_answer.pdf (teacher)."""
    if request.method != 'POST':
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        exam = Exam.objects.get(id=exam_id, is_deleted=False)
    except Exam.DoesNotExist:
        return JsonResponse({"error": "Đề thi không tồn tại"}, status=404)

    try:
        pdf_file = request.FILES.get("pdf_file")
        if not pdf_file:
            return JsonResponse({"error": "Thiếu file pdf_file"}, status=400)

        if not pdf_file.name.lower().endswith('.pdf'):
            return JsonResponse({"error": "Chỉ chấp nhận file PDF"}, status=400)

        # Đặt tên file cố định theo exam_id
        file_path = f"exam_pdfs/{exam_id}_answer.pdf"

        # Xóa file cũ nếu đã tồn tại để thay thế
        if default_storage.exists(file_path):
            default_storage.delete(file_path)

        default_storage.save(file_path, ContentFile(pdf_file.read()))
        exam.answer_pdf = file_path
        exam.save(update_fields=['answer_pdf'])

        return JsonResponse({
            "message": "Upload PDF thành công",
            "file_path": file_path
        })
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


# ─────────────────────────────────────────────
# ATTEMPT VIEWS
# ─────────────────────────────────────────────

@csrf_exempt
@require_auth(roles=["student"])
def create_attempt(request, exam_id):
    """Tạo lượt làm bài mới. Tối đa 3 lần/đề (student)."""
    if request.method != 'POST':
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        exam = Exam.objects.get(id=exam_id, is_deleted=False)
    except Exam.DoesNotExist:
        return JsonResponse({"error": "Đề thi không tồn tại"}, status=404)

    try:
        # Đếm số lần đã làm
        attempt_count = ExamAttempt.objects.filter(
            exam=exam, user_id=request.user_id
        ).count()

        if attempt_count >= 3:
            return JsonResponse({"error": "Đã hết lượt làm bài"}, status=403)

        attempt = ExamAttempt.objects.create(
            user_id=request.user_id,
            exam=exam,
            attempt_number=attempt_count + 1
        )

        # Lấy câu hỏi đề (ẩn đáp án)
        exam_questions = ExamQuestion.objects.filter(exam=exam).order_by('order_index')
        questions_list = [serialize_question(eq.question) for eq in exam_questions]

        return JsonResponse({
            "attempt_id": attempt.id,
            "started_at": attempt.started_at.isoformat(),
            "duration_minutes": exam.duration_minutes,
            "questions": questions_list
        }, status=201)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@require_auth(roles=["student"])
def submit_attempt(request, attempt_id):
    """Nộp bài, tính điểm trong Python, trả kết quả (student)."""
    if request.method != 'POST':
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        attempt = ExamAttempt.objects.get(id=attempt_id, user_id=request.user_id)
    except ExamAttempt.DoesNotExist:
        return JsonResponse({"error": "Lượt làm bài không tồn tại hoặc không có quyền"}, status=403)

    if attempt.submitted_at is not None:
        return JsonResponse({"error": "Bài đã được nộp trước đó"}, status=400)

    try:
        data = json.loads(request.body)
        answers_list = data.get("answers", [])

        # Chấm điểm và lưu ExamAnswer
        grade_and_save_answers(attempt, answers_list)

        # Tính tổng điểm từ ExamAnswer đã lưu
        score, correct_count = calculate_score(attempt)
        total_questions = ExamQuestion.objects.filter(exam=attempt.exam).count()

        # Cập nhật attempt
        attempt.submitted_at = timezone.now()
        attempt.score = score
        attempt.save(update_fields=['submitted_at', 'score'])

        response_data = {
            "score": float(score),
            "correct_count": correct_count,
            "total_questions": total_questions
        }

        # Trả answer_pdf_url nếu có
        if attempt.exam.answer_pdf:
            response_data["answer_pdf_url"] = attempt.exam.answer_pdf.url

        return JsonResponse(response_data)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@require_auth(roles=["student"])
def attempt_detail(request, attempt_id):
    """Kết quả chi tiết từng câu của lượt làm bài (student)."""
    if request.method != 'GET':
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        attempt = ExamAttempt.objects.get(id=attempt_id, user_id=request.user_id)
    except ExamAttempt.DoesNotExist:
        return JsonResponse({"error": "Lượt làm bài không tồn tại hoặc không có quyền"}, status=403)

    try:
        answers = ExamAnswer.objects.filter(attempt=attempt).select_related('question')
        answers_list = [
            {
                "question_id": ans.question_id,
                "answer_data": ans.answer_data,
                "is_correct": ans.is_correct
            }
            for ans in answers
        ]

        response_data = {
            "id": attempt.id,
            "exam_id": attempt.exam_id,
            "attempt_number": attempt.attempt_number,
            "started_at": attempt.started_at.isoformat(),
            "submitted_at": attempt.submitted_at.isoformat() if attempt.submitted_at else None,
            "score": float(attempt.score) if attempt.score is not None else None,
            "is_auto_submitted": attempt.is_auto_submitted,
            "answers": answers_list
        }

        if attempt.exam.answer_pdf:
            response_data["answer_pdf_url"] = attempt.exam.answer_pdf.url

        return JsonResponse(response_data)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
