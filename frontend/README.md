# Wholeness and Grace - Frontend

A HIPAA-compliant therapy homework companion app.

## Tech Stack

- **Framework:** [Next.js](https://nextjs.org) (v16.2.7)
- **Language:** [TypeScript](https://www.typescriptlang.org)
- **Styling:** [Tailwind CSS](https://tailwindcss.com) (v4)
- **Icons:** [Lucide React](https://lucide.dev)

## Getting Started

### Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```
   Update `NEXT_PUBLIC_API_URL` if your backend is running elsewhere.

3. Run the development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) with your browser.

### Production Build

To build the project for production:
```bash
npm run build
```

To start the production server:
```bash
npm start
```

### Docker Deployment

You can run the frontend in a container using the provided `Dockerfile`:
```bash
docker build -t wng-frontend .
docker run -p 3000:3000 wng-frontend
```

## Features

- **Secure Login:** Role-based authentication for Clinicians and Clients.
- **Client Dashboard:** View assigned homework and submit responses.
- **Clinician Dashboard:** Manage clients, assign homework, and review submissions.
- **HIPAA-Ready:** Designed with security and privacy in mind.

## Project Structure

- `src/app`: Next.js App Router pages and API routes.
- `src/components`: Reusable UI components.
- `src/hooks`: Custom React hooks (e.g., `useAuth`).
- `src/lib`: Core libraries (e.g., `api-client`).
- `src/types`: TypeScript type definitions.
