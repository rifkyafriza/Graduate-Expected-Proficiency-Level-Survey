<div align="center">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E" alt="Vite" />
  <img src="https://img.shields.io/badge/Supabase-181818?style=for-the-badge&logo=supabase&logoColor=3ECF8E" alt="Supabase" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
</div>

<h1 align="center">🎓 Graduate Expected Proficiency Level Survey</h1>

<p align="center">
  A modern, responsive web application designed to collect and evaluate graduate proficiency levels across <b>Alumni</b>, <b>Users of Graduates (Employers)</b>, and <b>Lecturers</b>. Built for high performance, intuitive user experience, and seamless data collection.
</p>

---

## ✨ Features

- **🎯 Targeted Modules:** Custom survey paths tailored for Alumni (P1), Employers (P2), and Lecturers (P3).
- **📱 Responsive UI/UX:** Mobile-first design, optimized tables, and intelligent navigation for complex matrices.
- **⚡ Fast & Lightweight:** Built with React + Vite for lightning-fast performance.
- **☁️ Cloud Database:** Real-time data sync, secure storage, and easy exporting via **Supabase**.
- **🚦 Smart Validation:** Form-level validation with intelligent auto-scrolling to incomplete fields.

## 🏗️ Project Structure

This repository contains two primary components:

### 1. `webapp/` (Production Frontend)
The main client application. It is a fully static Single Page Application (SPA) that connects directly to Supabase.
- **Tech Stack:** React, TypeScript, Vite, CSS.
- **Deployment:** Vercel (CI/CD automated).

### 2. `backend/` (Local / Legacy Support)
> ⚠️ **Note:** The `backend` directory is kept **for local deployment and GitHub archival purposes only**. 
The production application relies exclusively on Supabase for data management. This folder contains a legacy Express/Node.js REST API and SQLite database that can be used if offline local testing is required without Supabase.

## 🚀 Quick Start (Frontend)

To run the main web application locally with Supabase integration:

```bash
# Navigate to the frontend directory
cd webapp

# Install dependencies
npm install

# Start the development server
npm run dev
```

The application will be available at `http://localhost:5173`.

## ⚙️ Local Backend (Optional)

If you need to run the legacy local API (SQLite + Node.js) for testing purposes:

```bash
# Navigate to the backend directory
cd backend

# Install dependencies
npm install

# Initialize the SQLite database
node init_db.js

# Start the local server
node server.js
```

The local API will start at `http://localhost:3001`.

## 📊 Database Schema (Supabase)

The production Supabase PostgreSQL database uses the `surveys` table storing responses dynamically in flat columns or JSONB, alongside core identity metrics.

---
<p align="center">
  <i>Developed for comprehensive academic and professional competency evaluation.</i>
</p>
