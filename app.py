import os
from flask_migrate import Migrate
from flask import Flask, request, jsonify, render_template, session, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps

# --- Configuration ---
basedir = os.path.abspath(os.path.dirname(__file__))

app = Flask(__name__)

# Use environment variable for database URL, default to SQLite for local development
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///' + os.path.join(basedir, 'tasks.db'))
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
# IMPORTANT: This secret key MUST be set as an environment variable in production (Render)
# In development, you can use a default, but change it for production.
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'a_very_secure_and_random_secret_key_for_flask_sessions_change_this_for_prod!')

db = SQLAlchemy(app)
migrate = Migrate(app, db)

# Configure CORS to allow credentials (cookies for sessions)
# Explicitly allow your Render frontend URL for production.
# For local development, 'http://127.0.0.1:5000' or '*' might be used.
# Make sure this matches your actual deployed frontend URL.
# If your frontend and backend are on *different* Render services, you MUST update this to your frontend URL.
# Example: origins=["https://your-frontend-app.onrender.com"]
CORS(app, supports_credentials=True, origins=["https://betterlist-7xgp.onrender.com"])


# For SQLAlchemy to work with PostgreSQL on Render,
# it often needs to know about SSL options.
# This ensures a secure connection.
# Only apply this if using PostgreSQL. For SQLite, remove or comment out.
if 'postgresql' in app.config['SQLALCHEMY_DATABASE_URI']:
    app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
        "connect_args": {
            "sslmode": "require"
        }
    }

@app.route('/')
def index():
    return render_template('index.html')

# --- Database Models ---

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(533), nullable=False) # Increased length for stronger hashes
    tasks = db.relationship('Task', backref='user', lazy=True, cascade="all, delete-orphan")
    notes = db.relationship('Note', backref='user', lazy=True, cascade="all, delete-orphan")

    def __repr__(self):
        return f'<User {self.username}>'

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    category = db.Column(db.String(80), nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    time_left = db.Column(db.String(20), nullable=True) # Unused in current frontend, can be removed if not needed
    due_date = db.Column(db.DateTime, nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    def __repr__(self):
        return f'<Task {self.id}: {self.name} (User: {self.user_id}) - Active: {self.is_active} - Due: {self.due_date} - Completed: {self.completed_at}>'

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'category': self.category,
            'isActive': self.is_active,
            'timeLeft': self.time_left,
            'dueDate': self.due_date.isoformat() if self.due_date else None,
            # Note: `dueTime` is not stored separately in DB but derived from `dueDate`
            'completedAt': self.completed_at.isoformat() if self.completed_at else None,
            'userId': self.user_id
        }

class Note(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    topic = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=True)
    # Removed 'category' as it's not currently used in the frontend Note modal or display
    # category = db.Column(db.String(80), nullable=True) 
    note_date = db.Column(db.Date, nullable=False, default=datetime.date.today) # Changed to Date for consistency
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.datetime.now)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.datetime.now, onupdate=datetime.datetime.now)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    def __repr__(self):
        return f'<Note {self.id}: {self.topic} (User: {self.user_id}) - Date: {self.note_date}>'

    def to_dict(self):
        return {
            'id': self.id,
            'topic': self.topic,
            'content': self.content,
            # 'category': self.category, # Removed
            'date': self.note_date.isoformat() if self.note_date else None, # Changed key to 'date' for frontend
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None,
            'userId': self.user_id
        }


# --- Authentication Decorator ---
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({"error": "Authentication required"}), 401
        return f(*args, **kwargs)
    return decorated_function


# --- API Routes ---

@app.route('/init-db')
def init_db():
    with app.app_context():
        # IMPORTANT: Uncomment db.drop_all() ONLY if you want to completely reset your database
        # This will DELETE ALL DATA for all tables (User, Task, Note)! Use with extreme caution.
        # db.drop_all()
        db.create_all()
    return jsonify({"message": "Database tables created (if they didn't exist)!"}), 200

# --- Authentication Routes ---
@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Username already exists"}), 409

    new_user = User(username=username)
    new_user.set_password(password)
    db.session.add(new_user)
    db.session.commit()

    session['user_id'] = new_user.id
    return jsonify({"message": "Registration successful", "userId": new_user.id, "username": new_user.username}), 201

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    user = User.query.filter_by(username=username).first()

    if user and user.check_password(password):
        session['user_id'] = user.id
        return jsonify({"message": "Login successful", "userId": user.id, "username": user.username}), 200
    else:
        return jsonify({"error": "Invalid username or password"}), 401

@app.route('/logout', methods=['POST'])
def logout():
    session.pop('user_id', None)
    return jsonify({"message": "Logged out successfully"}), 200

@app.route('/check_auth', methods=['GET'])
def check_auth():
    if 'user_id' in session:
        user = User.query.get(session['user_id'])
        if user:
            return jsonify({"authenticated": True, "userId": user.id, "username": user.username}), 200
    return jsonify({"authenticated": False}), 200


