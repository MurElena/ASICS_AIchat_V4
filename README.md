# ASICS Copy Studio

ASICS Copy Studio is a web portal for creating on-brand product copy and marketing content. It helps copywriters and project managers configure generation settings, run single or batch outputs, review results in an editor, and reuse saved profiles across runs.

The app supports two workflows:

- **AI mode** — a conversational agent guides you step by step through setup and generation.
- **Manual mode** — configure and launch generations from saved profile cards and structured forms.

---

## What the portal does

### Generate on-brand copy

Users can produce **single-file** outputs (one document or description) or **multiproduct** batch runs (catalog-style generation across many products). Each run is shaped by:

- **Templates** — Word or Excel structures that define output format and fields
- **Language** and **length** preferences
- **Glossaries** — terminology dictionaries
- **Style guides** — tone and writing rules
- **Reference content** — brand documents from the Brand Voice library
- **Context input** — source files or pasted text used as generation input

After generation, the **Generation Editor** lets users review output, make edits, and optionally commit refined instructions back to their personal style guide.

### AI mode

In AI mode, a chat-based agent walks through a visible workflow panel:

1. Generation type (single or multiproduct)
2. Template
3. Language
4. Max length
5. Glossaries
6. Style guide (multi-select from Brand Voice)
7. Reference content (multi-select from Brand Voice)
8. Context input (files or text)
9. Confirm & generate

The agent can match a request to an existing saved profile, accept quick-choice buttons, and let users click workflow steps to revise settings. On confirmation, users can:

- **Yes, generate** — start immediately
- **Save and generate** — name and save a profile to Manual mode, then generate
- **Change something** — pick a workflow step in the side panel to edit

### Manual mode

Manual mode has two areas:

**Generate**

- Browse **saved profile cards** and run a configuration with one click
- Launch a **new generation wizard** to set type, template, language, brand voice options, and more
- Optionally save the setup as a reusable profile card

**Configuration**

- **Templates** — create, edit, and manage Word/Excel templates (including guided and visual editors)
- **Brand Voice** — manage glossaries, style guides, and reference content used during generation

### History

The **History** page lists past generation jobs with status tags (Done, Pending, Error, etc.). Users can search records and reopen completed outputs in the editor. Visibility depends on role: copywriters see their own runs; project managers and admins see broader history.

### Administration & account

- **Profile** — account settings
- **Statistics** — usage overview
- **Documentation** — in-app help articles
- **Admin** (admin only) — user management and LLM model configuration
- **Light / dark theme**

---

## Roles

| Role | Capabilities |
|------|----------------|
| **Admin** | Full access, including Admin panel |
| **Project Manager** | Templates, Brand Voice, generation, and history |
| **Copywriter** | Dashboard, Generate, and own History |

---

## Tech stack

- **React 19** + **TypeScript**
- **Vite** for dev and production builds
- **localStorage** for profiles, history, style guides, and session (demo/prototype persistence)
- **xlsx** and **docx** for template and export handling

---

## Getting started

### Prerequisites

- Node.js 18+

### Install and run locally

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (default: `http://localhost:5173`).

### Build for production

```bash
npm run build
npm run preview
```

Production output is written to `dist/`. The project is configured for deployment on Vercel (framework: Vite, build: `npm run build`, output: `dist`).

---

## Repository

[https://github.com/MurElena/ASICS_AIchat_V4](https://github.com/MurElena/ASICS_AIchat_V4)
