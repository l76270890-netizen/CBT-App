# School Admin CBT API

Flask API for the School Admin workspace and the existing CBT client. All school data access is scoped from the authenticated account's `school_id` on the server.

## Authentication and roles

Sign in at `POST /api/admin/login` for the admin workspace or `POST /api/login` for a student account. Credentials are checked against password hashes. A successful login sets an opaque, database-backed session in an `HttpOnly` cookie; the session value is not returned in JSON. Send browser requests with credentials enabled (`fetch(..., { credentials: "include" })` or the equivalent). Use `POST /api/logout` to revoke the session.

Roles are `school_admin`, `teacher`, `exam_officer`, and `student`. Admin overview, roster, and performance routes require an admin workspace role. Exam creation, deletion, editing, question creation, and image upload allow `school_admin` and `exam_officer`. Students can read exams/questions in their own school, send their heartbeat, and submit attempts. The public registration endpoint always creates a `student`; it cannot choose an admin role.

The previous hardcoded admin email/password has been removed. Create privileged accounts through the Flask CLI. API JSON does not expose passwords or session credentials. Login responses contain only basic account fields needed by the client.

## Endpoints

All routes below are under `/api`. Except registration and login, they require the session cookie unless marked otherwise.

| Method and path | Access | Purpose |
| --- | --- | --- |
| `POST /register` | Public | Register a student with `email`, `password` (8+ chars), optional `name`, and `schoolId` (or configure `DEFAULT_SCHOOL_ID`). `classId` is optional and must belong to that school. |
| `POST /admin/login` | Public | Admin role login; sets session cookie. |
| `POST /login` | Public | Any active account login; sets session cookie. |
| `POST /logout` | Signed in | Revoke the current session and clear its cookie. |
| `GET /admin/overview` | Admin roles | Counts, active students, average attempt score, and recent activity for the current school. |
| `GET /admin/students?search=&classId=&page=1&limit=50` | Admin roles | Paginated student roster. Search checks display name and email. `limit` is capped at 200. |
| `GET /admin/students/:studentId/performance?from=&to=` | Admin roles | Completed attempts, chronological score history, and results grouped by subject. Date filters accept ISO dates or datetimes. |
| `POST /students/me/heartbeat` | Student | Update `lastSeenAt`. Overview counts an active student only when an active student account's heartbeat is within five minutes. |
| `GET /exams` | Signed in | Current school's exams with `id`, `title`, `examType`, `year`, `duration`, `subjects`, and the actual `totalQuestions` count. |
| `GET /questions?examId=ID&subject=NAME` | Signed in | Questions for exactly one exam and configured subject in the current school. |
| `POST /admin/create-exam` | School admin, exam officer | Create an exam with `title`, `examType`, `subjects` (array), optional `year` and `duration`; may include a `questions` array. |
| `POST /admin/add-question` | School admin, exam officer | Add one question to a school-owned exam. This remains one request per question for CSV imports. Accepts JSON or multipart form with an optional image. |
| `PUT /admin/exam/:examId`, `DELETE /admin/exam/:examId` | School admin, exam officer | Update or delete a school-owned exam. Subjects cannot be changed after questions exist. |
| `POST /attempts` | Student | Record a reportable exam attempt with `examId`, `subject`, `score`, and `total`. Completion time, student, and school are assigned by the server. The result is also saved to the student's personal history. |
| `POST /save-result` or `/history` | Student | Save a personal history result; when `examId` and `subject` are included it is also recorded for school reports. |
| `GET /history/:userId`, `DELETE /history/:resultId`, `DELETE /history/clear/:userId` | Student | Read or manage the signed-in student's own history. Exam history includes `examId` and `subject`. |

### Response examples

Login returns account details and sets the cookie in the response headers:

```json
{
  "success": true,
  "user_id": 12,
  "username": "A. Admin",
  "email": "admin@example.edu",
  "role": "school_admin",
  "profile_image": null
}
```

