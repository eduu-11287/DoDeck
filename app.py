import os
from flask import Flask, request, jsonify, render_template, session, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps # Import wraps for the decorator

# --- Configuration ---
basedir = os.path.abspath(os.path.dirname(__file__))

app = Flask(__name__)

app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///' + os.path.join(basedir, 'tasks.db'))
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'a_very_secret_key_that_should_be_in_env_in_production') # Use a strong key in production!

db = SQLAlchemy(app)
CORS(app, supports_credentials=True) # Enable CORS with credentials for session cookies

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
    password_hash = db.Column(db.String(128), nullable=False)
    # Relationship to tasks: A user can have many tasks
    tasks = db.relationship('Task', backref='user', lazy=True, cascade="all, delete-orphan")

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
    time_left = db.Column(db.String(20), nullable=True) # This field isn't actively used in frontend logic but is kept
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
            'completedAt': self.completed_at.isoformat() if self.completed_at else None,
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
        # This will DELETE ALL DATA!
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
        return jsonify({"error": "Username already exists"}), 409 # Conflict

    new_user = User(username=username)
    new_user.set_password(password)
    db.session.add(new_user)
    db.session.commit()

    session['user_id'] = new_user.id # Log in the user automatically after registration
    return jsonify({"message": "Registration successful", "userId": new_user.id}), 201

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    user = User.query.filter_by(username=username).first()

    if user and user.check_password(password):
        session['user_id'] = user.id # Store user ID in session
        return jsonify({"message": "Login successful", "userId": user.id}), 200
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
@login_required
def get_tasks():
    user_id = session['user_id']
    tasks = Task.query.filter_by(user_id=user_id).all() # Filter by user ID
    return jsonify([task.to_dict() for task in tasks])

@app.route('/tasks', methods=['POST'])
@login_required
def add_task():
    user_id = session['user_id'] # Get user ID from session
    data = request.get_json()
    new_task = Task(
        name=data['name'],
        category=data.get('category', 'Uncategorized'),
        is_active=True,
        time_left=data.get('timeLeft'),
        user_id=user_id # Assign task to logged-in user
    )
    if 'dueDate' in data and data['dueDate']:
        try:
            if len(data['dueDate']) == 16: # YYYY-MM-DDTHH:MM format
                new_task.due_date = datetime.datetime.fromisoformat(data['dueDate'] + ":00") # Add seconds
            else:
                new_task.due_date = datetime.datetime.fromisoformat(data['dueDate'])
        except ValueError as e:
            return jsonify({"error": f"Invalid due date format: {e}"}), 400

    db.session.add(new_task)
    db.session.commit()
    return jsonify(new_task.to_dict()), 201

@app.route('/tasks/<int:task_id>', methods=['PUT'])
@login_required
def update_task(task_id):
    user_id = session['user_id']
    task = db.session.get(Task, task_id)

    # Check if task exists AND belongs to the logged-in user
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
    if 'timeLeft' in data:
        task.time_left = data['timeLeft']
    if 'dueDate' in data:
        if data['dueDate']:
            try:
                if len(data['dueDate']) == 16: # YYYY-MM-DDTHH:MM format
                    task.due_date = datetime.datetime.fromisoformat(data['dueDate'] + ":00") # Add seconds
                else:
                    task.due_date = datetime.datetime.fromisoformat(data['dueDate'])
            except ValueError as e:
                return jsonify({"error": f"Invalid due date format: {e}"}), 400
        else:
            task.due_date = None

    db.session.commit()
    return jsonify(task.to_dict())

@app.route('/tasks/<int:task_id>', methods=['DELETE'])
@login_required
def delete_task(task_id):
    user_id = session['user_id']
    task = db.session.get(Task, task_id)

    # Check if task exists AND belongs to the logged-in user
    if task is None or task.user_id != user_id:
        return jsonify({"message": "Task not found or not authorized"}), 404
    db.session.delete(task)
    db.session.commit()
    return jsonify({"message": "Task deleted successfully"}), 200


if __name__ == '__main__':
    with app.app_context():
        db.create_all() # This will create tables if they don't exist

    app.run(debug=True) # Set debug=False for production