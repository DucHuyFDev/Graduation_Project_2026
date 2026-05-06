from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from apps.exams.models import ExamAttempt
from apps.exams.views import calculate_score


class Command(BaseCommand):
    help = 'Tự động nộp bài cho các lượt làm hết giờ chưa submit'

    def handle(self, *args, **options):
        """Tìm attempt đã hết giờ, tính điểm với answers hiện có, đánh dấu auto submitted."""
        now = timezone.now()

        # Chỉ lấy attempt chưa submit
        pending = ExamAttempt.objects.filter(
            submitted_at__isnull=True
        ).select_related('exam')

        auto_count = 0

        for attempt in pending:
            # Kiểm tra hết giờ: started_at + duration < now
            deadline = attempt.started_at + timedelta(minutes=attempt.exam.duration_minutes)
            if deadline >= now:
                continue

            # Tính điểm từ answers đã nộp (không thêm answers mới)
            score, _ = calculate_score(attempt)

            attempt.submitted_at = now
            attempt.score = score
            attempt.is_auto_submitted = True
            attempt.save(update_fields=['submitted_at', 'score', 'is_auto_submitted'])

            auto_count += 1
            self.stdout.write(
                f"  [AUTO] attempt_id={attempt.id} | exam='{attempt.exam.title}' | score={score}"
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Done: auto-submitted {auto_count} expired attempt(s)."
            )
        )
