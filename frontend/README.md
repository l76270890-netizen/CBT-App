# React + TypeScript + Vite

Set `VITE_API_URL` to the backend origin. Set `VITE_SCHOOL_ID` to the school ID
to attach public registrations to that school's student roster; if omitted, the
backend must provide `DEFAULT_SCHOOL_ID`.

For the separate Admin Vercel deployment (root directory `frontend`, Vite build), set `VITE_APP_MODE=admin` so the app opens the Admin Login at `/` using the existing `AdminDashboard` and backend auth. Leave `VITE_APP_MODE` unset for the normal student frontend deployment.

## Question image upload API

The admin question form expects the backend to provide
`POST /api/admin/upload-question-image` as an authenticated multipart upload
with the file in the `image` field. The endpoint must store the image
permanently and return JSON containing its URL as `imageUrl` or `url`. The
admin then sends that URL as `imageUrl` when creating a question. The questions
API should include `imageUrl` (or `image_url`) when returning question records.
Relative upload paths are resolved against `VITE_API_URL`.

The bulk-question CSV importer accepts the existing eight required columns and
an optional final `imageUrl` column. Image URLs must be HTTP(S) URLs or
relative upload paths; blank image cells are imported without an image.

For bulk questions with local diagrams, upload a ZIP containing exactly one
`questions.csv` and an optional `images/` folder. Put image filenames (for
example, `triangle.png`) in the CSV's `imageUrl` column. PNG, JPG, and JPEG
images up to 5 MB each are accepted; the ZIP is limited to 25 MB. The admin
uploads each referenced image through the permanent question-image endpoint
before saving its question, so ZIP image imports require that endpoint to be
available.

For separate CSV and multi-image uploads, the admin previews and validates the
CSV locally before the administrator confirms the import. The confirmed import
sends one authenticated multipart request to `POST /api/admin/import-questions`
with `csv`, `examId`, and a repeated `images` field for each selected image.
The backend matches image filenames against the CSV `imageUrl` column. PNG,
JPG, JPEG, and WEBP images are supported when accepted by the backend. CSV
imports without selected images continue to use the existing per-question
import flow.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
