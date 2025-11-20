src/
├── .gitkeep
├── .github/
│   └── workflows/
│       └── ci-cd.yml
│
├── apps/
│   └── web/                         # Next.js (App Router) – VIEW layer
│       ├── middleware.ts
│       ├── next-env.d.ts
│       ├── app/
│       │   ├── globals.css
│       │   ├── layout.tsx           # Root layout (shell)
│       │   ├── page.tsx             # Dashboard overview (Tổng quan)
│       │   ├── login/
│       │   │   └── page.tsx
│       │   ├── register/
│       │   │   └── page.tsx
│       │   └── exams/
│       │       ├── page.tsx         # List exams / vào thi
│       │       └── [examId]/
│       │           └── page.tsx     # Exam detail / doing test
│       │
│       ├── features/                # Frontend by feature (calls backend API)
│       │   ├── auth/
│       │   │   ├── api.ts           # login/register/logout → services/api
│       │   │   ├── hooks.ts         # useLogin, useCurrentUser, ...
│       │   │   └── components/
│       │   │       ├── LoginForm.tsx
│       │   │       └── RegisterForm.tsx
│       │   ├── exams/
│       │   │   ├── api.ts           # listExams, startAttempt, finishAttempt
│       │   │   ├── hooks.ts
│       │   │   └── components/
│       │   │       ├── ExamCard.tsx
│       │   │       ├── QuestionList.tsx
│       │   │       └── ResultSummary.tsx
│       │   └── leaderboard/
│       │       ├── api.ts           # fetch ranking data
│       │       └── components/
│       │           └── LeaderboardTable.tsx
│       │
│       ├── components/
│       │   └── layout/
│       │       ├── Sidebar.tsx
│       │       ├── Header.tsx
│       │       └── MainLayout.tsx   # wrap dashboard sections
│       │
│       ├── lib/
│       │   ├── http.ts              # fetch/axios wrapper → services/api
│       │   └── validations/
│       │       ├── auth.ts          # zod/yup schemas (FE side)
│       │       └── exam.ts
│       │
│       └── public/
│           └── assets/
│               └── logos/           # used by page.tsx (hero, sidebar, etc.)
│                   ├── app-logo.svg
│                   ├── hero-illustration.svg
│                   ├── support-illustration.svg
│                   ├── icon-search.svg
│                   ├── icon-trophy.svg
│                   └── avatar-default.png
│
├── packages/
│   ├── config/
│   │   └── src/
│   │       └── index.ts             # shared config/constants
│   ├── types/
│   │   └── src/
│   │       ├── user.ts              # User, Role, ...
│   │       ├── exam.ts              # Exam, Question, Attempt, ...
│   │       └── auth.ts              # Auth-related DTOs & types
│   └── ui/
│       └── src/
│           ├── Button.tsx
│           ├── Card.tsx
│           ├── Input.tsx
│           └── index.ts             # export all shared UI components
│
├── prisma/
│   └── schema.prisma                # single source of truth for DB models
│
└── services/
    ├── api/                         # Node backend – MVC + services
    │   └── src/
    │       ├── config/
    │       │   ├── env.ts           # read .env, config values
    │       │   └── db.ts            # PrismaClient, Redis client (if any)
    │       │
    │       ├── models/              # domain models/types (optional)
    │       │   ├── user.model.ts
    │       │   ├── exam.model.ts
    │       │   └── attempt.model.ts
    │       │
    │       ├── repositories/        # LOW-LEVEL: only talk to Prisma
    │       │   ├── user.repository.ts
    │       │   ├── exam.repository.ts
    │       │   └── attempt.repository.ts
    │       │
    │       ├── services/            # BUSINESS LOGIC
    │       │   ├── auth.service.ts
    │       │   ├── exam.service.ts
    │       │   ├── attempt.service.ts
    │       │   ├── ranking.service.ts
    │       │   └── algorithm.service.ts   # call Python/ML scoring service
    │       │
    │       ├── controllers/         # HTTP controllers (C in MVC)
    │       │   ├── auth.controller.ts
    │       │   ├── exam.controller.ts
    │       │   ├── attempt.controller.ts
    │       │   └── health.controller.ts
    │       │
    │       ├── routes/              # Map URL → controller
    │       │   ├── auth.routes.ts
    │       │   ├── exam.routes.ts
    │       │   ├── attempt.routes.ts
    │       │   └── index.ts         # combine routes into main router
    │       │
    │       ├── middlewares/
    │       │   ├── auth.middleware.ts
    │       │   ├── error.middleware.ts
    │       │   └── validation.middleware.ts
    │       │
    │       ├── dtos/                # Request/response schemas (BE side)
    │       │   ├── auth.dto.ts
    │       │   └── exam.dto.ts
    │       │
    │       ├── utils/
    │       │   └── http-error.ts
    │       │
    │       ├── server.ts            # createServer(): init Express/Fastify
    │       └── index.ts             # entrypoint for API service (Docker)
    │
    └── worker/                      # background jobs / async processing
        └── src/
            ├── example.worker.ts
            └── index.ts

