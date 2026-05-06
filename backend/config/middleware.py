import jwt
from django.conf import settings

class JWTAuthMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.user_id = None
        request.user_role = None
        
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            try:
                payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
                request.user_id = payload.get('user_id')
                request.user_role = payload.get('role')
            except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
                pass
                
        response = self.get_response(request)
        return response