The overview returns real counts. Before any attempts have been recorded, score and activity are explicitly unavailable:

```json
{
  "counts": {
    "exams": 3,
    "configuredSubjects": 6,
    "questions": 80,
    "enrolledStudents": 120,
    "activeStudents": 7
  },
  "performance": { "averageScore": null, "attemptCount": 0, "available": false },
  "recentExamActivity": null
}
```

Student roster returns a `students` array with `id`, `displayName`, `email`, `class`, `accountStatus`, and `lastSeenAt`, plus `pagination`. Student performance returns `completedAttempts`, `scoreHistory`, and `resultsBySubject`. Question creation returns `{ "success": true, "id": 456, "examId": 20, "subject": "Biology", "image_path": null, "image_url": null }`; validation failures return HTTP 400 with `{ "success": false, "error": "..." }`.

Question body example:

```json
{
  "examId": 20,
  "subject": "Biology",
  "question": "Which structure contains genetic material?",
  "options": { "A": "Nucleus", "B": "Ribosome", "C": "Cell wall", "D": "Vacuole" },
  "correctAnswer": "A",
  "explanation": "Most cell genetic material is stored in the nucleus."
}
```

All question rows require four non-empty options and an answer of `A`, `B`, `C`, or `D`. The requested exam and subject are checked before storage.

## Setup and deployment

Python 3.10+ is recommended.

1. Create and activate a virtual environment, then install dependencies:

   ```sh
   python -m venv venv
   # Activate the environment for your shell, then:
   pip install -r requirements.txt
   ```

2. Configure environment variables. `DATABASE_URL` accepts SQLite or PostgreSQL. `FRONTEND_ORIGIN` (or comma-separated `FRONTEND_ORIGINS`) must list the exact frontend origins. For production set `APP_ENV=production`, `COOKIE_SECURE=true`, and `COOKIE_SAMESITE=None` when the frontend is on a separate site; production must use HTTPS. `DEFAULT_SCHOOL_ID` can be set after school creation for student self-registration. Database credentials and optional Cloudinary credentials are read only from environment variables.

   Example for local development:

   ```text
   DATABASE_URL=sqlite:///examcore.db
   FRONTEND_ORIGIN=http://localhost:3000
   APP_ENV=development
   ```

3. For a new database run `flask --app app db upgrade`, then create a school and its first admin with `flask --app app create-school-admin`. The command prompts for the admin password and stores only a password hash. Use `flask --app app create-school-user` to provision teachers and exam officers, `flask --app app create-school-class` to create classes, and `flask --app app set-school-user-role` to change a provisioned account's role.

4. For an existing database created by the previous app version, first back it up. Mark the old schema as the baseline and apply the additive school migration:

   ```sh
   flask --app app db stamp 20261026_00
   flask --app app db upgrade
   flask --app app create-school-admin
   flask --app app assign-legacy-data
   ```

   `assign-legacy-data` explicitly assigns old unscoped rows to one selected school. The migration defaults old users to `student`; create or promote the administrator using the CLI before opening the admin workspace. Never run that assignment command when the old database contains records from more than one school.

5. Start locally with `flask --app app run` or deploy with `gunicorn app:app`. Migrations are run as a deployment step; the app no longer creates tables at import time. No sample students or activity are seeded.

## Data and reporting notes

`Attempt` stores the authenticated student ID, school ID, exam ID, subject, score, total, and server completion timestamp. Completing an exam writes the reportable attempt and personal history row together, so student history and school reports stay in sync. The server derives the student/school and validates the exam and configured subject. The overview average is the arithmetic mean of attempt percentages. A heartbeat only updates last-seen time; it does not record study time. Legacy history rows without exam and subject remain personal history and are not included in school performance metrics.

The student client must call the login endpoint and send the resulting HttpOnly cookie with API requests. A browser-only localStorage admin flag cannot authorize any endpoint.
