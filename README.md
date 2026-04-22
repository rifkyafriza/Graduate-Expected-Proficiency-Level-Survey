# Graduate Expected Proficiency Level Survey

This is a web application designed to collect surveys on graduate proficiency levels, specifically targeting alumni, users of graduates (employers), and lecturers. 

## Structure

The repository is organized into two main parts:
- `webapp/`: The React frontend application (Vite).
- `backend/`: The Express Node.js backend.

## Prerequisites

- Node.js (v18 or higher recommended)
- npm

## Setup & Running Locally

### 1. Web App (Frontend)

Navigate to the `webapp` directory:
```bash
cd webapp
npm install
npm run dev
```
The frontend will start at `http://localhost:5173`.

### 2. Backend

Navigate to the `backend` directory:
```bash
cd backend
npm install
node server.js
```
The backend will start at `http://localhost:3001`.

## Future Improvements
- Migration to Supabase as the primary database for better cloud storage and real-time capabilities.
