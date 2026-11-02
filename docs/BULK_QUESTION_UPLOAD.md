# Bulk question ZIP upload

The Admin question-import page accepts the existing CSV format and ZIP files.
For a ZIP import, select an exam, then upload a ZIP containing:

```text
questions.csv
README.txt                 (optional)
images/
  triangle.png             (optional)
```

`questions.csv` must have these columns:

```text
subject,question,optionA,optionB,optionC,optionD,correctAnswer,explanation,imageUrl
```

Set `imageUrl` to the relative path in the archive, for example
`images/triangle.png`. Leave it blank for a question without an image.
Question subjects must match one of the exam's configured subjects, and
`correctAnswer` must be `A`, `B`, `C`, or `D`. CSV files must be UTF-8 encoded.

The ZIP may be at most 25 MB, with at most 500 questions, 50 MB of uncompressed
contents, 5 MB per CSV, and 10 MB per image. Images must be PNG, JPG, or JPEG.
Only `questions.csv`, an optional `README.txt`, and files directly inside
`images/` are accepted. Paths are validated and files are never extracted to
archive-controlled filesystem paths.

Uploads require a successful Admin login and use
`POST /api/admin/import-questions-zip` as multipart form data with `examId` and
`file` fields. The endpoint validates all rows and image references before it
stores images or inserts questions. Student question responses include the
image URLs, which are served through `/uploads/...`.

Images are stored locally under `uploads/questions/` by default. To retain them
across redeployments, configure `UPLOAD_FOLDER` to a persistent mounted volume.
On serverless deployments with an ephemeral filesystem, the endpoint rejects
image imports unless that persistent volume is configured. Cloudinary is not
required. Set a stable `SECRET_KEY` so Admin session cookies survive backend
restarts. For a cross-site frontend/backend deployment, configure
`COOKIE_SECURE=true` and `COOKIE_SAMESITE=None` and use HTTPS.
