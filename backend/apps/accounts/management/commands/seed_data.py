import os
import json
from django.core.management.base import BaseCommand
from django.db import connection, transaction
from django.conf import settings
from apps.accounts.models import User
from apps.topics.models import Topic
from apps.questions.models import Question, QuestionOption, QuestionTFStatement, QuestionShortAnswer
from apps.exams.models import Exam, ExamQuestion

class Command(BaseCommand):
    help = "Seed data for MathPro system"

    def handle(self, *args, **options):
        self.stdout.write("Starting seed process...")

        try:
            with transaction.atomic():
                # 1. Create Users
                self.seed_users()
                
                # 2. Create Topics
                topics_map = self.seed_topics()
                
                # 3. Create Questions
                questions_list = self.seed_questions(topics_map)
                
                # 4. Create Exams
                self.seed_exams(questions_list, topics_map)

            self.stdout.write(self.style.SUCCESS("Successfully seeded all data!"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error seeding data: {e}"))
            import traceback
            traceback.print_exc()

    def seed_users(self):
        self.stdout.write("Seeding users...")
        # Teacher
        if not User.objects.find_by_username("teacher"):
            User.objects.create_user(
                username="teacher",
                email="teacher@mathpro.edu.vn",
                password="Teacher@123",
                role="teacher"
            )
        
        # Students
        if not User.objects.find_by_username("student1"):
            User.objects.create_user(
                username="student1",
                email="student1@gmail.com",
                password="Student@123",
                role="student"
            )
        
        if not User.objects.find_by_username("student2"):
            User.objects.create_user(
                username="student2",
                email="student2@gmail.com",
                password="Student@123",
                role="student"
            )

    def seed_topics(self):
        self.stdout.write("Seeding topics...")
        
        # Level 1
        dai_so, _ = Topic.objects.get_or_create(
            name="Đại số 12", 
            defaults={"level": 1, "order_index": 1, "description": "Chuyên đề Đại số lớp 12"}
        )
        hinh_hoc, _ = Topic.objects.get_or_create(
            name="Hình học 12", 
            defaults={"level": 1, "order_index": 2, "description": "Chuyên đề Hình học lớp 12"}
        )

        # Level 2 - Đại số
        ham_so, _ = Topic.objects.get_or_create(
            name="Ứng dụng đạo hàm để khảo sát hàm số",
            defaults={"parent": dai_so, "level": 2, "order_index": 1}
        )
        lu_thua, _ = Topic.objects.get_or_create(
            name="Hàm số lũy thừa, mũ và logarit",
            defaults={"parent": dai_so, "level": 2, "order_index": 2}
        )
        nguyen_ham, _ = Topic.objects.get_or_create(
            name="Nguyên hàm, tích phân và ứng dụng",
            defaults={"parent": dai_so, "level": 2, "order_index": 3}
        )
        so_phuc, _ = Topic.objects.get_or_create(
            name="Số phức",
            defaults={"parent": dai_so, "level": 2, "order_index": 4}
        )

        # Level 2 - Hình học
        khoi_da_dien, _ = Topic.objects.get_or_create(
            name="Khối đa diện",
            defaults={"parent": hinh_hoc, "level": 2, "order_index": 1}
        )
        mat_non_tru_cau, _ = Topic.objects.get_or_create(
            name="Mặt nón, mặt trụ, mặt cầu",
            defaults={"parent": hinh_hoc, "level": 2, "order_index": 2}
        )
        to_do_khong_gian, _ = Topic.objects.get_or_create(
            name="Phương pháp tọa độ trong không gian",
            defaults={"parent": hinh_hoc, "level": 2, "order_index": 3}
        )

        return {
            "ham_so": ham_so,
            "lu_thua": lu_thua,
            "to_do_khong_gian": to_do_khong_gian,
            "so_phuc": so_phuc
        }

    def create_content_json(self, text, math=""):
        content = [{"type": "text", "value": text}]
        if math:
            content.append({"type": "math", "value": math})
        return {"blocks": [{"type": "paragraph", "content": content}]}

    def seed_questions(self, topics_map):
        self.stdout.write("Seeding questions...")
        teacher = User.objects.find_by_username("teacher")
        questions = []

        # MCQ 1 - Hàm số
        q1 = Question.objects.create(
            topic=topics_map["ham_so"],
            question_type="mcq",
            content_json=self.create_content_json("Cho hàm số ", "y = f(x)"),
            difficulty=0.3,
            created_by=teacher
        )
        QuestionOption.objects.create(question=q1, option_key="A", content_json=self.create_content_json("Đồng biến trên R"), is_correct=True)
        QuestionOption.objects.create(question=q1, option_key="B", content_json=self.create_content_json("Nghịch biến trên R"), is_correct=False)
        QuestionOption.objects.create(question=q1, option_key="C", content_json=self.create_content_json("Có một cực trị"), is_correct=False)
        QuestionOption.objects.create(question=q1, option_key="D", content_json=self.create_content_json("Vô nghiệm"), is_correct=False)
        questions.append(q1)

        # MCQ 2 - Lũy thừa
        q2 = Question.objects.create(
            topic=topics_map["lu_thua"],
            question_type="mcq",
            content_json=self.create_content_json("Giá trị của biểu thức ", "P = \log_2 8"),
            difficulty=0.2,
            created_by=teacher
        )
        QuestionOption.objects.create(question=q2, option_key="A", content_json=self.create_content_json("2"), is_correct=False)
        QuestionOption.objects.create(question=q2, option_key="B", content_json=self.create_content_json("3"), is_correct=True)
        QuestionOption.objects.create(question=q2, option_key="C", content_json=self.create_content_json("4"), is_correct=False)
        QuestionOption.objects.create(question=q2, option_key="D", content_json=self.create_content_json("8"), is_correct=False)
        questions.append(q2)

        # True/False - Số phức
        q3 = Question.objects.create(
            topic=topics_map["so_phuc"],
            question_type="true_false",
            content_json=self.create_content_json("Cho số phức ", "z = 3 - 4i"),
            difficulty=0.5,
            created_by=teacher
        )
        QuestionTFStatement.objects.create(question=q3, statement_key="a", content_json=self.create_content_json("Phần thực của z là 3"), is_true=True)
        QuestionTFStatement.objects.create(question=q3, statement_key="b", content_json=self.create_content_json("Phần ảo của z là 4"), is_true=False)
        QuestionTFStatement.objects.create(question=q3, statement_key="c", content_json=self.create_content_json("Môđun của z bằng 5"), is_true=True)
        QuestionTFStatement.objects.create(question=q3, statement_key="d", content_json=self.create_content_json("Số phức liên hợp là ", "3 + 4i"), is_true=True)
        questions.append(q3)

        # Short Answer - Tọa độ không gian
        q4 = Question.objects.create(
            topic=topics_map["to_do_khong_gian"],
            question_type="short_answer",
            content_json=self.create_content_json("Trong không gian Oxyz, cho điểm A(1; 2; 3). Khoảng cách từ A đến mặt phẳng (Oxy) bằng bao nhiêu?"),
            difficulty=0.4,
            created_by=teacher
        )
        QuestionShortAnswer.objects.create(question=q4, correct_answer=3.0)
        questions.append(q4)

        return questions

    def seed_exams(self, questions_list, topics_map):
        self.stdout.write("Seeding exams...")
        teacher = User.objects.find_by_username("teacher")
        
        exam = Exam.objects.create(
            title="Đề thi thử Tốt nghiệp THPT - Đề số 1",
            exam_type="graduation",
            duration_minutes=90,
            created_by=teacher
        )
        
        for idx, q in enumerate(questions_list):
            ExamQuestion.objects.create(
                exam=exam,
                question=q,
                order_index=idx + 1
            )
