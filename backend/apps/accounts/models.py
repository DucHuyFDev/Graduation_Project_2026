from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
from django.db import models, connection
from django.conf import settings


# ============================================================
# APP: accounts
# Quản lý người dùng (2 role: student | teacher),
# lịch sử đổi mật khẩu và lịch sử đăng nhập.
# Username/Email được mã hóa AES bằng pgcrypto trực tiếp trong SQL.
# ============================================================


class UserManager(BaseUserManager):
    """Manager tùy chỉnh hỗ trợ tạo user với pgcrypto mã hóa."""

    def create_user(self, username, email, password, role="student"):
        """Tạo user mới, mã hóa username/email bằng pgp_sym_encrypt."""
        if not username:
            raise ValueError("Users must have a username")
        if not email:
            raise ValueError("Users must have an email address")

        user = self.model(role=role)
        user.set_password(password)

        # Dùng raw SQL để mã hóa username/email ngay lúc INSERT
        with connection.cursor() as cursor:
            cursor.execute("""
                INSERT INTO users (username_enc, email_enc, password_hash, role, is_active, is_deleted, created_at)
                VALUES (
                    pgp_sym_encrypt(%s, %s),
                    pgp_sym_encrypt(%s, %s),
                    %s, %s, %s, %s, CURRENT_TIMESTAMP
                ) RETURNING id
            """, [
                username, settings.PGCRYPTO_KEY,
                email,    settings.PGCRYPTO_KEY,
                user.password, role, True, False
            ])
            row = cursor.fetchone()
            user.id = row[0]
        return user

    def find_by_username(self, username):
        """Tìm user bằng username plain-text (giải mã AES để so sánh)."""
        raw_qs = self.raw(
            "SELECT * FROM users WHERE pgp_sym_decrypt(username_enc, %s) = %s AND is_deleted = False LIMIT 1",
            [settings.PGCRYPTO_KEY, username]
        )
        for user in raw_qs:
            return user
        return None

    def find_by_username_and_email(self, username, email):
        """Tìm user bằng cả username lẫn email (dùng cho ForgotPassword)."""
        raw_qs = self.raw(
            """SELECT * FROM users
               WHERE pgp_sym_decrypt(username_enc, %s) = %s
                 AND pgp_sym_decrypt(email_enc, %s) = %s
                 AND is_deleted = False LIMIT 1""",
            [settings.PGCRYPTO_KEY, username, settings.PGCRYPTO_KEY, email]
        )
        for user in raw_qs:
            return user
        return None


class User(AbstractBaseUser):
    """
    Bảng: users
    Lưu thông tin tài khoản. Username/Email mã hóa AES (BYTEA),
    password băm bằng PBKDF2 (Django mặc định).
    """
    # BYTEA — lưu dữ liệu đã mã hóa AES từ pgp_sym_encrypt
    username_enc = models.BinaryField()
    email_enc    = models.BinaryField()

    # Tên cột DB là password_hash, Django dùng tên 'password' nội bộ
    password = models.CharField(max_length=255, db_column='password_hash')

    # Role: 'student' hoặc 'teacher' (teacher = quản lý hệ thống)
    role = models.CharField(
        max_length=10,
        choices=[("student", "Student"), ("teacher", "Teacher")],
        default="student"
    )

    is_active  = models.BooleanField(default=True)
    is_deleted = models.BooleanField(default=False)  # Soft delete
    created_at = models.DateTimeField(auto_now_add=True)
    last_login = models.DateTimeField(null=True, blank=True)

    objects = UserManager()

    # Dùng id làm USERNAME_FIELD vì username thực tế lưu dạng mã hóa
    USERNAME_FIELD  = 'id'
    REQUIRED_FIELDS = []

    class Meta:
        db_table = "users"
        managed  = False  # Schema tạo từ script_db_create.sql, không dùng migrations

    @property
    def password_hash(self):
        """Alias để tương thích với một số helper cũ."""
        return self.password

    def __str__(self):
        return str(self.id)


class PasswordHistory(models.Model):
    """
    Bảng: password_history
    Lưu lịch sử mật khẩu để tránh đặt lại mật khẩu cũ.
    """
    user          = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id')
    password_hash = models.CharField(max_length=255)
    changed_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "password_history"
        managed  = False


class LoginHistory(models.Model):
    """
    Bảng: login_history
    Ghi nhận mỗi lần đăng nhập (thành công hoặc thất bại) kèm IP.
    """
    user       = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id')
    login_at   = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)  # Kiểu INET trong PostgreSQL
    success    = models.BooleanField(default=True)

    class Meta:
        db_table = "login_history"
        managed  = False
