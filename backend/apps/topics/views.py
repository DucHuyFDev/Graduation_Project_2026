import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from config.permissions import require_auth
from apps.topics.models import Topic

@csrf_exempt
def topics_tree(request):
    if request.method != 'GET':
        return JsonResponse({"error": "Method not allowed"}, status=405)
    
    topics = Topic.objects.filter(is_deleted=False).order_by('level', 'order_index')
    
    # First pass: Create dict
    topic_dict = {}
    for t in topics:
        topic_dict[t.id] = {
            "id": t.id,
            "name": t.name,
            "description": t.description,
            "parent_id": t.parent_id,
            "level": t.level,
            "order_index": t.order_index,
            "children": []
        }
        
    root_topics = []
    # Second pass: Assign children
    for t_id, t_data in topic_dict.items():
        if t_data['parent_id'] and t_data['parent_id'] in topic_dict:
            topic_dict[t_data['parent_id']]['children'].append(t_data)
        else:
            root_topics.append(t_data)
            
    return JsonResponse(root_topics, safe=False)

@csrf_exempt
def topics_list_or_create(request):
    if request.method == 'GET':
        level = request.GET.get('level')
        parent_id = request.GET.get('parent_id')
        
        qs = Topic.objects.filter(is_deleted=False).order_by('order_index')
        if level:
            qs = qs.filter(level=level)
        if parent_id:
            qs = qs.filter(parent_id=parent_id)
            
        result = [
            {
                "id": t.id,
                "name": t.name,
                "description": t.description,
                "parent_id": t.parent_id,
                "level": t.level,
                "order_index": t.order_index
            }
            for t in qs
        ]
        return JsonResponse(result, safe=False)
        
    elif request.method == 'POST':
        return require_auth(roles=["teacher"])(create_topic)(request)
        
    return JsonResponse({"error": "Method not allowed"}, status=405)

def create_topic(request):
    try:
        data = json.loads(request.body)
        name = data.get('name')
        description = data.get('description', '')
        parent_id = data.get('parent_id')
        level = data.get('level')
        order_index = data.get('order_index', 0)
        
        if not name or level is None:
            return JsonResponse({"error": "Thiếu name hoặc level"}, status=400)
            
        try:
            level = int(level)
            if level < 1 or level > 5:
                return JsonResponse({"error": "Level phải từ 1 đến 5"}, status=400)
        except ValueError:
            return JsonResponse({"error": "Level không hợp lệ"}, status=400)
            
        if parent_id:
            try:
                parent = Topic.objects.get(id=parent_id, is_deleted=False)
            except Topic.DoesNotExist:
                return JsonResponse({"error": "Parent topic không tồn tại"}, status=404)
        else:
            parent = None
            
        topic = Topic.objects.create(
            name=name,
            description=description,
            parent=parent,
            level=level,
            order_index=order_index
        )
        
        return JsonResponse({
            "id": topic.id,
            "name": topic.name,
            "level": topic.level,
            "parent_id": topic.parent_id
        }, status=201)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
def topic_detail_update_delete(request, topic_id):
    if request.method == 'GET':
        try:
            topic = Topic.objects.get(id=topic_id, is_deleted=False)
            
            # Build breadcrumbs
            breadcrumbs = []
            current = topic
            while current:
                breadcrumbs.insert(0, {
                    "id": current.id,
                    "name": current.name,
                    "level": current.level
                })
                if current.parent_id:
                    current = Topic.objects.filter(id=current.parent_id, is_deleted=False).first()
                else:
                    current = None
                    
            return JsonResponse({
                "id": topic.id,
                "name": topic.name,
                "description": topic.description,
                "parent_id": topic.parent_id,
                "level": topic.level,
                "order_index": topic.order_index,
                "breadcrumbs": breadcrumbs
            })
        except Topic.DoesNotExist:
            return JsonResponse({"error": "Không tìm thấy chuyên đề"}, status=404)
            
    elif request.method == 'PUT':
        return require_auth(roles=["teacher"])(update_topic)(request, topic_id)
    elif request.method == 'DELETE':
        return require_auth(roles=["teacher"])(delete_topic)(request, topic_id)
        
    return JsonResponse({"error": "Method not allowed"}, status=405)

def update_topic(request, topic_id):
    try:
        topic = Topic.objects.get(id=topic_id, is_deleted=False)
    except Topic.DoesNotExist:
        return JsonResponse({"error": "Không tìm thấy chuyên đề"}, status=404)
        
    try:
        data = json.loads(request.body)
        if 'name' in data:
            topic.name = data['name']
        if 'description' in data:
            topic.description = data['description']
        if 'parent_id' in data:
            parent_id = data['parent_id']
            if parent_id:
                try:
                    parent = Topic.objects.get(id=parent_id, is_deleted=False)
                    topic.parent = parent
                except Topic.DoesNotExist:
                    return JsonResponse({"error": "Parent topic không tồn tại"}, status=404)
            else:
                topic.parent = None
        if 'level' in data:
            try:
                level = int(data['level'])
                if level < 1 or level > 5:
                    return JsonResponse({"error": "Level phải từ 1 đến 5"}, status=400)
                topic.level = level
            except ValueError:
                return JsonResponse({"error": "Level không hợp lệ"}, status=400)
        if 'order_index' in data:
            try:
                topic.order_index = int(data['order_index'])
            except ValueError:
                pass
            
        topic.save()
        return JsonResponse({
            "id": topic.id,
            "message": "Cập nhật thành công"
        })
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

def delete_topic(request, topic_id):
    try:
        topic = Topic.objects.get(id=topic_id, is_deleted=False)
        topic.is_deleted = True
        topic.save(update_fields=['is_deleted'])
        return JsonResponse({"message": "Đã xóa chuyên đề"}, status=200)
    except Topic.DoesNotExist:
        return JsonResponse({"error": "Không tìm thấy chuyên đề"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
