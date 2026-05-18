# StudyAM

StudyAM is a web platform for organizing ENSAM academic resources by year, filière, module, and element. It includes public landing pages, student dashboards, representative tools, and an admin dashboard for managing users and course content.

## Features

- Public landing page and login flow
- Student dashboard for browsing course materials
- Representative and promo representative access for publishing content
- Admin dashboard for managing users, modules, elements, and documents
- Multilingual UI with French and English support
- MySQL database with Drizzle ORM

## Tech Stack

- Vite + React + TypeScript
- Hono backend with tRPC
- Drizzle ORM + MySQL2
- Tailwind CSS
- bcryptjs for admin password hashing

## Routes

- `/` - public home page
- `/studyam` - StudyAM landing page
- `/login` - authentication page
- `/dashboard` - student/representative dashboard
- `/admin` - admin dashboard

## Requirements

- Node.js 20 or newer
- MySQL database
- npm

## Setup

1. Install dependencies:

	```bash
	npm install
	```

2. Configure environment variables in `.env`:

3. Run the database seed:

	```bash
	npx tsx db/seed.ts
	```

4. Start the development server:

	```bash
	npm run dev
	```

## Scripts

- `npm run dev` - start the Vite dev server
- `npm run build` - build the frontend and backend bundle
- `npm run start` - run the production server from `dist/boot.js`
- `npm run check` - run TypeScript checks
- `npm run lint` - run ESLint
- `npm run format` - format the codebase with Prettier
- `npm run test` - run Vitest tests
- `npm run db:generate` - generate Drizzle migrations
- `npm run db:migrate` - apply Drizzle migrations
- `npm run db:push` - push schema changes to the database

## Database Seeding

The seed script creates:

- academic years
- filières:
  - GE-DI
  - GE-MCI
  - GIEO
  - GIP
  - GM-CISM
  - GM-IMS
  - GM-MPF
  - GME
  - GI-ILSI
  - IATD-SI
  - GC
- the admin account from environment variables

The admin account is created or updated from:

- `ADMIN_CODE`
- `ADMIN_NAME`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

## Project Structure

- `api/` - backend routes, middleware, and server helpers
- `db/` - schema, migrations, and seed scripts
- `src/` - React frontend
- `public/` - static assets
- `contracts/` - shared types and constants
