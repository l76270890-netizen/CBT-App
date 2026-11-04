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
| `POST /register` | Public | Register a student with `email`, `password` (8+ chars), optional `name`, and `schoolId`. A single-school deployment may omit `schoolId`; multi-school deployments must pass it or configure `DEFAULT_SCHOOL_ID`. Registration signs the student in and sets the session cookie. `classId` is optional and must belong to that school. |
| `POST /admin/login` | Public | Admin role login; sets session cookie. |
| `POST /login` | Public | Any active account login; sets session cookie. |
| `POST /payments/paystack/initialize` | Public | Return the configured Paystack hosted payment-page URL for the `weekly`, `monthly`, or `yearly` plan. |
| `GET /payments/plans` | Public | Return the available NGN subscription plans, prices, durations, and checkout availability for the frontend. |
| `POST /payments/paystack/webhook` | Paystack | Verify signed `charge.success` events against Paystack and email a single-use account activation PIN. |
| `POST /payments/paystack/redeem` | Public | Redeem an emailed PIN to register a student account or activate/extend an existing student's subscription. |
| `POST /logout` | Signed in | Revoke the current session and clear its cookie. |
| `GET /admin/overview` | Admin roles | Counts, active students, average attempt score, and recent activity for the current school. |
| `GET /admin/upcoming-exams?limit=10` | Admin roles | Scheduled future exams for the current school, ordered by start time (limit is capped at 100). |
| `GET /admin/students?search=&classId=&page=1&limit=50` | Admin roles | Paginated student roster. Search checks display name and email. `limit` is capped at 200. |
| `GET /admin/students/:studentId/performance?from=&to=` | Admin roles | Completed attempts, chronological score history, and results grouped by subject. Date filters accept ISO dates or datetimes. |
| `POST /students/me/heartbeat` | Student | Update `lastSeenAt`. Overview counts an active student only when an active student account's heartbeat is within five minutes. |
| `GET /exams` | Signed in | Current school's exams with `id`, `title`, `examType`, `year`, `duration`, `scheduledAt`, `subjects`, and the actual `totalQuestions` count. |
| `GET /questions?examId=ID&subject=NAME` | Signed in | Questions for exactly one exam and configured subject in the current school. |
| `POST /admin/create-exam` | School admin, exam officer | Create an exam with `title`, `examType`, `subjects` (array), optional `year`, `duration`, and `scheduledAt`; may include a `questions` array. |
| `POST /admin/add-question` | School admin, exam officer | Add one question to a school-owned exam. Accepts JSON or multipart form with an optional image. |
| `POST /admin/import-questions-zip` | School admin, exam officer | Bulk import up to 500 questions to a school-owned exam from a multipart ZIP upload. |
| `PUT /admin/exam/:examId`, `DELETE /admin/exam/:examId` | School admin, exam officer | Update or delete a school-owned exam, including its optional `scheduledAt`. Set `scheduledAt` to `null` to remove its scheduled time. Subjects cannot be changed after questions exist. |
| `POST /attempts` | Student | Record a reportable exam attempt with `examId`, `subject`, `score`, and `total`. Completion time, student, and school are assigned by the server. |
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

Exam schedules use the optional `scheduledAt` field in ISO 8601 format (for example, `2026-11-20T09:00:00Z`). Timestamps with an offset are stored in UTC; timezone-free timestamps are treated as UTC. `GET /api/admin/upcoming-exams` returns `{ "exams": [...], "total": 1 }` and only includes future exams with a scheduled time. Existing exams remain valid without a schedule.

### Paystack checkout

Create fixed-price weekly, monthly, and yearly payment pages in Paystack and configure their HTTPS URLs on the backend as `PAYSTACK_WEEKLY_PAYMENT_URL`, `PAYSTACK_MONTHLY_PAYMENT_URL`, and `PAYSTACK_YEARLY_PAYMENT_URL`. Set each page to NGN 300 weekly, NGN 5,000 monthly, or NGN 25,000 yearly, require the customer email, and set its return URL to the frontend's payment-received page (for example, `https://cbt-app-lime.vercel.app/payment-received`). The customer must pay using the same email they will use for their CBT account. A return redirect is not proof of payment. `GET /api/payments/plans` returns the plan names, NGN prices, durations, and whether a payment link is configured so the frontend can show the current options.

Configure the Paystack dashboard webhook URL as `https://cbt-app-back.vercel.app/api/payments/paystack/webhook`. Keep `PAYSTACK_SECRET_KEY` server-side; the webhook verifies Paystack's HMAC signature over the exact raw request body, then validates the signed `charge.success` event's status, reference, payer email, currency, and amount. It does not call Paystack's transaction-lookup API. Only successful NGN transactions for the exact plan amounts are accepted. Each Paystack transaction reference is processed once. A verified payment generates an 8-digit, single-use PIN, which expires after 24 hours and is sent by email.

