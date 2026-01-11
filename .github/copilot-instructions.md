# AI Plagiarism Detection — Project Overview

This project helps educators identify AI-assisted work by embedding imperceptible tracking markers into assignment prompts and then checking student submissions for those markers. It avoids unreliable "AI text detectors" and focuses on concrete, verifiable indicators.

## How It Works
- **Prompt Mutation (Gemini):** The system asks Gemini to propose contextually relevant, atomic changes and hidden injections:
  - Atomic replacements: incidental names, background dates, example numbers (never core requirements)
  - Secret injections: rare, topic-relevant details (e.g., obscure locations, niche scientific terms, uncommon exact phrases)
- **PDF Generation:** The backend generates a student-facing PDF with:
  - A visible layer the student reads normally
  - A hidden layer carrying the mutated prompt markers
- **Submission Analysis:** When students submit, the backend extracts text and checks for the presence of the hidden markers. It returns a score and evidence (snippets) showing what was found.

## Why This Works
- **Concrete signals:** We look for specific markers (names, numbers, dates, rare phrases) that are extremely unlikely to appear by chance.
- **Contextual relevance:** Injections match the assignment subject, so they look natural if present but are statistically improbable without seeing the hidden prompt.
- **Privacy by design:** We do not fingerprint students or inspect metadata; we only compare text against teacher-defined markers.

## API Endpoints
- **POST `/generate`**: Create a homework with markers
  - Input: `visible_text`, `teacher_id`, `assignment_id`
  - Output: `homework_id`, `original_prompt`, `mutated_prompt`, `mutations`, `changes`, `pdf_download`
- **GET `/download/<homework_id>`**: Download the assignment PDF
- **POST `/detect`**: Standalone detection for frontend use
  - Input (multipart form-data): `original_prompt`, `secret_prompt`, `changes[]`, `file` (PDF) or `student_text`
  - Output: `score` (e.g., `2/5`), `indicators_found` (with evidence snippets), `summary`
- **POST `/submit`**: Student submission + detection
  - Input: `homework_id`, `student_id`, `file` or `response_text`
  - Output: Detection results stored + returned

## Suspicion Scoring
- **Indicators:** Each atomic change or injection becomes a detectable marker.
- **Score:** `X/Y` where `X` is the number of markers found in the submission and `Y` is total markers.
- **Flagging:** Typical threshold: 40–50% (e.g., ≥3 of 6–8 markers) flags the submission for review.
- **Evidence:** We surface quotes/locations where markers appear, so professors can verify.

## Setup
- **Env vars:** place in `api/.env`
  - `GOOGLE_CLOUD_API_KEY`: Gemini API key
  - `MONGO_URI`: MongoDB connection
- **Install:**
  ```bash
  # in your venv
  pip install -r api/requirements.txt
  ```
- **Run:**
  ```bash
  source .venv/bin/activate
  python ./api/app.py
  ```

## Quick Testing
- We include a tiny test script to exercise endpoints without a UI.
  ```bash
  python ./api/test_endpoints.py
  ```
  - Test 1: `/generate` creates a homework and returns markers
  - Test 2: `/detect` checks a clean response (likely low score)
  - Test 3: `/detect` checks a response containing markers (higher score)

## Design Notes
- **Markers are subtle:** Prefer atomic replacements first; fall back to injections only when replacements are insufficient.
- **Context-first:** Injections are chosen based on the assignment topic (history, science, literature, geography, etc.).
- **Determinism:** Model seed `2262` keeps mutations stable across runs for the same prompt.

## Limitations & Roadmap
- **PDF extraction differences:** Some LLMs ignore certain PDF layers; we aim for universal markers that survive copy/paste and upload.
- **Universal embedding (future):** Integrate Private Use Area (PUA) font encoding to ensure all extractors see the hidden layer consistently.
- **Batch reporting:** Add endpoints for per-homework dashboards and submission analytics.
- **UI:** Build a lightweight teacher dashboard for generating prompts and reviewing flagged submissions.

## Repository Map
- **Backend:** `api/app.py` (Flask), `api/gemini.py` (Gemini integration)
- **Frontend:** `src/app` (Next.js demo)
- **Tests:** `api/test_endpoints.py` (CLI sanity checks)

## Ethics & Privacy
- We only compare submitted text against teacher-defined markers; no biometric or device fingerprinting.
- The system provides evidence-based signals and keeps final decisions with human reviewers.
