import json
import os
from datetime import datetime
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.core.files.storage import default_storage
from django.core.paginator import Paginator
from django.db.models import Q
from config.permissions import require_auth
from config.settings import PHOTO_OFFICIAL_DIR, PHOTO_TMP_DIR
from apps.questions.models import Question, QuestionOption, QuestionTFStatement, QuestionShortAnswer

def get_data_value(data, key):
    """Helper to get value from dict or QueryDict"""
    val = data.get(key)
    if isinstance(val, list):
        return val[0] if val else None
    return val

def serialize_question(q):
    # Lấy topic_name nếu có topic
    topic_name = None
    if q.topic_id:
        try:
            from apps.topics.models import Topic
            topic = Topic.objects.filter(id=q.topic_id, is_deleted=False).first()
            if topic:
                topic_name = topic.name
        except:
            pass
    
    # Handle content_json - có thể là string hoặc dict
    content_json = q.content_json
    if isinstance(content_json, str):
        try:
            content_json = json.loads(content_json)
        except:
            content_json = {"blocks": [{"type": "paragraph", "content": [{"type": "text", "value": content_json}]}]}
    
    data = {
        "id": q.id,
        "topic_id": q.topic_id,
        "topic_name": topic_name,
        "question_type": q.question_type,
        "content_json": content_json,
        "difficulty": float(q.difficulty) if q.difficulty else None,
        "image_url": q.image_url if q.image_url else None,
        "created_at": q.created_at.isoformat() if q.created_at else None
    }
    
    if q.question_type == 'mcq':
        options = []
        for opt in q.questionoption_set.all():
            opt_content = opt.content_json
            if isinstance(opt_content, str):
                try:
                    opt_content = json.loads(opt_content)
                except:
                    opt_content = {"blocks": [{"type": "paragraph", "content": []}]}
            options.append({
                "id": opt.id,
                "option_key": opt.option_key,
                "content_json": opt_content,
                "is_correct": opt.is_correct
            })
        data["options"] = options
        
    elif q.question_type == 'true_false':
        statements = []
        for st in q.questiontfstatement_set.all():
            st_content = st.content_json
            if isinstance(st_content, str):
                try:
                    st_content = json.loads(st_content)
                except:
                    st_content = {"blocks": [{"type": "paragraph", "content": []}]}
            statements.append({
                "id": st.id,
                "statement_key": st.statement_key,
                "content_json": st_content,
                "is_true": st.is_true
            })
        data["statements"] = statements
        
    elif q.question_type == 'short_answer':
        try:
            sa = q.questionshortanswer
            data["short_answer_correct"] = str(sa.correct_answer)
        except QuestionShortAnswer.DoesNotExist:
            pass
        
    return data

@csrf_exempt
def questions_list_or_create(request):
    if request.method == 'GET':
        qs = Question.objects.filter(is_deleted=False).order_by('-id')
        
        topic_id = request.GET.get('topic_id')
        question_type = request.GET.get('question_type')
        difficulty_min = request.GET.get('difficulty_min')
        difficulty_max = request.GET.get('difficulty_max')
        q_search = request.GET.get('q')
        
        if topic_id:
            qs = qs.filter(topic_id=topic_id)
        if question_type:
            # Support both 'mcq' and 'tf' for compatibility
            if question_type == 'tf':
                qs = qs.filter(question_type='true_false')
            elif question_type == 'sa':
                qs = qs.filter(question_type='short_answer')
            else:
                qs = qs.filter(question_type=question_type)
        if q_search:
            qs = qs.filter(content_json__contains=q_search)
        if difficulty_min:
            qs = qs.filter(difficulty__gte=difficulty_min)
        if difficulty_max:
            qs = qs.filter(difficulty__lte=difficulty_max)
            
        try:
            page = int(request.GET.get('page', 1))
        except ValueError:
            page = 1
            
        offset = (page - 1) * 20
        total = qs.count()
        questions = qs[offset:offset+20]
        
        results = [serialize_question(q) for q in questions]
        
        return JsonResponse({
            "total": total,
            "page": page,
            "results": results
        })
        
    elif request.method == 'POST':
        return require_auth(roles=["teacher"])(create_question)(request)
        
    return JsonResponse({"error": "Method not allowed"}, status=405)

