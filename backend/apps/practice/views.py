import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db import connection
from django.utils import timezone
from config.permissions import require_auth
from apps.practice.models import PracticeSession, PracticeAnswer
from apps.questions.models import Question
from apps.questions.views import serialize_question

@csrf_exempt
@require_auth(roles=["student"])
def create_session(request):
    if request.method != 'POST':
        return JsonResponse({"error": "Method not allowed"}, status=405)
        
    try:
        data = json.loads(request.body)
        topic_id = data.get("topic_id")
        
        if not topic_id:
            return JsonResponse({"error": "Thiếu topic_id"}, status=400)
            
        # Create session
        session = PracticeSession.objects.create(
            user_id=request.user_id,
            topic_id=topic_id
        )
        
        # Lấy 10 câu hỏi ngẫu nhiên từ topic_id và các topic con
        query = """
        WITH RECURSIVE children AS (
            SELECT id FROM topics WHERE id = %s AND is_deleted = False
            UNION ALL
            SELECT t.id FROM topics t
            INNER JOIN children c ON t.parent_id = c.id
            WHERE t.is_deleted = False
        )
        SELECT id FROM questions 
        WHERE topic_id IN (SELECT id FROM children) AND is_deleted = False 
        ORDER BY RANDOM() LIMIT 10
        """
        
        with connection.cursor() as cursor:
            cursor.execute(query, [topic_id])
            question_ids = [row[0] for row in cursor.fetchall()]
            
        questions = Question.objects.filter(id__in=question_ids)
        # Sắp xếp lại theo đúng thứ tự ID đã lấy ngẫu nhiên nếu cần, nhưng list cũng chỉ có 10 phần tử
        questions_list = [serialize_question(q) for q in questions]
        
        return JsonResponse({
            "session_id": session.id,
            "questions": questions_list
        }, status=201)
        
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
@require_auth(roles=["student"])
def answer_question(request, pk):
    if request.method != 'POST':
        return JsonResponse({"error": "Method not allowed"}, status=405)
        
    try:
        session = PracticeSession.objects.get(id=pk, user_id=request.user_id)
    except PracticeSession.DoesNotExist:
        return JsonResponse({"error": "Session không tồn tại hoặc không có quyền truy cập"}, status=403)
        
    try:
        data = json.loads(request.body)
        question_id = data.get("question_id")
        answer_data = data.get("answer_data", {})
        
        try:
            q = Question.objects.get(id=question_id, is_deleted=False)
        except Question.DoesNotExist:
            return JsonResponse({"error": "Câu hỏi không tồn tại"}, status=404)
            
        is_correct = False
        correct_answer_val = None
        per_statement = {}
        
        if q.question_type == 'mcq':
            selected = answer_data.get("selected")
            correct_opt = q.questionoption_set.filter(is_correct=True).first()
            if correct_opt and selected == correct_opt.option_key:
                is_correct = True
            correct_answer_val = correct_opt.option_key if correct_opt else None
            
        elif q.question_type == 'true_false':
            answers = answer_data.get("answers", {})
            all_correct = True
            correct_answer_val = {}
            for st in q.questiontfstatement_set.all():
                correct_answer_val[st.statement_key] = st.is_true
                ans = answers.get(st.statement_key)
                if ans is not None:
                    correct = bool(ans) == st.is_true
                    per_statement[st.statement_key] = correct
                    if not correct:
                        all_correct = False
                else:
                    all_correct = False
            is_correct = all_correct
            
        elif q.question_type == 'short_answer':
            val = answer_data.get("value")
            try:
                sa = q.questionshortanswer
                correct_answer_val = float(sa.correct_answer)
                if val is not None:
                    val_float = float(val)
                    if abs(val_float - correct_answer_val) < 0.01:
                        is_correct = True
            except Exception:
                pass
                
        # Lưu PracticeAnswer
        PracticeAnswer.objects.create(
            session=session,
            question=q,
            answer_data=answer_data,
            is_correct=is_correct
        )
        
        response_data = {
            "is_correct": is_correct,
            "correct_answer": correct_answer_val
        }
        if q.question_type == 'true_false':
            response_data["per_statement"] = per_statement
            
        return JsonResponse(response_data)
        
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
@require_auth(roles=["student"])
def end_session(request, pk):
    if request.method != 'POST':
        return JsonResponse({"error": "Method not allowed"}, status=405)
        
    try:
        session = PracticeSession.objects.get(id=pk, user_id=request.user_id)
        session.ended_at = timezone.now()
        session.save(update_fields=['ended_at'])
        return JsonResponse({"message": "Đã kết thúc phiên luyện tập"})
    except PracticeSession.DoesNotExist:
        return JsonResponse({"error": "Session không tồn tại hoặc không có quyền truy cập"}, status=403)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
@require_auth(roles=["student"])
def session_detail(request, pk):
    if request.method != 'GET':
        return JsonResponse({"error": "Method not allowed"}, status=405)
        
    try:
        session = PracticeSession.objects.get(id=pk, user_id=request.user_id)
        answers = PracticeAnswer.objects.filter(session=session)
        
        answers_list = []
        for ans in answers:
            answers_list.append({
                "id": ans.id,
                "question_id": ans.question_id,
                "answer_data": ans.answer_data,
                "is_correct": ans.is_correct,
                "answered_at": ans.answered_at.isoformat() if ans.answered_at else None
            })
            
        return JsonResponse({
            "id": session.id,
            "topic_id": session.topic_id,
            "started_at": session.started_at.isoformat() if session.started_at else None,
            "ended_at": session.ended_at.isoformat() if session.ended_at else None,
            "answers": answers_list
        })
    except PracticeSession.DoesNotExist:
        return JsonResponse({"error": "Session không tồn tại hoặc không có quyền truy cập"}, status=403)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
@require_auth(roles=["student"])
def practice_history(request):
    """Trả lịch sử luyện tập của student."""
    if request.method != 'GET':
        return JsonResponse({"error": "Method not allowed"}, status=405)
        
    try:
        topic_id = request.GET.get("topic_id")
        
        # Lấy tổng số câu hỏi trong topic
        from apps.questions.models import Question
        total_questions_in_topic = Question.objects.filter(topic_id=topic_id, is_deleted=False).count()
        
        # Lấy tất cả câu trả lời của user trong topic
        qs = PracticeAnswer.objects.filter(session__user_id=request.user_id)
        if topic_id:
            qs = qs.filter(session__topic_id=topic_id)
            
        total_questions = qs.count()
        correct_count = qs.filter(is_correct=True).count()
        
        # Đếm số câu hỏi đã trả lời đúng từ 2 lần trở lên
        # Nhóm theo question_id và đếm số lần đúng
        from django.db.models import Count, Q
        question_correct_counts = qs.filter(is_correct=True).values('question_id').annotate(
            correct_times=Count('id')
        )
        questions_correct_2plus = sum(1 for q in question_correct_counts if q['correct_times'] >= 2)
        
        # Tỉ lệ = (số câu đã trả lời đúng từ 2 lần trở lên) / (tổng số câu hỏi trong chuyên đề x 2) * 100
        if total_questions_in_topic == 0 or total_questions_in_topic * 2 == 0:
            completion_percent = 0
        else:
            completion_percent = min((questions_correct_2plus / (total_questions_in_topic * 2)) * 100, 100)
        
        return JsonResponse({
            "topic_id": topic_id,
            "total_questions": total_questions,
            "total_questions_in_topic": total_questions_in_topic,
            "correct_count": correct_count,
            "questions_correct_2plus": questions_correct_2plus,
            "completion_percent": round(completion_percent, 1)
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({"error": str(e)}, status=500)

