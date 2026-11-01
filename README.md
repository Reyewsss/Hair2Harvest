# Hair2Harvest 🌱

A web-based platform for managing hair and fur waste collection, composting, and agricultural research — turning barbershop and salon waste into valuable compost for planting experiments.

---

## Introduction

**Hair2Harvest** is a full-stack web application built on the **MERN stack** (MongoDB, Express.js, React.js, Node.js). It digitizes the entire lifecycle of hair waste — from supplier registration and map-based collection, through composting and laboratory validation, to automated quality assessment and planting experiment monitoring.

The system follows a **modular architecture**, where each objective is implemented as an independent, interchangeable module. This keeps the codebase maintainable, testable, and easy to extend.

## Installation

### Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/) (comes with Node.js)
- [MongoDB](https://www.mongodb.com/try/download/community) (local) or a [MongoDB Atlas](https://www.mongodb.com/atlas) account
- [Git](https://git-scm.com/)

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/hair2harvest.git
cd hair2harvest
```

### 2. Install Dependencies

The project uses separate `client` and `server` folders:

```bash
# Install server dependencies
cd backend
npm install

# Install client dependencies
cd frontend
npm install
```

### 3. Configure Environment Variables

Create a `.env` file inside the `backend` directory:

Sent via Email

> ⚠️ **Never commit your `.env` file.** Use `.env.example` as a template.

### 4. Run the Application

Open two terminals:

```bash
# Terminal 1 — Backend
cd backend
npm run dev

# Terminal 2 — Frontend
cd frontend
npm run dev
```

The app will be available at **http://localhost:5173** and the API at **http://localhost:5001**.

## Documentation

Comprehensive documentation is available in these links:

Folder Structure:
**https://docs.google.com/document/d/1TgiHmYQNPaCFDAIaAa7bddH60Hx96x4wTZAlCEe64hQ/edit?tab=t.0**

System Design:
**https://docs.google.com/document/d/1Bk0wlR-UIuvPVFhNqLxYxaTr2Gsw0OAAVroLuIBwA1k/edit?tab=t.0**
