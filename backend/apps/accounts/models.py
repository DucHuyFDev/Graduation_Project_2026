from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
from django.db import models, connection
from django.conf import settings

class UserManager(BaseUserManager):
    def create_user(self, username, email, password, role="student"):
        if not username:
            raise ValueError("Users must have a username")
        if not email:
            raise ValueError("Users must have an email address")

        user = self.model(role=role)
        user.set_password(password)

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
                email, settings.PGCRYPTO_KEY,
                user.password, role, True, False
            ])
            row = cursor.fetchone()
            user.id = row[0]
        return user

    def find_by_username(self, username):
        # Sử dụng raw SQL để giải mã username và tìm kiếm
        raw_qs = self.raw(
            "SELECT * FROM users WHERE pgp_sym_decrypt(username_enc, %s) = %s AND is_deleted = False LIMIT 1",
            [settings.PGCRYPTO_KEY, username]
        )
        for user in raw_qs:
            return user
        return None

    def find_by_username_and_email(self, username, email):
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
    username_enc = models.BinaryField()
    email_enc = models.BinaryField()
    password = models.CharField(max_length=255, db_column='password_hash')
    role = models.CharField(max_length=10, choices=[("student", "Student"), ("teacher", "Teacher")], default="student")
    is_active = models.BooleanField(default=True)
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    last_login = models.DateTimeField(null=True, blank=True)

    objects = UserManager()

    USERNAME_FIELD = 'id'
    REQUIRED_FIELDS = []

    class Meta:
        db_table = "users"
        managed = False

    @property
    def password_hash(self):
        return self.password

    def __str__(self):
        return str(self.id)


class PasswordHistory(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id')
    password_hash = models.CharField(max_length=255)
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "password_history"
        managed = False


class LoginHistory(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id')
    login_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    success = models.BooleanField(default=True)

    class Meta:
        db_table = "login_history"
        managed = False
