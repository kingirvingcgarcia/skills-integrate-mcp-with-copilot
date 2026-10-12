import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from fastapi import HTTPException

import app
import teacher_auth


class TeacherAuthTests(unittest.TestCase):
    def setUp(self):
        self.temporary_directory = tempfile.TemporaryDirectory()
        self.teachers_file = Path(self.temporary_directory.name) / "teachers.json"
        self.file_patch = patch.object(teacher_auth, "TEACHERS_FILE", self.teachers_file)
        self.file_patch.start()

    def tearDown(self):
        self.file_patch.stop()
        self.temporary_directory.cleanup()

    def test_teacher_password_is_salted_and_verified(self):
        first_record = teacher_auth.create_password_record("a-long-teacher-password")
        second_record = teacher_auth.create_password_record("a-long-teacher-password")
        self.assertNotEqual(first_record["salt"], second_record["salt"])

        self.teachers_file.write_text(
            json.dumps({"teachers": {"coach": first_record}}), encoding="utf-8"
        )
        self.assertTrue(
            teacher_auth.verify_teacher_credentials("coach", "a-long-teacher-password")
        )
        self.assertFalse(teacher_auth.verify_teacher_credentials("coach", "wrong"))
        self.assertFalse(
            teacher_auth.verify_teacher_credentials("unknown", "a-long-teacher-password")
        )

    def test_mutating_routes_require_teacher_authentication(self):
        protected_paths = {
            "/activities/{activity_name}/signup",
            "/activities/{activity_name}/unregister",
        }
        routes = [route for route in app.app.routes if route.path in protected_paths]
        self.assertEqual(len(routes), 2)
        for route in routes:
            self.assertIn(app.require_teacher, [dependency.call for dependency in route.dependant.dependencies])

    def test_teacher_session_requires_valid_unexpired_bearer_token(self):
        app.teacher_sessions["valid-token"] = ("coach", 9_999_999_999)
        self.assertEqual(app.require_teacher("Bearer valid-token"), "coach")

        with self.assertRaises(HTTPException) as error:
            app.require_teacher(None)
        self.assertEqual(error.exception.status_code, 401)

        app.teacher_sessions["expired-token"] = ("coach", 0)
        with self.assertRaises(HTTPException) as error:
            app.require_teacher("Bearer expired-token")
        self.assertEqual(error.exception.status_code, 401)


if __name__ == "__main__":
    unittest.main()