# --- Task API Routes (Protected by login_required) ---

@app.route('/tasks', methods=['GET'])
@login_required
def get_tasks():
    user_id = session['user_id']
    tasks = Task.query.filter_by(user_id=user_id).order_by(Task.due_date.asc(), Task.id.asc()).all()
    return jsonify([task.to_dict() for task in tasks])

@app.route('/tasks', methods=['POST'])
@login_required
def add_task():
    user_id = session['user_id']
    data = request.get_json()
    
    name = data.get('name')
    category = data.get('category', 'Uncategorized')
    due_date_str = data.get('dueDate')
    due_time_str = data.get('dueTime')

    if not name:
        return jsonify({"error": "Task name is required"}), 400

    due_datetime = None
    if due_date_str:
        try:
            # Parse date
            due_date = datetime.datetime.strptime(due_date_str, '%Y-%m-%d').date()
            if due_time_str:
                # Parse time and combine with date
                due_time = datetime.datetime.strptime(due_time_str, '%H:%M').time()
                due_datetime = datetime.datetime.combine(due_date, due_time)
            else:
                # If only date, set time to midnight for consistency
                due_datetime = datetime.datetime.combine(due_date, datetime.time(0, 0))
        except ValueError as e:
            return jsonify({"error": f"Invalid date/time format: {e}"}), 400

    new_task = Task(
        name=name,
        category=category,
        is_active=True,
        due_date=due_datetime,
        user_id=user_id
    )
    db.session.add(new_task)
    db.session.commit()
    return jsonify(new_task.to_dict()), 201

@app.route('/tasks/<int:task_id>', methods=['PUT'])
@login_required
def update_task(task_id):
    user_id = session['user_id']
    task = db.session.get(Task, task_id)

    if task is None or task.user_id != user_id:
        return jsonify({"error": "Task not found or not authorized"}), 404
    
    data = request.get_json()

    if 'name' in data:
        task.name = data['name']
    if 'category' in data:
        task.category = data['category']
    if 'isActive' in data:
        if data['isActive'] == False and task.is_active == True:
            task.completed_at = datetime.datetime.now()
        elif data['isActive'] == True and task.is_active == False:
            task.completed_at = None
        task.is_active = data['isActive']
    
    # Handle combined dueDate and dueTime
    if 'dueDate' in data or 'dueTime' in data:
        new_due_date_str = data.get('dueDate', task.due_date.isoformat().split('T')[0] if task.due_date else None)
        new_due_time_str = data.get('dueTime', task.due_date.strftime('%H:%M') if task.due_date else None)

        if new_due_date_str:
            try:
                parsed_date = datetime.datetime.strptime(new_due_date_str, '%Y-%m-%d').date()
                if new_due_time_str:
                    parsed_time = datetime.datetime.strptime(new_due_time_str, '%H:%M').time()
                    task.due_date = datetime.datetime.combine(parsed_date, parsed_time)
                else:
                    task.due_date = datetime.datetime.combine(parsed_date, datetime.time(0, 0)) # Midnight if no time
            except ValueError as e:
                return jsonify({"error": f"Invalid date/time format: {e}"}), 400
        else:
            task.due_date = None # Allow clearing both date and time

    db.session.commit()
    return jsonify(task.to_dict())

@app.route('/tasks/<int:task_id>', methods=['DELETE'])
@login_required
def delete_task(task_id):
    user_id = session['user_id']
    task = db.session.get(Task, task_id)

    if task is None or task.user_id != user_id:
        return jsonify({"message": "Task not found or not authorized"}), 404
    
    db.session.delete(task)
    db.session.commit()
    return jsonify({"message": "Task deleted successfully"}), 200

