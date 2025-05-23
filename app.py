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
CORS(app, supports_credentials=True, origins=["https://betterlist-7xgp.onrender.com"])


# For SQLAlchemy to work with PostgreSQL on Render,
# it often needs to know about SSL options.
# This ensures a secure connection.
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
    # Relationship to tasks: A user can have many tasks.
    # 'cascade="all, delete-orphan"' means if a user is deleted, their tasks are also deleted.
    tasks = db.relationship('Task', backref='user', lazy=True, cascade="all, delete-orphan")
    # New: Relationship to notes
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
    time_left = db.Column(db.String(20), nullable=True)
    due_date = db.Column(db.DateTime, nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)

    # user_id is a foreign key linking tasks to users
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
            'completedAt': self.completed_at.isoformat() if self.completed_at else None,
            'userId': self.user_id
        }

# New: Note Model
class Note(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    topic = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=True) # Use Text for potentially long notes
    category = db.Column(db.String(80), nullable=True)
    note_date = db.Column(db.DateTime, nullable=False, default=datetime.datetime.now) # Date for the note entry
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.datetime.now)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.datetime.now, onupdate=datetime.datetime.now)

    # user_id is a foreign key linking notes to users
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    def __repr__(self):
        return f'<Note {self.id}: {self.topic} (User: {self.user_id}) - Category: {self.category} - Date: {self.note_date}>'

    def to_dict(self):
        return {
            'id': self.id,
            'topic': self.topic,
            'content': self.content,
            'category': self.category,
            'noteDate': self.note_date.isoformat() if self.note_date else None,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None,
            'userId': self.user_id
        }


# --- Authentication Decorator ---
# This decorator ensures a user is logged in before accessing certain routes.
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
        db.create_all() # This will create tables if they don't exist, and add new columns to existing tables
                        # if they are defined in your models and don't conflict.
    return jsonify({"message": "Database tables created (if they didn't exist)!"}), 200

# --- Authentication Routes ---
@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    # Check if username already exists
    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Username already exists"}), 409 # Conflict

    new_user = User(username=username)
    new_user.set_password(password) # Hash the password
    db.session.add(new_user)
    db.session.commit()

    session['user_id'] = new_user.id # Log in the user automatically after registration
    # Include username in the response for immediate frontend update
    return jsonify({"message": "Registration successful", "userId": new_user.id, "username": new_user.username}), 201

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    user = User.query.filter_by(username=username).first()

    # Check if user exists and password is correct
    if user and user.check_password(password):
        session['user_id'] = user.id # Store user ID in session
        # Include username in the response for immediate frontend update
        return jsonify({"message": "Login successful", "userId": user.id, "username": user.username}), 200
    else:
        return jsonify({"error": "Invalid username or password"}), 401 # Unauthorized

@app.route('/logout', methods=['POST'])
def logout():
    session.pop('user_id', None) # Remove user ID from session
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
@login_required # Ensure user is logged in
def get_tasks():
    user_id = session['user_id']
    tasks = Task.query.filter_by(user_id=user_id).all() # Only fetch tasks for the logged-in user
    return jsonify([task.to_dict() for task in tasks])

@app.route('/tasks', methods=['POST'])
@login_required # Ensure user is logged in
def add_task():
    user_id = session['user_id'] # Get user ID from session
    data = request.get_json()
    new_task = Task(
        name=data['name'],
        category=data.get('category', 'Uncategorized'),
        is_active=True,
        time_left=data.get('timeLeft'), # This field is in model but not heavily used in frontend logic
        user_id=user_id # Assign task to logged-in user
    )
    if 'dueDate' in data and data['dueDate']:
        try:
            # Handle both 'YYYY-MM-DDTHH:MM' and 'YYYY-MM-DDTHH:MM:SS'
            if len(data['dueDate']) == 16:
                new_task.due_date = datetime.datetime.fromisoformat(data['dueDate'] + ":00") # Add seconds
            else:
                new_task.due_date = datetime.datetime.fromisoformat(data['dueDate'])
        except ValueError as e:
            return jsonify({"error": f"Invalid due date format: {e}"}), 400

    db.session.add(new_task)
    db.session.commit()
    return jsonify(new_task.to_dict()), 201

