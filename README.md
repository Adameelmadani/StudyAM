# StudyAM

StudyAM is the ENSAM academic resources platform for organizing teaching materials by year, sector, module, and element. It supports student access, representative publishing, promo-representative workflows, and a central admin dashboard for managing users, folders, and documents.

<img src="demo/demo.gif">

## Overview

The application is split into two parts:

- Frontend: React + Vite + TypeScript + Tailwind CSS
- Backend: Nodejs + Hono + tRPC + Drizzle ORM + MySQL

It includes:

- Public landing pages and authentication flow
- Profile completion step for new users
- Student dashboard with module and document browsing
- Representative and promo-representative access to manage course content
- Admin dashboard for approvals, user management, activity monitoring, and resource administration
- Google OAuth login and Google Drive integration for document uploads
- French/English localization

## Main Features

- Academic organization by year and sector
- Course modules and elements management
- Document upload and linking by type (`cours`, `exam`, `test`, `tp`, `resume`)
- File type detection and embedded previews
- Role-based access rules for students, representatives, promo representatives, and admins
- Google account connection for sign-in and Drive-backed file storage
- Activity logs and admin controls

## Tech Stack

- React 19
- Vite 7
- TypeScript
- Tailwind CSS
- React Router
- Hono
- tRPC
- Drizzle ORM
- MySQL
- Google APIs
- JWT + bcryptjs

## Project Structure

- `api/` — Hono server, routes, auth middleware, and API logic
- `api/lib/` — environment config, Google OAuth, Google Drive helpers, and utilities
- `api/queries/` — database access helpers
- `api/routers/` — API endpoints for auth, users, modules, documents, sectors, and years
- `db/` — schema, migrations, and seed script
- `src/` — frontend pages, components, hooks, providers, and styling
- `contracts/` — shared contract types and constants
- `public/` — static assets

## Required Tools

- Node.js 20+
- npm
- MySQL database

## Environment Variables

Create a `.env` file at the project root with the required values:

```env
APP_ID=your_app_id
APP_SECRET=your_jwt_secret
DATABASE_URL=mysql://user:password@localhost:3306/studyam

GOOGLE_OAUTH_CLIENT_ID=your_google_client_id
GOOGLE_OAUTH_CLIENT_SECRET=your_google_client_secret
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:5173/api/google/oauth/callback
GOOGLE_DRIVE_FOLDER_ID=your_drive_folder_id

OWNER_UNION_ID=your_owner_union_id
ADMIN_CODE=admin_code
ADMIN_NAME=Admin Name
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=secure_admin_password
```

Notes:

- `APP_SECRET` is used for JWT signing.
- `DATABASE_URL` is required by the database layer.
- Google variables are needed for Google login and Drive uploads.
- Admin variables are used by the seed script to ensure the default admin account exists.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create the `.env` file with the variables above.

3. Apply the database schema:

```bash
npm run db:push
```

4. Seed the initial data, including academic years, sectors, and the admin user:

```bash
npx tsx db/seed.ts
```

5. Start the app in development mode:

```bash
npm run dev
```

The frontend runs through Vite and the API is served through the Hono app during development.

## Production Build

```bash
npm run build
npm run start
```

This builds the frontend and backend bundle, then starts the server from `dist/boot.js`.

## Available Scripts

```bash
npm run dev
npm run build
npm run start
npm run check
npm run lint
npm run format
npm run test
npm run db:generate
npm run db:migrate
npm run db:push
```

## User Roles

- `student` — browses course resources and completes a profile
- `representative` — manages content for their assigned year/sector
- `promo_representative` — manages content for their promo-level admin section
- `admin` — full access to users, modules, sectors, and activity

## Authentication and Authorization

The app supports:

- Email/ENSAM-code local authentication using JWT tokens
- Google OAuth-based login/connection
- Protected routes with profile completion enforcement
- Role-based restrictions for editing modules, elements, and documents

## Google Drive Integration

Google Drive is used for document storage. When an approved user uploads a document, the file is uploaded to the configured Drive folder, and the returned Drive URL is saved in the database rather than storing the file directly in the app server.

For this to work properly:

- the configured Google OAuth client must be valid
- the target folder must be reachable by the connected account
- the Drive folder should be shared or located in an accessible shared drive

## Database Model Highlights

Key entities include:

- `users`
- `years`
- `sectors`
- `yearSectors`
- `modules`
- `moduleSectors`
- `elements`
- `documents`
- `activityLog`

## Licence

Ce projet est sous licence **MIT** - voir le fichier [LICENSE](LICENSE) pour plus de détails.