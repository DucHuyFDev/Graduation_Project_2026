import jwt
from functools import wraps
from django.http import JsonResponse
from django.conf import settings
from apps.accounts.models import User

class IsAuthenticated:
    @staticmethod
    def has_permission(request):
        return request.user_id is not None

class IsTeacher:
    @staticmethod
    def has_permission(request):
        return request.user_role == 'teacher'

class IsStudent:
    @staticmethod
    def has_permission(request):
        return request.user_role == 'student'

def require_auth(roles=None):
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            if not request.user_id:
                auth_header = request.headers.get('Authorization')
                if auth_header and auth_header.startswith('Bearer '):
                    token = auth_header.split(' ')[1]
                    try:
                        jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
                    except jwt.ExpiredSignatureError:
                        return JsonResponse({"error": "Token đã hết hạn"}, status=401)
                    except jwt.InvalidTokenError:
                        pass
                return JsonResponse({"error": "Yêu cầu đăng nhập"}, status=401)
                
            if roles and request.user_role not in roles:
                return JsonResponse({"error": "Không có quyền"}, status=403)
                
            return view_func(request, *args, **kwargs)
        return _wrapped_view
    return decorator

def get_current_user(request):
    if request.user_id:
        try:
            return User.objects.get(id=request.user_id)
        except User.DoesNotExist:
            return None
    return None