def create_question(request):
    try:
        topic_id = request.POST.get("topic_id")
        question_type = request.POST.get("question_type")
        difficulty = request.POST.get("difficulty")
        content_json_str = request.POST.get("content_json")
        image_url = request.POST.get("image_url")
        
        if not question_type or not content_json_str:
            return JsonResponse({"error": "Thiếu question_type hoặc content_json"}, status=400)
            
        content_json = json.loads(content_json_str)
        
        # Handle temp image - move to official
        final_image_url = None
        if image_url and '/photo/tmp/' in image_url:
            try:
                # Extract filename from temp URL
                temp_filename = image_url.split('/photo/tmp/')[-1]
                temp_path = PHOTO_TMP_DIR / temp_filename
                if temp_path.exists():
                    # Generate new filename in official
                    ext = os.path.splitext(temp_filename)[1]
                    official_filename = f"q_{datetime.now().strftime('%Y%m%d_%H%M%S')}{ext}"
                    official_path = PHOTO_OFFICIAL_DIR / official_filename
                    
                    # Move file
                    os.rename(temp_path, official_path)
                    final_image_url = f"/media/photo/official/{official_filename}"
            except Exception as e:
                print(f"Error moving temp image: {e}")
                final_image_url = image_url  # Keep temp URL if move fails
        elif image_url:
            final_image_url = image_url
        
        q = Question.objects.create(
            topic_id=topic_id,
            question_type=question_type,
            content_json=content_json,
            difficulty=difficulty,
            image_url=final_image_url,
            created_by_id=request.user_id
        )
            
        # Parse child tables
        if question_type == 'mcq':
            options_str = request.POST.get("options")
            if options_str:
                options = json.loads(options_str)
                for opt in options:
                    QuestionOption.objects.create(
                        question=q,
                        option_key=opt.get("key", ""),
                        content_json=opt.get("content_json", {}),
                        is_correct=opt.get("is_correct", False)
                    )
        elif question_type == 'true_false':
            statements_str = request.POST.get("statements")
            if statements_str:
                statements = json.loads(statements_str)
                for st in statements:
                    QuestionTFStatement.objects.create(
                        question=q,
                        statement_key=st.get("key", ""),
                        content_json=st.get("content_json", {}),
                        is_true=st.get("is_true", False)
                    )
        elif question_type == 'short_answer':
            answer = request.POST.get("correct_answer")
            if answer is not None:
                QuestionShortAnswer.objects.create(
                    question=q,
                    correct_answer=answer
                )
                
        return JsonResponse(serialize_question(q), status=201)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
def question_detail_update_delete(request, pk):
    if request.method == 'GET':
        try:
            q = Question.objects.get(id=pk, is_deleted=False)
            return JsonResponse(serialize_question(q))
        except Question.DoesNotExist:
            return JsonResponse({"error": "Câu hỏi không tồn tại"}, status=404)
            
    elif request.method in ['PUT', 'PATCH']:
        return require_auth(roles=["teacher"])(update_question)(request, pk)
    elif request.method == 'DELETE':
        return require_auth(roles=["teacher"])(delete_question)(request, pk)
        
    return JsonResponse({"error": "Method not allowed"}, status=405)

