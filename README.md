# Vaulto — Personal Finance Tracker

A full-stack fintech SaaS dashboard for tracking income, expenses, and savings.

🔗 **Live Demo:** https://vaulto-v806.onrender.com

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, Vite, Tailwind CSS, Recharts |
| Backend | Node.js, Express, REST API |
| Database | PostgreSQL (Supabase) |
| Auth | JWT + bcrypt |
| Containerization | Docker, Docker Compose |
| CI/CD | GitHub Actions |
| Deployment | Render |

---

## Features

- JWT authentication (signup, login, protected routes)
- Dashboard with animated stats, charts, and AI insights
- Full transactions CRUD (add, edit, delete)
- Analytics with category breakdown, savings trend, income vs expenses
- Settings page (update name, change password)
- Dark mode with localStorage persistence
- Fully responsive design
- Dockerized with multi-stage builds
- CI/CD pipeline via GitHub Actions

---

## Running Locally with Docker

```bash
git clone https://github.com/KishoreRaja05/Vaulto.git
cd Vaulto
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend: http://localhost:5000

---

## Running Locally without Docker

```bash
# Backend
cd server
npm install
npm run dev

# Frontend
cd client
npm install
npm run dev
```

---

## Environment Variables

Create `server/.env`:


SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
JWT_SECRET=your_jwt_secret
PORT=5000

---

## CI/CD

Every push to `main` triggers a GitHub Actions workflow that builds both Docker images to verify the build passes.

---

*This is a portfolio project — not a real financial service.*
