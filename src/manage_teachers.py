import argparse
import getpass
import json
import os

from teacher_auth import TEACHERS_FILE, create_password_record


def main() -> None:
    parser = argparse.ArgumentParser(description="Add a teacher login")
    parser.add_argument("username")
    args = parser.parse_args()

    username = args.username.strip()
    if not username:
        parser.error("username cannot be empty")

    password = getpass.getpass("Teacher password (12+ characters): ")
    confirmation = getpass.getpass("Confirm password: ")
    if len(password) < 12:
        parser.error("password must be at least 12 characters")
    if password != confirmation:
        parser.error("passwords do not match")

    try:
        with TEACHERS_FILE.open(encoding="utf-8") as teachers_file:
            data = json.load(teachers_file)
    except FileNotFoundError:
        data = {"teachers": {}}

    teachers = data.setdefault("teachers", {})
    if username in teachers:
        parser.error("that teacher username already exists")

    teachers[username] = create_password_record(password)
    TEACHERS_FILE.parent.mkdir(parents=True, exist_ok=True)
    temporary_file = TEACHERS_FILE.with_name(
        f".{TEACHERS_FILE.name}.{os.getpid()}.tmp"
    )
    with temporary_file.open("w", encoding="utf-8") as teachers_file:
        json.dump(data, teachers_file, indent=2)
        teachers_file.write("\n")
    temporary_file.chmod(0o600)
    temporary_file.replace(TEACHERS_FILE)
    print(f"Added teacher {username} to {TEACHERS_FILE}")


if __name__ == "__main__":
    main()