@app.route('/tasks/<int:task_id>', methods=['PUT'])
@login_required # Ensure user is logged in
def update_task(task_id):
    user_id = session['user_id']
    task = db.session.get(Task, task_id)

    # Check if task exists AND belongs to the logged-in user
    if task is None or task.user_id != user_id:
        return jsonify({"error": "Task not found or not authorized"}), 404
    
    data = request.get_json()

    # Update task fields if present in the request data
    if 'name' in data:
        task.name = data['name']
    if 'category' in data:
        task.category = data['category']
    if 'isActive' in data:
        # If task is being marked inactive (completed), set completed_at timestamp
        if data['isActive'] == False and task.is_active == True:
            task.completed_at = datetime.datetime.now()
        # If task is being marked active (uncompleted), clear completed_at timestamp
        elif data['isActive'] == True and task.is_active == False:
            task.completed_at = None
        task.is_active = data['isActive']
    if 'timeLeft' in data:
        task.time_left = data['timeLeft']
    if 'dueDate' in data:
        if data['dueDate']:
            try:
                if len(data['dueDate']) == 16:
                    task.due_date = datetime.datetime.fromisoformat(data['dueDate'] + ":00")
                else:
                    task.due_date = datetime.datetime.fromisoformat(data['dueDate'])
            except ValueError as e:
                return jsonify({"error": f"Invalid due date format: {e}"}), 400
        else: # Allow clearing the due date
            task.due_date = None

    db.session.commit()
    return jsonify(task.to_dict())

@app.route('/tasks/<int:task_id>', methods=['DELETE'])
@login_required # Ensure user is logged in
def delete_task(task_id):
    user_id = session['user_id']
    task = db.session.get(Task, task_id)

    # Check if task exists AND belongs to the logged-in user
    if task is None or task.user_id != user_id:
        return jsonify({"message": "Task not found or not authorized"}), 404
    
    db.session.delete(task)
    db.session.commit()
    return jsonify({"message": "Task deleted successfully"}), 200


# New: Note API Routes (Protected by login_required)
@app.route('/notes', methods=['GET'])
@login_required
def get_notes():
    user_id = session['user_id']
    # Order notes by category and then by note_date (descending for newest first within category)
    notes = Note.query.filter_by(user_id=user_id).order_by(Note.category, Note.note_date.desc()).all()
    return jsonify([note.to_dict() for note in notes])

@app.route('/notes', methods=['POST'])
@login_required
def add_note():
    user_id = session['user_id']
    data = request.get_json()
    
    topic = data.get('topic')
    content = data.get('content')
    category = data.get('category', 'Uncategorized')
    note_date_str = data.get('noteDate')

    if not topic:
        return jsonify({"error": "Note topic is required"}), 400

    note_date = None
    if note_date_str:
        try:
            # Attempt to parse as full datetime, then just date
            note_date = datetime.datetime.fromisoformat(note_date_str)
        except ValueError:
            try:
                note_date = datetime.datetime.strptime(note_date_str, '%Y-%m-%d')
            except ValueError as e:
                return jsonify({"error": f"Invalid note date format: {e}"}), 400
    else:
        note_date = datetime.datetime.now() # Default to current date if not provided

    new_note = Note(
        topic=topic,
        content=content,
        category=category,
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
    if 'category' in data:
        note.category = data['category']
    if 'noteDate' in data:
        if data['noteDate']:
            try:
                note.note_date = datetime.datetime.fromisoformat(data['noteDate'])
            except ValueError:
                try:
                    note.note_date = datetime.datetime.strptime(data['noteDate'], '%Y-%m-%d')
                except ValueError as e:
                    return jsonify({"error": f"Invalid note date format: {e}"}), 400
        else:
            note.note_date = datetime.datetime.now() # Default to current date if cleared
    
    note.updated_at = datetime.datetime.now() # Update timestamp

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
        # For Render, you typically hit /init-db once after deployment.
        db.create_all()

    app.run(debug=True) # Set debug=False for production for security
