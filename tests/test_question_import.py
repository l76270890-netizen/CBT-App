import base64
import csv
import hashlib
import io
import os
import shutil
import tempfile
import unittest
import zipfile
from datetime import timedelta
from PIL import Image
from werkzeug.datastructures import MultiDict

import app as backend


PNG_DATA = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l0kAAAAASUVORK5CYII="
)
CSV_HEADERS = [
    "subject", "question", "optionA", "optionB", "optionC", "optionD",
    "correctAnswer", "explanation", "imageUrl",
]


def make_csv(rows):
    output = io.StringIO(newline="")
    writer = csv.writer(output)
    writer.writerow(CSV_HEADERS)
    writer.writerows(rows)
    return output.getvalue().encode("utf-8")


class QuestionImportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp_dir = tempfile.mkdtemp(prefix="cbt-question-import-")
        backend.app.config.update(
            TESTING=True,
            SQLALCHEMY_DATABASE_URI="sqlite://",
            UPLOAD_FOLDER=cls.temp_dir,
        )
        backend.UPLOAD_FOLDER = cls.temp_dir
        backend.QUESTION_FOLDER = os.path.join(cls.temp_dir, "questions")
        backend.QUESTION_STORAGE_IS_PERSISTENT = True
        os.makedirs(backend.QUESTION_FOLDER, exist_ok=True)

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.temp_dir)

    def setUp(self):
        with backend.app.app_context():
            backend.db.drop_all()
            backend.db.create_all()
            school = backend.School(name="Test School")
            backend.db.session.add(school)
            backend.db.session.flush()
            self.school_id = school.id
            exam = backend.Exam(
                title="Test Exam", examType="Test", subject="Mathematics",
                year=2026, duration=60, school_id=school.id,
            )
            backend.db.session.add(exam)
            backend.db.session.flush()
            self.exam_id = exam.id
            backend.db.session.add(backend.ExamSubject(
                exam_id=exam.id, name="Mathematics"))
            self.admin_token = self.create_user("admin", "exam_officer")
            self.student_token = self.create_user("student", "student")
            backend.db.session.commit()

        self.client = backend.app.test_client()
        self.client.set_cookie(
            backend.app.config["SESSION_COOKIE_NAME"], self.admin_token)

    def tearDown(self):
        for filename in os.listdir(backend.QUESTION_FOLDER):
            os.remove(os.path.join(backend.QUESTION_FOLDER, filename))

    def create_user(self, username, role):
        user = backend.User(
            username=username,
            email=f"{username}@example.test",
            password="not-a-real-password",
            school_id=self.school_id,
            role=role,
            account_status="active",
        )
        backend.db.session.add(user)
        backend.db.session.flush()
        token = f"{username}-session-token"
        backend.db.session.add(backend.AuthToken(
            user_id=user.id,
            token_hash=hashlib.sha256(token.encode("utf-8")).hexdigest(),
            expires_at=backend.utcnow() + timedelta(hours=1),
        ))
        return token

    def upload(self, rows, images=(), endpoint="/api/admin/import-questions"):
        form_data = MultiDict([
            ("examId", str(self.exam_id)),
            ("csv", (io.BytesIO(make_csv(rows)), "questions.csv")),
        ])
        for name, contents in images:
            form_data.add("images", (io.BytesIO(contents), name))
        return self.client.post(endpoint, data=form_data)

    def test_import_routes_are_registered_and_require_authentication(self):
        client = backend.app.test_client()
        for endpoint in (
            "/api/admin/import-questions",
            "/api/admin/import-questions-csv",
        ):
            with self.subTest(endpoint=endpoint):
                response = client.post(endpoint)
                self.assertEqual(response.status_code, 401)
                self.assertEqual(
                    response.get_json()["code"], "unauthenticated")

    @staticmethod
    def row(question, image=""):
        return [
            "Mathematics", question, "one", "two", "three", "four",
            "A", "Explanation", image,
        ]

    def test_csv_without_images_and_questions_without_images(self):
        response = self.upload([self.row("No image")])
        self.assertEqual(response.status_code, 201)
        payload = response.get_json()
        self.assertEqual(payload["questionsFound"], 1)
        self.assertEqual(payload["imagesUploaded"], 0)
        with backend.app.app_context():
            question = backend.Question.query.one()
            self.assertIsNone(question.image_path)

    def test_one_image_matches_and_is_available_to_student(self):
        response = self.upload(
            [self.row("Triangle area", r"IMAGES\Triangle .PNG")],
            [("triangle.png", PNG_DATA)],
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.get_json()["imagesMatched"], 1)

        student_client = backend.app.test_client()
        student_client.set_cookie(
            backend.app.config["SESSION_COOKIE_NAME"], self.student_token)
        questions = student_client.get(
            "/api/questions",
            query_string={"examId": self.exam_id, "subject": "Mathematics"},
        ).get_json()
        self.assertEqual(len(questions), 1)
        image_url = questions[0]["image_url"]
        self.assertTrue(image_url.startswith("/uploads/questions/"))
        image_response = student_client.get(image_url)
        self.assertEqual(image_response.status_code, 200)
        self.assertEqual(image_response.data, PNG_DATA)
        image_response.close()

    def test_multiple_images_match_individual_questions_and_allow_blank(self):
        response = self.upload(
            [
                self.row("First question", "triangle.png"),
                self.row("Second question", "angles.png"),
                self.row("No image question"),
            ],
            [("triangle.png", PNG_DATA), ("angles.png", PNG_DATA)],
        )
        self.assertEqual(response.status_code, 201)
        payload = response.get_json()
        self.assertEqual(payload["questionsImported"], 3)
        self.assertEqual(payload["imagesUploaded"], 2)
        self.assertEqual(payload["imagesMatched"], 2)
        with backend.app.app_context():
            questions = backend.Question.query.order_by(
                backend.Question.id).all()
            self.assertNotEqual(questions[0].image_path, questions[1].image_path)
            self.assertIsNone(questions[2].image_path)

    def test_jpeg_and_webp_images_are_accepted(self):
        image_files = []
        for filename, image_format in (("photo.jpg", "JPEG"), ("icon.webp", "WEBP")):
            image_data = io.BytesIO()
            Image.new("RGB", (1, 1), (255, 255, 255)).save(
                image_data, format=image_format)
            image_files.append((filename, image_data.getvalue()))
        response = self.upload(
            [self.row("JPEG question", "photo.jpg"),
             self.row("WEBP question", "icon.webp")],
            image_files,
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.get_json()["imagesUploaded"], 2)

    def test_missing_image_is_a_clear_validation_error(self):
        response = self.upload([self.row("Missing image", "triangle.png")])
        self.assertEqual(response.status_code, 400)
        payload = response.get_json()
        self.assertFalse(payload["success"])
        self.assertIn("references missing image triangle.png", payload["errors"][0])
        with backend.app.app_context():
            self.assertEqual(backend.Question.query.count(), 0)

    def test_unsupported_image_type_is_rejected(self):
        response = self.upload(
            [self.row("Unsupported image", "diagram.svg")],
            [("diagram.svg", b"<svg></svg>")],
        )
        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.get_json()["success"])

    def test_invalid_image_contents_are_rejected(self):
        response = self.upload(
            [self.row("Invalid image", "triangle.png")],
            [("triangle.png", b"not a PNG image")],
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("not a valid PNG", response.get_json()["errors"][0])

    def test_duplicate_normalized_filenames_are_rejected(self):
        response = self.upload(
            [self.row("Ambiguous image", "triangle.png")],
            [("triangle.png", PNG_DATA), (" Triangle.PNG ", PNG_DATA)],
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("duplicate or ambiguous", response.get_json()["errors"][0])

    def test_csv_plus_images_route_imports_questions(self):
        response = self.upload(
            [self.row("Route question", "triangle.png")],
            [("triangle.png", PNG_DATA)],
            endpoint="/api/admin/import-questions-csv",
        )
        self.assertEqual(response.status_code, 201)
        payload = response.get_json()
        self.assertTrue(payload["success"])
        self.assertEqual(payload["questionsImported"], 1)
        self.assertEqual(payload["imagesUploaded"], 1)
        with backend.app.app_context():
            question = backend.Question.query.one()
            self.assertTrue(question.image_path.startswith("questions/"))

    def test_csv_route_without_csv_reports_missing_csv(self):
        response = self.client.post(
            "/api/admin/import-questions-csv",
            data={"examId": str(self.exam_id)},
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("csv field", response.get_json()["error"])

    def test_admin_image_upload_path_used_by_frontend(self):
        response = self.client.post(
            "/api/admin/upload-question-image",
            data={"image": (io.BytesIO(PNG_DATA), "diagram.png")},
        )
        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertTrue(payload["success"])
        self.assertTrue(payload["image_path"].startswith("questions/"))
        self.assertEqual(payload["image_url"], f"/uploads/{payload['image_path']}")
        # The Admin client reads `imageUrl`, so the response includes both keys.
        self.assertEqual(payload["imageUrl"], payload["image_url"])

    def test_legacy_upload_image_path_still_works(self):
        response = self.client.post(
            "/api/upload/question-image",
            data={"image": (io.BytesIO(PNG_DATA), "diagram.png")},
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.get_json()["success"])

    def test_legacy_zip_import_still_works(self):
        archive_bytes = io.BytesIO()
        with zipfile.ZipFile(archive_bytes, "w") as archive:
            archive.writestr("questions.csv", make_csv([
                self.row("ZIP question", "images/triangle.png"),
            ]))
            archive.writestr("images/triangle.png", PNG_DATA)
        response = self.client.post(
            "/api/admin/import-questions-zip",
            data={
                "examId": str(self.exam_id),
                "file": (io.BytesIO(archive_bytes.getvalue()), "questions.zip"),
            },
        )
        self.assertEqual(response.status_code, 201)
        with backend.app.app_context():
            self.assertEqual(backend.Question.query.count(), 1)


if __name__ == "__main__":
    unittest.main()
