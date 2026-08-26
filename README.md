# ProFormaX Web Frontend

ProFormaX is a Next.js app for green building assessments, project history, and project detail review. It uses route groups for public auth pages and protected application pages, with a shared session cookie for access control.

## Overview

The app currently includes:

- Landing redirect logic that sends signed-in users to the dashboard and everyone else to login
- Authentication screens for login, sign up, and password recovery
- A protected dashboard with recent project activity
- A new assessment flow with a large guided form
- Project history and per-project detail pages
- Next.js API routes that proxy requests to the backend and manage the session cookie

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Axios
- Lucide React

## Getting Started

### Prerequisites

- Node.js 20 or newer
- npm
- A backend URL for `NEXT_PUBLIC_API_URL`

### Install

```bash
npm install
```

### Environment

Create a `.env` file in the project root with the backend URL:

```env
NEXT_PUBLIC_API_URL=https://your-backend.example.com
```

If you also keep a local example file, mirror the same keys in `.env.example`.

### Run Locally

```bash
npm run dev
```

Then open:

```bash
http://localhost:3000
```

### Production Build

```bash
npm run build
npm run start
```

### Lint

```bash
npm run lint
```

## Scripts

- `npm run dev` - start the development server
- `npm run build` - create a production build
- `npm run start` - run the production build
- `npm run lint` - run ESLint

## Folder Structure

```text
.
|-- app
|   |-- (auth)
|   |   |-- forgot-password/page.tsx
|   |   |-- login/page.tsx
|   |   `-- sign-up/page.tsx
|   |-- (authenticated)
|   |   |-- assessments
|   |   |   |-- history/page.tsx
|   |   |   `-- new/page.tsx
|   |   |-- dashboard/page.tsx
|   |   |-- layout.tsx
|   |   `-- projects/[projectId]/page.tsx
|   |-- api
|   |   |-- assessment/form-inputs/route.ts
|   |   |-- auth/login/route.js
|   |   |-- auth/logout/route.js
|   |   |-- auth/me/route.ts
|   |   `-- users/[userId]/projects/route.ts
|   |-- favicon.ico
|   |-- globals.css
|   |-- layout.tsx
|   |-- not-found.tsx
|   `-- page.tsx
|-- components
|   |-- errors/AccessDenied.tsx
|   `-- ui
|       |-- Button.tsx
|       |-- Modal.tsx
|       |-- PasswordRequirement.tsx
|       `-- TextField.tsx
|-- contexts
|   `-- AuthContext.tsx
|-- lib
|   |-- api.js
|   |-- utils.js
|   `-- server
|       `-- project-access.ts
|-- public
|   |-- file.svg
|   |-- globe.svg
|   |-- images/auth-side-background.png
|   |-- logo
|   |   |-- proformax.svg
|   |   |-- proformax-ori.png
|   |   `-- proformax-white.png
|   |-- next.svg
|   |-- vercel.svg
|   `-- window.svg
|-- types
|   |-- form.ts
|   `-- project.ts
|-- proxy.ts
|-- next.config.ts
|-- package.json
`-- tsconfig.json
```

## Key Routes

### Public routes

- `/` - redirects to `/dashboard` when a session exists, otherwise `/login`
- `/login` - sign in
- `/sign-up` - create an account
- `/forgot-password` - password recovery

### Protected routes

- `/dashboard` - summary view with recent projects
- `/assessments/new` - create a new assessment
- `/assessments/history` - browse assessment history
- `/projects/[projectId]` - view project details

## API Routes

These routes act as the frontend backend-for-frontend layer:

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/assessment/form-inputs`
- `GET /api/users/:userId/projects`

## Authentication Notes

- Session state is stored in an HTTP-only `session_token` cookie
- The root `proxy.ts` redirects unauthenticated users away from protected routes
- Expired validation is fail-closed: invalid sessions are cleared, while an unavailable authentication service returns a non-cacheable `503` without extending session trust
- `contexts/AuthContext.tsx` restores the current user from `/api/auth/me`
- The authenticated layout provides the shared header and user menu

## Next.js Structure Notes

This project uses the App Router, route groups, and colocated feature folders. Protected and auth pages are separated with `(authenticated)` and `(auth)` so the URL stays clean while the code stays organized.

## Backend Configuration

Most data is fetched from the backend defined in `NEXT_PUBLIC_API_URL`. If that value is missing, the server helpers in `lib/server/project-access.ts` will fail fast, which makes configuration issues easier to spot during development.
