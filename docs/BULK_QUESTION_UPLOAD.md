# Bulk question import

The Admin import API accepts a CSV with multiple image files, as well as the
existing ZIP format. For a CSV import, submit multipart form data to
`POST /api/admin/import-questions` with `examId`, one `csv` file, and zero or
more `images` files:

```text
examId: 123
csv: questions.csv
images: triangle.png
images: angles.png
```

The existing `POST /api/admin/import-questions-zip` endpoint remains available.
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

For a CSV-plus-images import, set `imageUrl` to the image filename, such as
`triangle.png`; an optional directory prefix is ignored. Uploaded names and CSV
references are matched case-insensitively after whitespace normalization.
Duplicate or ambiguous uploaded names are rejected. Leave `imageUrl` blank for
a question without an image. ZIP imports continue to support `images/triangle.png`.
Question subjects must match one of the exam's configured subjects, and
`correctAnswer` must be `A`, `B`, `C`, or `D`. CSV files must be UTF-8 encoded.

Imports support up to 500 questions. CSVs are limited to 5 MB; each image is
limited to 10 MB. CSV-plus-images requests allow at most 50 images and 50 MB
total image data; the complete multipart request is limited to 56 MB. Images
must be PNG, JPG, JPEG, or WEBP and their file signatures are checked. The
legacy ZIP may be at most 25 MB, with 50 MB of uncompressed contents.
Only `questions.csv`, an optional `README.txt`, and files directly inside
`images/` are accepted. Paths are validated and files are never extracted to
archive-controlled filesystem paths. Each image is decoded and limited to
16 megapixels to reject malformed uploads and decompression bombs.

Uploads require a successful Admin login and use
`examId` and either the `csv`/`images` fields or the legacy ZIP `file` field.
The endpoint validates all rows and image references before it stores images
or inserts questions. Successful CSV imports include `questionsFound`,
`questionsImported`, `imagesUploaded` (unique images saved), and
`imagesMatched` (CSV question references) counts. Student
question responses include image URLs, which are served through `/uploads/...`.

Images are stored locally under `uploads/questions/` by default. To retain them
across redeployments, configure `UPLOAD_FOLDER` to a persistent mounted volume.
On serverless deployments with an ephemeral filesystem, the endpoint rejects
image imports unless that persistent volume is configured. Cloudinary is not
required. Set a stable `SECRET_KEY` so Admin session cookies survive backend
restarts. For a cross-site frontend/backend deployment, configure
`COOKIE_SECURE=true` and `COOKIE_SAMESITE=None` and use HTTPS.
