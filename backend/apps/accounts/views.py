import json
import jwt
from datetime import datetime, timedelta, timezone
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.hashers import make_password, check_password
from django.db import connection
from apps.accounts.models import User, LoginHistory, PasswordHistory

def generate_access_token(user):
    payload = {
        "user_id": user.id,
        "role": user.role,
        "exp": datetime.now(timezone.utc) + timedelta(days=7)
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")

@csrf_exempt
def register(request):
    if request.method != 'POST':
        return JsonResponse({"error": "Method not allowed"}, status=405)
    try:
        data = json.loads(request.body)
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        
        if not username or not email or not password:
            return JsonResponse({"error": "Vui lòng cung cấp đủ username, email và password"}, status=400)
            
        # Gộp kiểm tra username và email trong 1 query để tránh username enumeration attack
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT count(*) FROM users 
                WHERE (
                    pgp_sym_decrypt(username_enc, %s) = %s 
                    OR pgp_sym_decrypt(email_enc, %s) = %s
                ) AND is_deleted = False
            """, [settings.PGCRYPTO_KEY, username, settings.PGCRYPTO_KEY, email])
            if cursor.fetchone()[0] > 0:
                return JsonResponse({"error": "Thông tin đăng ký đã tồn tại"}, status=400)
                
        user = User.objects.create_user(username=username, email=email, password=password, role="student")
        
        # Save LoginHistory
        ip_address = request.META.get('REMOTE_ADDR')
        LoginHistory.objects.create(user=user, ip_address=ip_address, success=True)
        
        token = generate_access_token(user)
        return JsonResponse({
            "access_token": token,
            "user_id": user.id,
            "role": user.role,
            "username": username
        }, status=201)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
def login(request):
    if request.method != 'POST':
        return JsonResponse({"error": "Method not allowed"}, status=405)
    try:
        data = json.loads(request.body)
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return JsonResponse({"error": "Vui lòng cung cấp username và password"}, status=400)
            
        user = User.objects.find_by_username(username)
        ip_address = request.META.get('REMOTE_ADDR')
        
        if not user:
            return JsonResponse({"error": "Sai tài khoản hoặc mật khẩu"}, status=401)
            
        if not user.is_active or user.is_deleted:
            LoginHistory.objects.create(user=user, ip_address=ip_address, success=False)
            return JsonResponse({"error": "Tài khoản đã bị khóa hoặc xóa"}, status=401)
            
        if not check_password(password, user.password):
            LoginHistory.objects.create(user=user, ip_address=ip_address, success=False)
            return JsonResponse({"error": "Sai tài khoản hoặc mật khẩu"}, status=401)
            
        # Update last_login safely
        user.last_login = datetime.now(timezone.utc)
        with connection.cursor() as cursor:
            cursor.execute("UPDATE users SET last_login = %s WHERE id = %s", [user.last_login, user.id])
            
        LoginHistory.objects.create(user=user, ip_address=ip_address, success=True)
        token = generate_access_token(user)
        
        return JsonResponse({
            "access_token": token,
            "user_id": user.id,
            "role": user.role,
            "username": username
        }, status=200)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
def forgot_password(request):
    if request.method != 'POST':
        return JsonResponse({"error": "Method not allowed"}, status=405)
    try:
        data = json.loads(request.body)
        username = data.get('username')
        email = data.get('email')
        
        if not username or not email:
            return JsonResponse({"error": "Vui lòng cung cấp username và email"}, status=400)
            
        user = User.objects.find_by_username_and_email(username, email)
        if not user:
            return JsonResponse({"error": "Thông tin không chính xác"}, status=400)
            
        payload = {
            "user_id": user.id,
            "type": "reset",
            "exp": datetime.now(timezone.utc) + timedelta(hours=1)
        }
        reset_token = jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")
        return JsonResponse({"reset_token": reset_token, "message": "Yêu cầu đặt lại mật khẩu thành công"}, status=200)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
def reset_password(request):
    if request.method != 'POST':
        return JsonResponse({"error": "Method not allowed"}, status=405)
    try:
        data = json.loads(request.body)
        reset_token = data.get('reset_token')
        new_password = data.get('new_password')
        
        if not reset_token or not new_password:
            return JsonResponse({"error": "Vui lòng cung cấp reset_token và new_password"}, status=400)
            
        try:
            payload = jwt.decode(reset_token, settings.SECRET_KEY, algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            return JsonResponse({"error": "Token đã hết hạn"}, status=401)
        except jwt.InvalidTokenError:
            return JsonResponse({"error": "Token không hợp lệ"}, status=401)
            
        if payload.get('type') != 'reset':
            return JsonResponse({"error": "Token không hợp lệ"}, status=401)
            
        user_id = payload.get('user_id')
        
        # Dùng raw SQL để lấy user để tránh lỗi cột không tồn tại
        user = None
        with connection.cursor() as cursor:
            cursor.execute("SELECT id, password_hash FROM users WHERE id = %s AND is_deleted = False", [user_id])
            row = cursor.fetchone()
            if row:
                from collections import namedtuple
                UserRow = namedtuple('UserRow', ['id', 'password'])
                user = UserRow(id=row[0], password=row[1])
        
        if not user:
            return JsonResponse({"error": "Người dùng không tồn tại"}, status=404)
        
        # Check password history for last 15 days
        fifteen_days_ago = datetime.now(timezone.utc) - timedelta(days=15)
        recent_passwords = []
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT password_hash FROM password_history WHERE user_id = %s AND changed_at >= %s",
                [user.id, fifteen_days_ago]
            )
            recent_passwords = [r[0] for r in cursor.fetchall()]
        
        if check_password(new_password, user.password):
            return JsonResponse({"error": "Không được dùng mật khẩu cũ"}, status=400)
            
        for old_hash in recent_passwords:
            if check_password(new_password, old_hash):
                return JsonResponse({"error": "Mật khẩu này đã được sử dụng trong 15 ngày qua"}, status=400)
                
        # Hash new password
        new_hash = make_password(new_password)
        
        # Update user và lưu history bằng transaction
        with connection.cursor() as cursor:
            cursor.execute("UPDATE users SET password_hash = %s WHERE id = %s", [new_hash, user.id])
            cursor.execute(
                "INSERT INTO password_history (user_id, password_hash, changed_at) VALUES (%s, %s, CURRENT_TIMESTAMP)",
                [user.id, new_hash]
            )
            
        return JsonResponse({"message": "Đổi mật khẩu thành công"}, status=200)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
