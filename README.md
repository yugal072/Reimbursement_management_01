# 📄 Advanced Reimbursement Management System

![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)
![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)
![SQLite](https://img.shields.io/badge/sqlite-%2307405e.svg?style=for-the-badge&logo=sqlite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)

A full-stack, enterprise-grade Expense & Reimbursement Management platform engineered to streamline the filing, parsing, and multi-tier approval of corporate expenses. The system drastically reduces manual overhead by introducing automated OCR receipt parsing, real-time foreign currency conversions, and highly dynamic approval routing flows.

---

## ✨ Key Features

- **🔐 Role-Based Access Control (RBAC)**: Distinct permissions and views for Employees, Managers, and System Admins.
- **🧾 Client-Side OCR WebAssembly**: Drags & drops receipts to intelligently parse Date, Merchant, and Totals locally using `Tesseract.js` without exposing sensitive receipt images to third-party endpoints.
- **💱 Live Currency Conversion**: Automatically detects foreign currencies and standardizes expense amounts to the company's base currency using real-time FreeCurrencyAPI exchange rates.
- **🔀 Dynamic Approval Engines**: Admins can visually build multi-step approval flows with complex logical rules (`ALL`, `PERCENTAGE`, `SPECIFIC_KEY_APPROVER`, `HYBRID`).
- **🛡️ Manager Gate Protection**: Direct managers always review and bless their direct reports' expenses before they ever enter the broader global finance queue.
- **⚡ Optimistic UI**: Powered by Zustand and TanStack React Query for snappy, instant UI mutations without relying on constant page reloading.
- **🎨 Premium Dark UI**: Crafted with Tailwind CSS, utilizing glassmorphism, contextual gradients, and micro-animations for an elevated user experience.

---

## 🛠️ Architecture & Tech Stack

The workspace is organized into a mono-repo structure with specialized environments for the client and server.

### Frontend (`/frontend`)
- **Core Engine**: React 18 & Vite 5
- **Type Safety**: strict TypeScript
- **Styling**: Tailwind CSS v3 & Lucide Icons
- **State Management**: Zustand (Persisted Auth Store) & TanStack React Query (API Cache)
- **Routing**: React Router DOM (v6)
- **HTTP Client**: Axios with JWT Interceptors
- **OCR Engine**: Tesseract.js (WASM)

### Backend (`/backend`)
- **Runtime**: Node.js & Express
- **Language**: TypeScript
- **ORM & Database**: Prisma ORM bridging into a zero-config local **SQLite** Database
- **Authentication**: JWT (JSON Web Tokens) & bcryptjs Password Hashing
- **File Storage**: Custom Local Static Storage Directory (`/uploads/receipts`)
- **Integrations**: FreeCurrencyAPI (External Exchange Rates)

---

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running intimately on your local machine for development and testing.

### Prerequisites
- Node.js (v20+ recommended)
- Check that port `4000` (Backend) and `5173` (Frontend) are available.

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd Reimbursement-Management
```

### 2. Backend Setup
Configure your database and fire up the Node API.

```bash
cd backend

# Install dependencies
npm install

# Initialize your environment variables
cp .env.example .env
```

Ensure your `.env` contains the following essential configurations:

```env
# /backend/.env
PORT=4000
DATABASE_URL="file:./dev.db"
JWT_SECRET="your_hyper_secure_jwt_secret_key"
EXCHANGE_RATE_API_KEY="your_freecurrencyapi_key_here" # Get from app.freecurrencyapi.com
```

Now, initialize your SQLite database and start the server:

```bash
# Push Prisma schema to create SQLite dev.db
npx prisma db push

# Start the Nodemon development server
npm run dev
```

### 3. Frontend Setup
In a **new fresh terminal window**, spin up the Vite React application.

```bash
cd frontend

# Install dependencies
npm install

# Initialize your environment variables
cp .env.example .env
```

Ensure your frontend `.env` is simply pointing to your backend:
```env
# /frontend/.env
VITE_API_BASE_URL=http://localhost:4000/api
```

Start the Vite server:
```bash
npm run dev
```

### 4. Experience the Application
1. Navigate to [http://localhost:5173](http://localhost:5173) in your browser.
2. Click **Create one for free** to register as an **Admin** user and bootstrap your company database.
3. Access the **Users** and **Approval Flows** tabs to build your team and configure routing logic.
4. Go ahead and submit an expense to see the entire lifecycle in action!

---

## 🔒 Security Practices Configured
- Password securely hashed utilizing `bcryptjs` with robust salting (12 rounds).
- Auth Tokens signed via `jsonwebtoken` natively.
- Custom Express error boundary middleware strictly prevents internal server paths/stacktraces from leaking into client responses in production.

## 🤝 Contribution Guidelines
This project heavily relies on TypeScript's compilation capabilities. Please ensure you do not forcefully cast types (`as any`) unless absolutely necessary, and always verify with `npm run typecheck` inside the frontend directory before committing to guarantee `verbatimModuleSyntax` compatibility.