Configure outbound email on the backend with `SMTP_HOST`, `SMTP_PORT` (587 with STARTTLS, or 465 with implicit TLS), `SMTP_USERNAME`, `SMTP_PASSWORD`, and `MAIL_FROM_EMAIL`. If email delivery fails, the webhook responds with an error so Paystack can retry delivery.

The frontend calls `POST /api/payments/paystack/initialize` with `{ "plan": "weekly" }`, `{ "plan": "monthly" }`, or `{ "plan": "yearly" }` and redirects to the returned `authorization_url`. The return page should only tell the customer to check their email. It must not issue a PIN or activate the account.

To redeem the PIN, call `POST /api/payments/paystack/redeem` with the payer's email and 8-digit `pin`. For a new account, also provide `name`, an 8+ character `password`, and `schoolId` unless `DEFAULT_SCHOOL_ID` is configured or only one school exists. Existing student accounts keep their existing password. A successful response sets the authenticated session cookie and returns the subscription plan and expiration. Weekly subscriptions last 7 days; monthly and yearly subscriptions last one and twelve calendar months. PINs allow at most five attempts; a successful redemption is single-use. The backend records/extends the student's subscription dates, but any subscription-expiry access policy must also be enforced by the application.

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

### Bulk question ZIP format

Send a `multipart/form-data` request to `/api/admin/import-questions-zip` with the selected `examId` and a ZIP file in the `file` field. The archive must contain a root-level `questions.csv` using the CSV template columns (`subject`, `question`, `optionA`, `optionB`, `optionC`, `optionD`, `correctAnswer`, `explanation`, and optional `imageUrl`). It may also contain PNG/JPG/JPEG images directly inside an `images/` directory and an optional root-level `README.txt`. In `imageUrl`, use either an image filename such as `triangle.png` or `images/triangle.png` to attach a ZIP image, or a valid HTTP(S) URL. Questions without images are supported.

The endpoint accepts comma-, semicolon-, and tab-delimited UTF-8 CSV files. ZIP uploads are limited to 25 MB, their uncompressed contents to 50 MB, each image to 10 MB, the CSV to 5 MB, and `README.txt` to 128 KB. The backend validates every row, image reference, image type, and archive path before inserting questions; exam ownership and configured subjects are checked on the server. Student question responses include the stored image URL, served by `/uploads/...`.

## Setup and deployment

Python 3.10+ is recommended.

1. Create and activate a virtual environment, then install dependencies:

   ```sh
   python -m venv venv
   # Activate the environment for your shell, then:
   pip install -r requirements.txt
   ```

2. Configure environment variables. `DATABASE_URL` accepts SQLite or PostgreSQL. Local Flask CLI commands load values from `.env` when `python-dotenv` is installed (it is included in `requirements.txt`); make sure the server and migration command use the same `DATABASE_URL`. `FRONTEND_ORIGIN` (or comma-separated `FRONTEND_ORIGINS`) must list the exact frontend origins. For production set `APP_ENV=production`, `COOKIE_SECURE=true`, and `COOKIE_SAMESITE=None` when the frontend is on a separate site; production must use HTTPS. `DEFAULT_SCHOOL_ID` can be set after school creation for student self-registration. Database credentials and optional Cloudinary credentials are read only from environment variables. Question images are stored locally under `uploads/` by default on a self-hosted deployment; set `UPLOAD_FOLDER` to a persistent mounted volume to retain images across redeployments. On serverless platforms with an ephemeral filesystem, configure a persistent volume for `UPLOAD_FOLDER` or image uploads will be rejected rather than saved temporarily. Cloudinary remains optional.

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

5. Start locally with `flask --app app run` or deploy the backend folder to Vercel with the included `vercel.json` routing all requests to the Flask app. Migrations are run as a deployment step; the app no longer creates tables at import time. No sample students or activity are seeded.

## Data and reporting notes

`Attempt` stores the authenticated student ID, school ID, exam ID, subject, score, total, and server completion timestamp. The exam client records subject-level attempts for school reports and saves one aggregate result to the student's personal history. The server derives the student/school and validates the exam and configured subject. The overview average is the arithmetic mean of attempt percentages. A heartbeat only updates last-seen time; it does not record study time. Legacy history rows without exam and subject remain personal history and are not included in school performance metrics.

The student client must call the login endpoint and send the resulting HttpOnly cookie with API requests. A browser-only localStorage admin flag cannot authorize any endpoint.