def update_question(request, pk):
    try:
        q = Question.objects.get(id=pk, is_deleted=False)
    except Question.DoesNotExist:
        return JsonResponse({"error": "Câu hỏi không tồn tại"}, status=404)
        
    try:
        # For multipart/form-data (FormData from axios), use request.POST
        # For JSON body, parse request.body
        data = {}
        
        # Check if it's FormData
        if request.content_type and 'multipart/form-data' in request.content_type:
            # FormData case - use request.POST directly
            data = request.POST
        elif request.body:
            # JSON case
            try:
                data = json.loads(request.body.decode('utf-8'))
            except (json.JSONDecodeError, UnicodeDecodeError):
                data = {}
        
        # Store original question type for child table update logic
        original_qtype = q.question_type
        new_qtype = get_data_value(data, "question_type") or q.question_type
            
        if "topic_id" in data:
            topic_val = get_data_value(data, "topic_id")
            try:
                if topic_val and str(topic_val).strip():
                    q.topic_id = int(topic_val)
                else:
                    q.topic_id = None
            except (ValueError, TypeError):
                q.topic_id = None
        if "question_type" in data:
            q.question_type = new_qtype
        if "difficulty" in data:
            diff_val = get_data_value(data, "difficulty")
            q.difficulty = float(diff_val) if diff_val else None
        if "content_json" in data:
            val = get_data_value(data, "content_json")
            try:
                q.content_json = json.loads(val) if isinstance(val, str) else val
            except json.JSONDecodeError:
                pass
        if "image_url" in data:
            img_val = get_data_value(data, "image_url")
            
            # Handle temp image - move to official
            final_img_url = None
            if img_val and '/photo/tmp/' in str(img_val):
                try:
                    temp_filename = str(img_val).split('/photo/tmp/')[-1]
                    temp_path = PHOTO_TMP_DIR / temp_filename
                    if temp_path.exists():
                        ext = os.path.splitext(temp_filename)[1]
                        official_filename = f"q_{datetime.now().strftime('%Y%m%d_%H%M%S')}{ext}"
                        official_path = PHOTO_OFFICIAL_DIR / official_filename
                        os.rename(temp_path, official_path)
                        final_img_url = f"/media/photo/official/{official_filename}"
                except Exception as e:
                    print(f"Error moving temp image: {e}")
                    final_img_url = img_val
            elif img_val:
                final_img_url = img_val
            
            q.image_url = final_img_url if final_img_url and str(final_img_url).strip() else None
            
        q.save()
        
        # Update child tables based on NEW question type
        # First delete old child records if question type changed
        if original_qtype != new_qtype:
            if original_qtype == 'mcq':
                q.questionoption_set.all().delete()
            elif original_qtype == 'true_false':
                q.questiontfstatement_set.all().delete()
            elif original_qtype == 'short_answer':
                QuestionShortAnswer.objects.filter(question=q).delete()
        
        # Create/update child records based on NEW question type
        if new_qtype == 'mcq' and "options" in data:
            q.questionoption_set.all().delete()
            try:
                val = get_data_value(data, "options")
                options = json.loads(val) if isinstance(val, str) else val
                if isinstance(options, list):
                    for opt in options:
                        QuestionOption.objects.create(
                            question=q,
                            option_key=opt.get("key", ""),
                            content_json=opt.get("content_json", {}),
                            is_correct=opt.get("is_correct", False)
                        )
            except (json.JSONDecodeError, TypeError) as e:
                print(f"Error parsing options: {e}")
                
        if new_qtype == 'true_false' and "statements" in data:
            q.questiontfstatement_set.all().delete()
            try:
                val = get_data_value(data, "statements")
                statements = json.loads(val) if isinstance(val, str) else val
                if isinstance(statements, list):
                    for st in statements:
                        QuestionTFStatement.objects.create(
                            question=q,
                            statement_key=st.get("key", ""),
                            content_json=st.get("content_json", {}),
                            is_true=st.get("is_true", False)
                        )
            except (json.JSONDecodeError, TypeError) as e:
                print(f"Error parsing statements: {e}")
                
        if new_qtype == 'short_answer' and "correct_answer" in data:
            try:
                ans_val = get_data_value(data, "correct_answer")
                QuestionShortAnswer.objects.filter(question=q).delete()
                QuestionShortAnswer.objects.create(
                    question=q,
                    correct_answer=ans_val
                )
            except Exception as e:
                print(f"Error processing short answer: {e}")
            
        return JsonResponse(serialize_question(q))
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({"error": str(e)}, status=500)

