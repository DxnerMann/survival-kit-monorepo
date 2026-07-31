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
![react-easy-crop](https://img.shields.io/badge/react--easy--crop-6.0.2-000000)
![Recharts](https://img.shields.io/badge/Recharts-3.9.0-22B5BF)

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
![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)

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

| Container | Description                                   |
|---|-----------------------------------------------|
| `survival-kit-backend` | Spring Boot API on port 8080                  |
| `survival-kit-frontend` | Static React build served by Nginx on port 80 |
| `survival-kit-postgres` | PostgreSQL 16 database                        |
| `survival-kit-redis` | In-memory store for revoked JWT session tokens |

Routing is handled by the external Nginx proxy:

| Domain | Target |
|---|---|
| `lecture-survival-kit.jannis-saur.de` | Frontend |
| `api.lecture-survival-kit.jannis-saur.de` | Backend |

---

## API Documentation

Base URL: `/v1`  
Auth: HttpOnly session cookie (`session`) set on login. Send requests with credentials (`credentials: "include"`). `Authorization: Bearer <jwt>` is still accepted.  
Roles: `GUEST` (public), `USER`, `ADMIN`. Interactive OpenAPI UI: `/swagger-ui/index.html` (ADMIN).

### Auth — `/v1/auth`

| Method | Path | Role | Description |
|--------|------|------|-------------|
| `POST` | `/register` | GUEST | Register; sends opaque email verification token |
| `GET` | `/verify?token=` | GUEST | Verify email (HTML response) |
| `POST` | `/login` | GUEST | Login; sets session cookie. Body: `{ email, password }` |
| `POST` | `/validate` | USER | Validate session; returns `{ username, firstName, lastname, role }` |
| `PUT` | `/password` | USER | Change password. Body: `{ oldPassword, newPassword }` |
| `POST` | `/logout` | USER | Revoke JWT and clear cookie |
| `DELETE` | `/` | USER | Delete account |
| `PUT` | `/email` | USER | Change email. Body: `{ email }` |
| `POST` | `/resend` | USER | Resend verification email |

### Profile — `/v1/profile`

| Method | Path | Role | Description |
|--------|------|------|-------------|
| `GET` | `/` | USER | Current user profile |
| `GET` | `/courses` | GUEST | List known courses |
| `POST` | `/course?course=` | USER | Set user course |
| `PUT` | `/img` | USER | Upload profile picture (`multipart/form-data`) |
| `GET` | `/img/{userId}` | — | Get profile picture |
| `PUT` | `/?username=&color=` | USER | Update username and/or color |

### Dashboard — `/v1/dashboard`

| Method | Path | Role | Description |
|--------|------|------|-------------|
| `GET` | `/` | USER | Widget layout |
| `POST` | `/` | USER | Replace widget layout |
| `POST` | `/widget` | USER | Update widget data. Body: `{ id, data }` |

### Lecture — `/v1/lecture`

| Method | Path | Role | Description |
|--------|------|------|-------------|
| `GET` | `/week?weekOffset=&course=&raplaUrl=` | GUEST | Lectures for a week |
| `GET` | `/all?course=` | GUEST | Lecture names for the semester |
| `GET` | `/course?raplaUrl=` | GUEST | Extract/save course from Rapla URL (allowlisted hosts only) |

### Quick Links — `/v1/link`

| Method | Path | Role | Description |
|--------|------|------|-------------|
| `POST` | `/click?linkId=` | GUEST | Record a link click |
| `GET` | `/filter?approved=&pageSize=&continuation=&sortByPopularity=` | GUEST | List links (`approved=false` only for ADMIN) |
| `POST` | `/` | USER | Suggest a link. Body: `{ title, description, url }` |
| `POST` | `/approve` | ADMIN | Approve/reject suggestion |
| `POST` | `/favourite?quickLinkId=&fav=` | USER | Toggle favourite |
| `GET` | `/favourite?pageSize=&continuation=` | USER | List favourites |

### Feedback — `/v1/feedback`

| Method | Path | Role | Description |
|--------|------|------|-------------|
| `POST` | `/` | USER | Submit feedback |
| `GET` | `/?pageSize=&continuation=` | GUEST | Paged feedback |
| `PATCH` | `/rate?id=&upVote=` | USER | Up/downvote |
| `GET` | `/alreadyVoted?id=` | USER | Whether current user voted |
| `DELETE` | `/?id=` | ADMIN | Delete feedback |
| `PATCH` | `/answer` | ADMIN | Answer feedback. Body: `{ id, answer }` |

### Statistics & Tracking

| Method | Path | Role | Description |
|--------|------|------|-------------|
| `POST` | `/track/action?action=` | GUEST | Track an action |
| `GET` | `/stats/userActions` | USER | User actions (7 days) |
| `GET` | `/stats/courseActions` | USER | Course actions (7 days) |
| `GET` | `/stats/globalActions` | GUEST | Global actions (7 days) |
| `GET` | `/stats/userActionSum` | USER | User action sum |
| `GET` | `/stats/courseActionSum` | USER | Course action sum |
| `GET` | `/stats/globalActionSum` | GUEST | Global action sum |

### Admin — `/v1/admin`

| Method | Path | Role | Description |
|--------|------|------|-------------|
| `GET` | `/logs?pageSize=&continuation=` | ADMIN | Security logs (newest first) |
| `GET` | `/users?pageSize=&continuation=` | ADMIN | List users |
| `PUT` | `/users/promote?userId=&role=` | ADMIN | Set role (`USER` or `ADMIN`) |

### Daily — `/v1/daily`

| Method | Path | Role | Description |
|--------|------|------|-------------|
| `GET` | `/cat` | GUEST | Today's cat image (JPEG) |

Paginated endpoints return `{ data: [...], continuation: string | null }`.

---

## Rate Limiting

Limits are enforced per client IP (honors `X-Forwarded-For`) via Redis fixed windows. Exceeding a limit returns **HTTP 429** with error code `01x0000000C`.

| Scope | Limit | Window |
|-------|------:|--------|
| `POST /v1/auth/login` | 10 | 1 minute |
| `POST /v1/auth/register` | 5 | 1 minute |
| `POST /v1/auth/resend` | 3 | 1 minute |
| `GET /v1/auth/verify` | 30 | 1 minute |
| `PUT /v1/auth/password` | 5 | 1 minute |
| `/v1/lecture/**` | 60 | 1 minute |

Redis keys use the prefix `rate:<bucket>:<ip>`.

---

## Roadmap and ToDo's

- [ ] Random Word generator game
- [ ] Integrate Free-Room-Finder from Kai
- [ ] Daily Phrase Rework from v2
- [ ] Daily-Course-Chat Rework from v2 (Encrypted?, RichText, Images, GIFs, Videos?, Files)
- [ ] QuickLink-Favourites and Widget

## Further Ideas

- [ ] 5 Days at DHBW (FNAF) Game