# React + TypeScript + Vite

Set `VITE_API_URL` to the backend origin. Set `VITE_SCHOOL_ID` to the school ID
to attach public registrations to that school's student roster; if omitted, the
backend must provide `DEFAULT_SCHOOL_ID`.

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
