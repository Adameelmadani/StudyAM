# StudyAM - ENSAM Course Management Platform

StudyAM is a full-stack course management platform built for ENSAM (Ecole Nationale Superieure d'Arts et Metiers). It organizes courses across 5 academic years (1A-5A) with sector specializations for years 3A-5A, featuring three account types (Student, Representative, Admin) and Google Drive URL-based document storage.

## Features

- **3 Account Types**: Student, Representative (course uploader), Admin
- **5 Academic Years**: 1A, 2A, 3A, 4A, 5A with sector selection for 3A+
- **6 Sectors**: Mecanique, Electrotechnique, Informatique, Genie des Procedes, Genie Civil, Industriel
- **Course Organization**: Modules > Elements > Documents (Cours, Exam, Test, TP, Resume)
- **Document Storage**: Google Drive URLs (no file storage needed)
- **Glassmorphism Design**: White and #b24760 rose color palette
- **Full-Stack**: React + TypeScript frontend, tRPC + Drizzle ORM + MySQL backend

## Tech Stack

**Frontend**: React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui, Lucide icons
**Backend**: Hono, tRPC 11.x, Drizzle ORM, MySQL (via mysql2)
**Auth**: Local JWT authentication
**Database**: MySQL-compatible (TiDB Cloud in dev)

## Prerequisites

- Node.js 20+
- MySQL or MariaDB database
- npm or yarn

## Deployment Steps

### 1. Clone/Upload the Project

Upload the project files to your server:
```bash
# Clone from git (if you pushed to a repo)
git clone <your-repo-url> StudyAM
cd StudyAM
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```env
set -a; source .env; set +a
```

### 4. Setup the Database

Run the database schema push to create all tables:
```bash
npm run db:push
```

Seed the database with initial data (years, sectors, admin user):
```bash
npx tsx db/seed.ts
```

### 5. Build the Application

```bash
npm run build
```

This creates:
- `dist/public/` - Frontend static files
- `dist/boot.js` - Backend server bundle

### 6. Start the Production Server

```bash
npm start
```

The application will be available at `http://localhost:3000`

To run on a different port:
```bash
PORT=8080 npm start
```

### 7. Configure a Reverse Proxy (Recommended)

Use Nginx or Apache to proxy requests to the application:

**Nginx example:**
```nginx
server {
    listen 80;
    server_name studyam.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 8. Setup SSL (Recommended)

Use Let's Encrypt with Certbot:
```bash
sudo certbot --nginx -d studyam.yourdomain.com
```

### 9. Run as a Service (Optional)

Create a systemd service file at `/etc/systemd/system/studyam.service`:
```ini
[Unit]
Description=StudyAM Course Platform
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/studyam
ExecStart=/usr/bin/npm start
Restart=on-failure
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl enable studyam
sudo systemctl start studyam
```

## Development

Start the development server:
```bash
npm run dev
```

This starts both the frontend (Vite HMR) and backend (Hono API) at `http://localhost:3000`

## Database Schema

The application uses the following tables:

| Table | Description |
|-------|-------------|
| `users` | Students, representatives, and admin accounts |
| `years` | Academic years (1A-5A) |
| `sectors` | Specialization sectors |
| `yearSectors` | Junction table for year-sector mappings |
| `modules` | Course modules (e.g., Mathematics) |
| `elements` | Module elements (e.g., Math 1, Math 2) |
| `documents` | Google Drive URLs with type (cours, exam, test, tp, resume) |
| `activityLog` | Audit trail for admin monitoring |

## API Endpoints (tRPC)

| Router | Endpoints |
|--------|-----------|
| `localAuth` | register, login, me |
| `year` | list, getById |
| `sector` | list, byYear |
| `module` | list, create, update, delete |
| `element` | list, listByYearSector, create, update, delete |
| `document` | list, listByYearSector, create, update, delete, recent |
| `user` | list, getById, update, delete, grantRepresentative, revokeRepresentative, stats |
| `activity` | list, create |

## Account Types

### Student
- Registers with name, email, ENSAM code, password, year, and sector (if applicable)
- Can browse courses for their year and sector
- Can view all uploaded documents

### Representative
- Registers like a student but requests representative role
- Requires admin approval to upload documents
- Can only upload documents for their assigned year and sector
- Can upload Google Drive URLs with document type selection

### Admin
- Full platform management access
- Can grant/revoke representative access
- Can manage students (view, delete)
- Can create modules and elements
- Can view activity logs and statistics
- Admin account is seeded with ensamCode: `ADMIN001`

## Document Types

When uploading, representatives select from:
- **Cours** - Course materials/lectures
- **Exam** - Examination papers
- **Test** - Test/Quiz materials
- **TP** - Practical work (Travaux Pratiques)
- **Resume** - Summary notes

## Project Structure

```
├── api/                    # Backend API
│   ├── routers/           # tRPC routers (localAuth, year, sector, module, element, document, user, activity)
│   ├── middleware.ts      # Auth middleware (public, authed, admin, representative)
│   ├── router.ts          # Main tRPC router
│   ├── context.ts         # Request context
│   └── boot.ts            # Hono server entry
├── contracts/             # Shared types/constants
├── db/                    # Database
│   ├── schema.ts          # Drizzle ORM schema
│   ├── relations.ts       # Table relations
│   └── seed.ts            # Database seeding script
├── src/                   # Frontend
│   ├── pages/             # Page components (Landing, Login, Dashboard, ElementDetail, AdminDashboard, NotFound)
│   ├── hooks/             # React hooks (useAuth)
│   ├── providers/         # tRPC provider
│   ├── index.css          # Global styles with glassmorphism
│   ├── App.tsx            # Route definitions
│   └── main.tsx           # App entry point
├── public/                # Static assets (hero image)
├── dist/                  # Production build output
└── .env                   # Environment variables
```

## License

Built by me for students. ENSAM Course Platform.
