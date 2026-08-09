# ⚡ SnapLink

SnapLink is a full-stack, developer-focused URL shortener with JWT authentication, real-time click analytics, rate limiting, and expiry control.

This repository is structured for separate deployment:
- **Backend API (Flask + MongoDB)** → Deployed on **Render**
- **Frontend Web App (HTML/CSS/JS)** → Deployed on **Vercel**

---

## 📁 Repository Structure

```
SnapLink/
├── backend/                  # Flask REST API & Shortener logic
│   ├── app.py                # Flask app factory, CORS, health check
│   ├── extensions.py         # PyMongo & JWT extensions
│   ├── routes/               # API routes (auth, links, analytics, redirect)
│   ├── requirements.txt      # Python dependencies (gunicorn, flask-cors)
│   ├── Procfile              # Render start command
│   ├── render.yaml           # Render Blueprint configuration
│   └── .env.example          # Backend environment variables template
│
├── frontend/                 # Static web application
│   ├── index.html            # Landing page & shortener
│   ├── auth.html             # Login & register page
│   ├── dashboard.html        # Dashboard & analytics modal
│   ├── css/                  # Stylesheets (index.css, auth.css, dashboard.css)
│   ├── js/                   # Frontend scripts
│   │   ├── config.js         # API Base URL configuration
│   │   ├── index.js          # Landing page logic
│   │   ├── auth.js           # Authentication logic
│   │   └── dashboard.js      # Dashboard & table logic
│   └── vercel.json           # Vercel deployment configuration
│
├── .gitignore
└── README.md
```

---

## 🚀 Deployment Instructions

### 1️⃣ Deploying Backend to Render

1. Go to [Render Dashboard](https://dashboard.render.com/) and click **New +** -> **Web Service**.
2. Connect your GitHub repository (`MananPathak02/SnapLink`).
3. Configure the Web Service settings:
   - **Name**: `snaplink-backend` (or your preferred name)
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app`
4. Add Environment Variables in Render:
   - `MONGO_URI`: Your MongoDB connection string (e.g., `mongodb+srv://user:pass@cluster.mongodb.net/snaplink?retryWrites=true&w=majority`)
   - `JWT_SECRET_KEY`: A secure random string for signing JWT tokens.
5. Deploy the service and copy your live Render URL (e.g. `https://snaplink-backend.onrender.com`).

---

### 2️⃣ Deploying Frontend to Vercel

1. Open `frontend/js/config.js` and set `renderProductionUrl` to your live Render backend URL:
   ```javascript
   const renderProductionUrl = 'https://snaplink-backend.onrender.com';
   ```
2. Go to [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New...** -> **Project**.
3. Import your GitHub repository (`MananPathak02/SnapLink`).
4. In Project Settings:
   - **Root Directory**: Select `frontend`
   - **Framework Preset**: `Other` (Vercel automatically serves static HTML/CSS/JS)
5. Click **Deploy**.

---

## 💻 Local Development Setup

### 1. Run Backend locally
```bash
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
# source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env   # Update MONGO_URI & JWT_SECRET_KEY in .env
python app.py
```
*Backend runs at `http://127.0.0.1:5000`*

### 2. Run Frontend locally
Open `frontend/index.html` in your browser, or serve using any HTTP server:
```bash
cd frontend
python -m http.server 8000
```
*`config.js` automatically detects `localhost` and routes API calls to `http://127.0.0.1:5000`.*

---

## 🛠️ API Routes

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Health check endpoint | No |
| `POST` | `/auth/register` | Create a new user account | No |
| `POST` | `/auth/login` | Login and receive JWT access token | No |
| `POST` | `/links/shorten` | Create a shortened URL | Yes (Bearer Token) |
| `GET` | `/links/` | List user's shortened links | Yes (Bearer Token) |
| `DELETE` | `/links/<code>` | Delete a shortened link | Yes (Bearer Token) |
| `GET` | `/analytics/<code>` | Link click statistics & analytics | Yes (Bearer Token) |
| `GET` | `/<code>` | Redirect to original long URL (301) | No |

---

## 📄 License
MIT License. Built by [Manan Pathak](https://github.com/MananPathak02).
