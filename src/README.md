# Mergington High School Activities API

A super simple FastAPI application that allows students to view and sign up for extracurricular activities.

## Features

- View all available extracurricular activities
- Teacher sign-in to manage student registrations
- Sign up and unregister students from activities

## Teacher sign-in setup

Create a teacher login from the repository root:

```
python src/manage_teachers.py teachername
```

The command prompts for a password twice and stores a salted password hash in
`src/teachers.json`. That local credentials file is ignored by Git. Teacher
sessions expire after eight hours, and signing out revokes the current session.
Teachers can register and unregister students. Visitors who are signed out can
still view the activity list and participant roster.

## Getting Started

1. Install the dependencies:

   ```
   pip install fastapi uvicorn
   ```

2. Run the application:

   ```
   python app.py
   ```

3. Open your browser and go to:
   - API documentation: http://localhost:8000/docs
   - Alternative documentation: http://localhost:8000/redoc

## API Endpoints

| Method | Endpoint                                                          | Description                                                         |
| ------ | ----------------------------------------------------------------- | ------------------------------------------------------------------- |
| GET    | `/activities`                                                     | Get all activities with their details and current participant count |
| POST   | `/auth/login`                                                      | Sign in as a teacher and receive a bearer token                     |
| POST   | `/auth/logout`                                                     | Revoke the current teacher session                                  |
| POST   | `/activities/{activity_name}/signup?email=student@mergington.edu` | Teacher-only: sign up a student                                     |
| DELETE | `/activities/{activity_name}/unregister?email=student@mergington.edu` | Teacher-only: unregister a student                               |

The signup and unregister endpoints require an `Authorization: Bearer <token>`
header. Sign in again after a page refresh or server restart.

## Data Model

The application uses a simple data model with meaningful identifiers:

1. **Activities** - Uses activity name as identifier:

   - Description
   - Schedule
   - Maximum number of participants allowed
   - List of student emails who are signed up

2. **Students** - Uses email as identifier:
   - Name
   - Grade level

All data is stored in memory, which means data will be reset when the server restarts.