@app.route('/streak', methods=['GET'])
@login_required
def get_streak():
    user_id = session['user_id']
    today = datetime.date.today()
    
    # Get all tasks completed by the user, ordered by completion date
    completed_tasks = Task.query.filter_by(
        user_id=user_id,
        is_active=False
    ).filter(Task.completed_at.isnot(None)).order_by(Task.completed_at.asc()).all()

    completed_dates = sorted(list(set([t.completed_at.date() for t in completed_tasks])))

    current_streak = 0
    longest_streak = 0
    last_date = None
    streak_broken = False # Flag to indicate if the streak was broken today or yesterday

    for i, date in enumerate(completed_dates):
        if i == 0:
            current_streak = 1
        elif (date - last_date).days == 1:
            current_streak += 1
        elif (date - last_date).days > 1:
            # Streak broken
            current_streak = 1
        longest_streak = max(longest_streak, current_streak)
        last_date = date

    # Adjust current streak if today or yesterday had activity
    if completed_dates:
        latest_completed_date = completed_dates[-1]
        
        if latest_completed_date == today:
            # Streak continues today
            pass
        elif latest_completed_date == today - datetime.timedelta(days=1):
            # Streak ended yesterday, so current streak might be `longest_streak` up to yesterday
            # but if no tasks completed today, it's considered broken.
            # No, if there were tasks completed yesterday, the streak is `longest_streak`
            # and it's considered broken if nothing today.
            streak_broken = True
        elif latest_completed_date < today - datetime.timedelta(days=1):
            # Streak ended long ago, reset to 0 unless today has completions
            current_streak = 0
            streak_broken = True
    else:
        current_streak = 0
        streak_broken = True

    # If today has no completed tasks and yesterday did, the streak is broken for today.
    # Check if a task was completed today. If not, and there was a streak leading up to yesterday, it's broken.
    tasks_completed_today_count = Task.query.filter_by(
        user_id=user_id,
        is_active=False
    ).filter(
        db.func.date(Task.completed_at) == today
    ).count()

    if tasks_completed_today_count == 0:
        if (today - datetime.timedelta(days=1)) in completed_dates:
            # If yesterday had completions, but today doesn't, streak is broken.
            streak_broken = True
            # The current streak in this scenario should represent the streak *ending yesterday*.
            # We need to re-calculate current_streak ending at yesterday.
            temp_current_streak = 0
            temp_last_date = None
            for date in completed_dates:
                if date > today - datetime.timedelta(days=1): # Stop at yesterday
                    break
                if temp_last_date is None or (date - temp_last_date).days == 1:
                    temp_current_streak += 1
                elif (date - temp_last_date).days > 1:
                    temp_current_streak = 1
                temp_last_date = date
            current_streak = temp_current_streak if temp_last_date else 0
            
        else:
            # No completions today and no completions yesterday, so streak is 0
            current_streak = 0
            streak_broken = True


    return jsonify({
        "current_streak": current_streak,
        "longest_streak": longest_streak,
        "streak_broken": streak_broken
    })


# New: Note API Routes (Protected by login_required)
@app.route('/notes', methods=['GET'])
@login_required
def get_notes():
    user_id = session['user_id']
    # Order notes by note_date (descending for newest first)
    notes = Note.query.filter_by(user_id=user_id).order_by(Note.note_date.desc()).all()
    return jsonify([note.to_dict() for note in notes])

@app.route('/notes', methods=['POST'])
@login_required
def add_note():
    user_id = session['user_id']
    data = request.get_json()
    
    topic = data.get('topic')
    content = data.get('content')
    note_date_str = data.get('date') # Frontend sends 'date' not 'noteDate'

    if not topic:
        return jsonify({"error": "Note topic is required"}), 400
    if not content: # Added content validation
        return jsonify({"error": "Note content is required"}), 400

    note_date = datetime.date.today() # Default to today's date (Python date object)
    if note_date_str:
        try:
            note_date = datetime.date.fromisoformat(note_date_str) # Expects YYYY-MM-DD
        except ValueError as e:
            return jsonify({"error": f"Invalid note date format: {e}"}), 400

    new_note = Note(
        topic=topic,
        content=content,
        note_date=note_date,
        user_id=user_id
    )
    db.session.add(new_note)
    db.session.commit()
    return jsonify(new_note.to_dict()), 201

@app.route('/notes/<int:note_id>', methods=['PUT'])
@login_required
def update_note(note_id):
    user_id = session['user_id']
    note = db.session.get(Note, note_id)

    if note is None or note.user_id != user_id:
        return jsonify({"error": "Note not found or not authorized"}), 404
    
    data = request.get_json()

    if 'topic' in data:
        note.topic = data['topic']
    if 'content' in data:
        note.content = data['content']
    if 'date' in data: # Frontend sends 'date' not 'noteDate'
        if data['date']:
            try:
                note.note_date = datetime.date.fromisoformat(data['date']) # Expects YYYY-MM-DD
            except ValueError as e:
                return jsonify({"error": f"Invalid note date format: {e}"}), 400
        else:
            note.note_date = datetime.date.today() # Default to current date if cleared
    
    note.updated_at = datetime.datetime.now()

    db.session.commit()
    return jsonify(note.to_dict())

@app.route('/notes/<int:note_id>', methods=['DELETE'])
@login_required
def delete_note(note_id):
    user_id = session['user_id']
    note = db.session.get(Note, note_id)

    if note is None or note.user_id != user_id:
        return jsonify({"message": "Note not found or not authorized"}), 404
    
    db.session.delete(note)
    db.session.commit()
    return jsonify({"message": "Note deleted successfully"}), 200


if __name__ == '__main__':
    with app.app_context():
        # This will create tables if they don't exist when running locally.
        # For Render, use 'flask db migrate' and 'flask db upgrade' for schema changes.
        db.create_all()

    app.run(debug=True)