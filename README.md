## Project Setup

Install dependencies:

```bash
npm install
```

---

## Running the Project

### Development

```bash
npm run start
```

### Watch Mode (auto-reload)

```bash
npm run start:dev
```

### Production

```bash
npm run start:prod
```

---

## Linting & Formatting

### Lint

```bash
npm run lint
```

### Format

```bash
npm run format
```

### Format & Lint

```bash
npm run lint:format
```

---

## Pre-commit Hooks

- Husky runs `lint-staged` on staged files automatically
- Ensures commits are formatted and linted
- Commit messages are validated with Commitlint

---

## Environment Variables

- Copy `.env.example` to `.env` and fill in required values

---

## Notes

- All `@/*` path imports are supported via `tsconfig` + Jest config
