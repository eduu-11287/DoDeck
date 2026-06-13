# DoDeck - Professional Todo & Notes App

A modern productivity application built with a React + Vite frontend and a Flask backend, containerized with Docker and PostgreSQL.

## Project Structure

```
dodeck/
├── client/              # React + Vite frontend
│   ├── src/
│   │   ├── api.js       # API client
│   │   ├── App.jsx      # Main app component
│   │   ├── components/  # React components
│   │   └── index.css    # All styles
│   ├── Dockerfile       # Multi-stage: Node build + nginx serve
│   └── package.json
├── server/              # Flask backend
│   ├── app/
│   │   ├── __init__.py  # App factory
│   │   ├── config.py    # Environment configs
│   │   ├── models/      # SQLAlchemy models
│   │   ├── routes/      # API blueprints
│   │   └── utils/       # Helpers, decorators
│   ├── migrations/      # Alembic migrations
│   ├── run.py           # Entry point
│   └── requirements.txt
├── docker-compose.yml
└── README.md
```

## Quick Start

### Prerequisites
- Docker and Docker Compose installed

### Run with Docker

```bash
# Copy environment files
cp server/.env.example server/.env
cp client/.env.example client/.env

# Start all services
docker-compose up --build

# Run database migrations
docker-compose exec server flask db upgrade
```

The app will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5134

### Run Locally (without Docker)

#### Backend
```bash
cd server
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Initialize database (first time only)
python run.py  # Creates tables and starts server on :5134
```

In a second terminal, generate initial migration:
```bash
cd server
flask db init
flask db migrate -m "Initial migration"
flask db upgrade
```

#### Frontend
```bash
cd client
npm install
cp .env.example .env
npm run dev
```

## Features

- **Task Management**: Create, edit, delete, and complete tasks with due dates
- **Notes**: Add, edit, and organize notes by date
- **Streak Tracking**: Monitor daily productivity streaks
- **Calendar & Clock**: Built-in calendar view and digital clock
- **PDF Export**: Download all notes as a formatted PDF
- **Responsive Design**: Works on desktop and mobile

## Tech Stack

- **Frontend**: React 18 + Vite 5
- **Backend**: Flask 2.3 + SQLAlchemy + Flask-Migrate
- **Database**: PostgreSQL 15 (Docker) / SQLite (local dev)
- **Authentication**: Flask session-based
- **PDF Generation**: fpdf2
- **Deployment**: Docker Compose + Gunicorn + Nginx

## Environment Variables

### Server (.env)
| Variable | Description | Default |
|----------|-------------|---------|
| `FLASK_CONFIG` | Config class | `development` |
| `SECRET_KEY` | Flask secret key | *(required in prod)* |
| `DATABASE_URL` | Database connection | `sqlite:///tasks.db` |
| `CORS_ORIGINS` | Allowed CORS origins | `http://localhost:5173` |
| `PORT` | Server port | `5134` |

### Client (.env)
| Variable | Description |
|----------|-------------|
| `VITE_API_BASE` | Backend API URL | `http://localhost:5134` |

## Development

### Backend
```bash
cd server
flask db migrate -m "description"
flask db upgrade
```

### Frontend
```bash
cd client
npm run dev      # Start dev server on :5173
npm run build    # Production build
npm run preview  # Preview production build
```

## Troubleshooting

**CORS errors in dev**: Make sure `VITE_API_BASE=http://localhost:5134` is set in `client/.env`

**Migration errors**: Apply migrations with `flask db upgrade` inside the server container

**Port conflicts**: Change ports in `docker-compose.yml` if 5173 or 5134 are in use

## License

MIT
