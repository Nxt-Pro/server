<div align="center">

# NxtPro — Backend Services & API Engine

**Core backend REST API, asynchronous queue worker, and real-time communication services for the NxtPro talent scouting platform[cite: 2].**

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=flat-square&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=flat-square&logo=redis&logoColor=white)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=flat-square&logo=socketdotio&logoColor=white)](https://socket.io/)

</div>

---

## 📌 Overview

**NxtPro** bridges the gap between undiscovered athletic talent and professional football clubs/scouts[cite: 2]. This repository houses the core monolith backend that coordinates user authentication, data management, direct scout-player messaging, and an asynchronous pipeline to orchestrate video processing across downstream AI computer vision microservices[cite: 2].

---

## 🏗 System Architecture

<div align="center">
  <img src="https://github.com/user-attachments/assets/fd3e97d1-5fd6-42f2-86bb-8d84137c8344" alt="NxtPro System Architecture" width="100%" style="border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);" />
</div>

---

## ✨ Core Capabilities

* **Role-Based Authentication:** JWT-driven access control isolating athlete profiles, talent scouts, and platform administrators[cite: 2].
* **Asynchronous Queue Workers:** Uses **Redis** and **BullMQ** to process high-load video uploads asynchronously, offloading evaluation jobs to Python AI microservices without blocking user traffic[cite: 2].
* **Real-Time Communication:** Direct bidirectional messaging between scouts and players powered by **Socket.io**, paired with **Firebase Cloud Messaging (FCM)** for background push notifications[cite: 2].
* **Relational Data Modeling:** Normalized database schema managed via **TypeORM** and **PostgreSQL** supporting multi-criteria player filtering and scouting metrics[cite: 2].

---

## 🛠 Tech Stack

| Domain | Technologies |
| :--- | :--- |
| **Framework & Runtime** | Node.js, NestJS, TypeScript[cite: 2] |
| **Database & ORM** | PostgreSQL, TypeORM[cite: 2] |
| **Caching & Queues** | Redis, BullMQ[cite: 2] |
| **Real-Time & Alerts** | Socket.io, Firebase Admin SDK (FCM)[cite: 2] |
| **Security & Auth** | Passport.js, JWT, Bcrypt[cite: 2] |
| **DevOps & Containers** | Docker, Docker Compose |
| **Quality & Tooling** | Jest, ESLint, Prettier, Husky, Commitlint |

---

## 📂 Project Structure

```text
server/
├── src/
│   ├── modules/          # Domain feature modules (auth, users, scouting, media, chat)
│   ├── common/           # Shared guards, decorators, interceptors, and filters
│   ├── config/           # App, database, and Redis environment configurations
│   ├── database/         # TypeORM entity definitions, migrations, and seeders
│   ├── jobs/             # BullMQ queue processors and asynchronous workers
│   └── main.ts           # Application entrypoint
├── test/                 # Integration and end-to-end (e2e) test suites
├── docker-compose.yml    # Container orchestration for local development
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed locally:
* [Node.js](https://nodejs.org/) (v18 or higher)
* [Docker](https://www.docker.com/) & Docker Compose
* [Git](https://git-scm.com/)

---

### Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/Nxt-Pro/server.git](https://github.com/Nxt-Pro/server.git)
   cd server
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   Open `.env` and fill in your database credentials, Redis configuration, and JWT keys.

3. **Install dependencies:**
   ```bash
   npm install
   ```

---

### 💻 Running the Application

#### Option A: Docker Compose (Recommended)
Spins up the NestJS API, PostgreSQL, and Redis instances simultaneously:
```bash
docker-compose up -d
```

#### Option B: Local Execution
Ensure local instances of PostgreSQL and Redis are running, then run:
```bash
# Watch mode for development
npm run start:dev

# Production build
npm run build
npm run start:prod
```

---

## 🧪 Testing & Code Quality

```bash
# Run unit tests
npm run test

# Run end-to-end tests
npm run test:e2e

# Run linter and formatting checks
npm run lint
npm run format
```
