# Lecture Survival Kit

A pastime tool for students at DHBW Karlsruhe — built to survive the long lectures.

---

## Project Structure

```
survival-kit-monorepo
├── backend/
├     ├── docker-compose.yml    # Local Development
├── frontend/
├── docker-compose.yml          # Production
└── .github/workflows/
    └── ci-cd.yml
```

---

## Frontend

A React + TypeScript single-page application built with Vite.

### Dependencies

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite)
![React Router](https://img.shields.io/badge/React_Router-7-CA4245?logo=reactrouter)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-12-EF0079?logo=framer)
![Lucide](https://img.shields.io/badge/Lucide_React-1.14-F56565)
![Tiptap](https://img.shields.io/badge/Tiptap-3-000000)
![FullCalendar](https://img.shields.io/badge/FullCalendar-6-4285F4)
![DOMPurify](https://img.shields.io/badge/DOMPurify-3-brightgreen)
![React Grid Layout](https://img.shields.io/badge/React_Grid_Layout-2-orange)

---

## Backend

A Spring Boot REST API with JWT authentication, email verification, and PostgreSQL persistence.

### Dependencies

![Java](https://img.shields.io/badge/Java-25-ED8B00?logo=openjdk)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-4.0.6-6DB33F?logo=springboot)
![Spring Security](https://img.shields.io/badge/Spring_Security-6DB33F?logo=springsecurity)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql)
![Flyway](https://img.shields.io/badge/Flyway-10-CC0200?logo=flyway)
![jjwt](https://img.shields.io/badge/JJWT-0.12.6-000000)
![Thymeleaf](https://img.shields.io/badge/Thymeleaf-3-005F0F?logo=thymeleaf)
![SpringDoc](https://img.shields.io/badge/SpringDoc_OpenAPI-3-85EA2D)
![Testcontainers](https://img.shields.io/badge/Testcontainers-1.21-3AB5E6)

---

## Setup

### Local Development

The backend uses a `local` Spring profile. A `docker-compose.yml` inside `backend/` spins up PostgreSQL and MailHog (a local mail catcher — no real emails are sent during development).

```bash
# Start local services
cd backend
docker compose up -d

# Run backend (IntelliJ or CLI)
./mvnw spring-boot:run -Dspring-boot.run.profiles=local

# Run frontend
cd frontend
npm install
npm run dev
```

Mail sent during local development is visible at [http://localhost:8025](http://localhost:8025).

### Environment Variables

Use a `.env` file for local development. For necessary values take a look at the `_env_example`

---

## Deployment

The app is deployed on a Linux VPS via Docker. A shared `web` Docker network connects all services to a central Nginx reverse proxy.

### CI/CD (GitHub Actions)

- **Build & Test** — runs on every push and pull request on all branches
- **Deploy** — triggered manually via `workflow_dispatch`, only on `main`

The deploy job:
1. Builds Docker images for backend and frontend
2. Pushes them to GitHub Container Registry (`ghcr.io`)
3. SSHs into the server as the `deploy` user
4. Writes the `.env` from GitHub Secrets
5. Pulls the new images and runs `docker compose up -d`

### Production Services

| Container | Description |
|---|---|
| `survival-kit-backend` | Spring Boot API on port 8080 |
| `survival-kit-frontend` | Static React build served by Nginx on port 80 |
| `survival-kit-postgres` | PostgreSQL 16 database |

Routing is handled by the external Nginx proxy:

| Domain | Target |
|---|---|
| `lecture-survival-kit.jannis-saur.de` | Frontend |
| `api.lecture-survival-kit.jannis-saur.de` | Backend |

---

## ToDo's ~before Release

- [ ] Rate Limiting on Several Places
- [ ] View / Promote Users as Admin in Adminpanel
- [ ] Option to resend Authentication Mail
- [ ] Profile Options (Change password, username, delete Account)
- [ ] Random Word generator game
- [ ] Integrate Free-Room-Finder from Kai
- [ ] Daily Phrase Rework from v2
- [ ] Daily-Course-Chat Rework from v2 (Encrypted?, RichText, Images, GIFs, Videos?, Files)
- [ ] Rework Logging and Exception Handling

## Further Ideas

- [ ] 5 Days at DHBW (FNAF) Game
- [ ] Private Chat with Users (Encrypted?)