def delete_question(request, pk):
    try:
        q = Question.objects.get(id=pk, is_deleted=False)
        q.is_deleted = True
        q.save(update_fields=["is_deleted"])
        return JsonResponse({"message": "Xóa thành công"})
    except Question.DoesNotExist:
        return JsonResponse({"error": "Câu hỏi không tồn tại"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
def check_answer(request, pk):
    if request.method != 'POST':
        return JsonResponse({"error": "Method not allowed"}, status=405)
    
    try:
        q = Question.objects.get(id=pk, is_deleted=False)
    except Question.DoesNotExist:
        return JsonResponse({"error": "Câu hỏi không tồn tại"}, status=404)
    
    try:
        data = json.loads(request.body)
        answer_data = data.get("answer_data", {})
        
        if q.question_type == 'mcq':
            selected = answer_data.get("selected")
            correct_opt = q.questionoption_set.filter(is_correct=True).first()
            
            is_correct = False
            if correct_opt and selected == correct_opt.option_key:
                is_correct = True
                
            return JsonResponse({
                "is_correct": is_correct,
                "correct_answer": correct_opt.option_key if correct_opt else None
            })
            
        elif q.question_type == 'true_false':
            answers = answer_data.get("answers", {})
            per_statement = {}
            all_correct = True
            correct_answers = {}
            
            for st in q.questiontfstatement_set.all():
                correct_answers[st.statement_key] = st.is_true
                
                ans = answers.get(st.statement_key)
                if ans is not None:
                    correct = bool(ans) == st.is_true
                    per_statement[st.statement_key] = correct
                    if not correct:
                        all_correct = False
                else:
                    all_correct = False
                    
            return JsonResponse({
                "is_correct": all_correct,
                "per_statement": per_statement,
                "correct_answer": correct_answers
            })
            
        elif q.question_type == 'short_answer':
            val = answer_data.get("value")
            is_correct = False
            correct_answer_val = None
            
            try:
                sa = q.questionshortanswer
                correct_answer_val = float(sa.correct_answer)
                
                if val is not None:
                    val_float = float(val)
                    if abs(val_float - correct_answer_val) < 0.01:
                        is_correct = True
            except (ValueError, TypeError, QuestionShortAnswer.DoesNotExist):
                pass
            
            return JsonResponse({
                "is_correct": is_correct,
                "correct_answer": correct_answer_val
            })
        
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
def upload_image(request):
    if request.method != 'POST':
        return JsonResponse({"error": "Method not allowed"}, status=405)
    
    try:
        image = request.FILES.get("image")
        if not image:
            return JsonResponse({"error": "Không có file ảnh"}, status=400)
        
        # Tạo directories nếu chưa có
        PHOTO_OFFICIAL_DIR.mkdir(parents=True, exist_ok=True)
        PHOTO_TMP_DIR.mkdir(parents=True, exist_ok=True)
        
        # Lấy tên gốc và extension
        ext = os.path.splitext(image.name)[1].lower()
        if ext not in ['.jpg', '.jpeg', '.png', '.gif', '.webp']:
            return JsonResponse({"error": "Định dạng không hợp lệ"}, status=400)
        
        # Tạo tên file mới với timestamp để tránh trùng
        base_name = f"tmp_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        new_filename = f"{base_name}{ext}"
        file_path = PHOTO_TMP_DIR / new_filename
        
        # Nếu đã tồn tại, thêm thêm milliseconds
        counter = 1
        while os.path.exists(file_path):
            new_filename = f"{base_name}_{counter:03d}{ext}"
            file_path = PHOTO_TMP_DIR / new_filename
            counter += 1
        
        # Lưu file vào temp
        with open(file_path, 'wb+') as dest:
            for chunk in image.chunks():
                dest.write(chunk)
        
        # Trả về URL tạm (để preview)
        image_url = f"/media/photo/tmp/{new_filename}"
        return JsonResponse({
            "success": True,
            "image_url": image_url,
            "filename": new_filename,
            "is_temp": True
        })
        
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
