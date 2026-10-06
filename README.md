# Daymark — Make room for what matters

A calm, focused productivity application for tasks and notes, built with a React + Vite frontend and a Flask backend, containerized with Docker and PostgreSQL.

## Project Structure

```
daymark/
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
- Docker Engine with the Docker Compose plugin on Linux, or Docker Desktop on
  Windows/macOS. Installation instructions are available in Docker's official
  [Docker Desktop guide](https://docs.docker.com/desktop/) and
  [Linux Engine guide](https://docs.docker.com/engine/install/).
- Verify both Docker and Compose are available:

  ```bash
  docker --version
  docker compose version
  ```

  On Windows or macOS, open Docker Desktop and wait until its engine is
  running before starting the project.

### Run with Docker

```bash
docker compose up --build
```

On first run, this builds the frontend and backend images, downloads the
PostgreSQL image, creates the database volume, and starts all three services.
Wait for the startup logs, then open http://localhost:5173. The frontend
proxies API requests to the backend internally. Database migrations run
automatically when the backend starts.

Keep the terminal open to view logs; press `Ctrl+C` to stop the services. To
start them again without rebuilding, run `docker compose up`. Run
`docker compose down` to remove the containers while retaining database data.
To also delete the saved database volume, use `docker compose down -v`.

The Compose setup uses local-development defaults for the database password
and session secret. Before exposing this setup beyond your own machine, set a
strong `SECRET_KEY` environment variable and change the database credentials.

For a database that predates Alembic and was created by the old `run.py`
auto-create flow, take a backup first, then mark the existing schema as the
legacy baseline before applying the new additive migrations:

```bash
docker compose exec server flask --app run.py db stamp 1551bbe550f9
docker compose exec server flask --app run.py db upgrade
```

If that unversioned database already has the task `priority` column and note
`tags` column, but not the new task description/checklist or note-task link
columns, use the matching predecessor revision instead:

```bash
docker compose exec server flask --app run.py db stamp 20261005_note_tags
docker compose exec server flask --app run.py db upgrade
```

The app will be available at:
- Frontend: http://localhost:5173
- Backend API (direct): http://localhost:5134

### Run Locally (without Docker)

#### Backend
```bash
cd server
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Apply the committed schema and start the server
flask --app run.py db upgrade
python run.py
```

For a pre-existing, unversioned local database, back it up and use
`flask --app run.py db stamp 1551bbe550f9` before `flask --app run.py db upgrade`.
If it already contains task priorities and note tags, stamp
`20261005_note_tags` before upgrading.

#### Frontend
```bash
cd client
npm install
cp .env.example .env
npm run dev
```

## Features

- **Task Management**: Create, edit, delete, and complete prioritized tasks with due dates, descriptions, and checklists
- **Custom date and time pickers**: Responsive, app-styled controls for task deadlines and note dates
- **Notes**: Add, edit, search, tag, and organize notes by date; optionally link a note to a task
- **Streak Tracking**: Monitor daily productivity streaks
- **Calendar**: Monthly task calendar with selected-day details and links to task details
- **Insights**: Review task completion trends across 7-, 30-, and 90-day periods
- **PDF Export**: Download all notes as a formatted PDF
- **Responsive Design**: Works on desktop and mobile
- **Installable PWA**: Install Daymark and view the last saved account snapshot offline in read-only mode. The snapshot is kept in this browser's local storage and removed when you sign out.

## Tech Stack

- **Frontend**: React 18 + Vite 8 + Tailwind CSS 4 (Vite plugin)
- **Backend**: Flask 2.3 + SQLAlchemy + Flask-Migrate
- **Database**: PostgreSQL 15 (Docker) / SQLite (local dev)
- **Authentication**: Flask session-based
- **PDF Generation**: fpdf2
- **Deployment**: Docker Compose + Gunicorn + Nginx

The client is transitioning from its legacy component stylesheet to Tailwind
utilities. Arctic Aurora tokens are defined in the Tailwind theme, and the
shared dropdowns and task filters now use Tailwind utilities; remaining
component styling is still in `client/src/index.css` while it is migrated.

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

### Progressive Web App

The production client includes a web app manifest and a service worker that
pre-caches the app shell and built JavaScript/CSS assets. Serve it over HTTPS
or localhost to enable installation. The service worker deliberately does not
cache API responses; sign-in, tasks, and notes require a network connection.
Open the avatar menu and choose **Install Daymark** to install the app. If the
browser does not provide an install prompt, Daymark explains where to find the
browser's install or Add to Home Screen option.

### Backend
```bash
cd server
flask --app run.py db upgrade
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
