# Skylark BI Agent — Monday.com Executive Intelligence Pipeline

[![Live Prototype](https://img.shields.io/badge/Live%20Prototype-http%3A%2F%2F13.233.54.120-blue)](http://13.233.54.120)
[![Author](https://img.shields.io/badge/Author-Sathvik%20Vasishta-green)](#)

## 1. Project Overview

Skylark BI Agent is a production-oriented executive intelligence layer for Skylark Drones that connects live sales and operations data from Monday.com with LLM-driven analysis. It bridges pipeline velocity from 346 active deals with execution capacity from 176 work orders, translating raw board data into concise, leadership-ready insights for revenue, throughput, bottlenecks, and conversion health.

The platform uses a read-only Monday.com GraphQL API v2 integration to fetch live board data, runs a Node.js pre-aggregation and cleaning layer to reduce token costs and normalize inconsistent schema values, and then routes requests through an LLM gateway that prioritizes Gemini 2.5 Flash with automatic fallback to Groq Llama-3.3-70b.

## 2. Key Features

- Dynamic Monday.com GraphQL querying with read-only, live API integration
- Multi-model LLM gateway with Gemini 2.5 Flash and automatic failover to Groq Llama-3.3-70b
- Resilient pre-aggregation engine that cleans unpopulated fields, coerces types, and compresses payloads to avoid token-limit issues
- Interactive visualizations rendered conditionally from parsed chart JSON via Recharts
- Transparent data caveats that communicate schema irregularities and field quality issues to leadership

## 3. Tech Stack

- Frontend: React (Vite), Recharts, Lucide React, Axios
- Backend: Node.js, Express, PM2, Nginx
- Database: MongoDB Community Edition (Local)
- API Integrations: Monday.com GraphQL API v2, Groq API, Google Gemini API

## 4. Architecture Diagram

```text
React Client (Vite)
        │
        ▼
   Nginx Reverse Proxy
        │
        ▼
Express Server (Port 5000)
        │
        ▼
Node.js Aggregation Engine
        ├─ Monday.com GraphQL API v2
        ├─ Groq AI API
        └─ Local MongoDB
```

## 5. Environment Setup & Configuration

Create a file named .env inside the server directory with the following values:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/skylark_bi
GEMINI_API_KEY=<key>
GROQ_API_KEY=<key>
MONDAY_API_KEY=<key>
DEALS_BOARD_ID=5030483855
WORK_ORDERS_BOARD_ID=5030483898
```

Notes:
- The backend will still start if MongoDB is unavailable, but persistence will fall back to in-memory behavior.
- Ensure your Monday.com API token has access to the relevant boards and that the board IDs match your workspace configuration.

## 6. Local Installation & Running Guide

### Backend

```bash
cd server
npm install
npx nodemon server.js
```

The backend will run at:

```text
http://localhost:5000
```

### Frontend

```bash
cd client
npm install
npm run dev
```

The frontend will run at:

```text
http://localhost:5173
```

## 7. Deployment Architecture

The production deployment is designed as a single-instance AWS EC2 environment with:

- Nginx acting as a reverse proxy on port 80
- PM2 managing the Express service for process stability and automatic restarts
- The backend exposing the API internally on port 5000 while Nginx handles external traffic
- Local MongoDB Community Edition for persistent chat and operational history storage

This architecture keeps the stack simple, cost-effective, and reliable for a prototype-to-production transition while preserving a clear separation between the React UI, Express API, and AI/data integration layer.
📄 **Decision Log:** [Download Executive Decision Log (PDF)](./Skylark_assessment_sathvik.pdf)
🌐 **Live Prototype:** [http://13.233.54.120](http://13.233.54.120)