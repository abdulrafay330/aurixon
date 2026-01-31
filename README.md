# Aurixon - Carbon Footprint Calculator for SMEs

Aurixon is a comprehensive carbon footprint calculator designed specifically for Small and Medium Enterprises (SMEs) to meet CSRD (Corporate Sustainability Reporting Directive) requirements.

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- npm or yarn

### 📂 Repository Structure

- `/backend`: Express.js server and PostgreSQL database scripts.
- `/frontend`: React + Vite application.

---

## 🛠️ Setup Instructions

### 1. Database Setup

Aurixon uses PostgreSQL. Follow these steps to set up your local database:

1.  **Create Database**: Create a new database named `aurixon_db` in PostgreSQL.
    ```sql
    CREATE DATABASE aurixon_db;
    ```
2.  **Run Setup Script**: Navigate to the `backend` directory and run the automated setup script. This script will read your `DATABASE_URL` from the `.env` file and execute all necessary SQL files in order.
    ```bash
    cd backend
    npm run db:setup
    ```

    *Note: Ensure you have copied `.env.example` to `.env` and configured your `DATABASE_URL` before running this.*

### 2. Backend Setup

1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Configure Environment Variables:
    - Copy `.env.example` to `.env`.
    - Update `DATABASE_URL` with your local credentials.
    - Set up your [Stripe](https://stripe.com) test keys for the payment flow.
4.  Start the server:
    ```bash
    npm run dev
    ```

### 3. Frontend Setup

1.  Navigate to the frontend directory:
    ```bash
    cd frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Configure Environment Variables:
    - Create a `.env.local` file.
    - Add `VITE_API_BASE_URL=http://localhost:3000/api`.
4.  Start the application:
    ```bash
    npm run dev
    ```

---

## 🔒 Security & Privacy (What NOT to push)

**IMPORTANT**: Never push your `.env` files to GitHub. 

The following are already ignored by `.gitignore`:
- `node_modules/`
- `.env`
- `.env.local`
- `dist/` or `build/`
- Debug logs

If you add new sensitive keys, always add them to `.env` and update `.env.example` with placeholder values instead.

---

## 🚦 Features

- **Activity Management**: Log Scope 1, 2, and 3 activities.
- **Automated Calculation**: Real-time CO2e calculations using EEA/EPA emission factors.
- **Reporting**: Generate CSRD-compliant PDF and CSV reports.
- **Secure Payments**: Integrated Stripe payment flow for report generation.
- **Multi-language Support**: English and German.

---

## 📄 License

[Insert License Here]
