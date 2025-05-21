import os
from flask_migrate import Migrate
from flask import Flask, request, jsonify, render_template, session, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps # Import wraps for the decorator
import json # Import json for parsing LLM response
import requests # Import requests for making HTTP calls

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
        # This will DELETE ALL DATA for all tables (User, Task)! Use with extreme caution.
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

# --- New AI Brainstormer Endpoint ---
@app.route('/ai-brainstorm', methods=['POST'])
@login_required # Ensure user is logged in
def ai_brainstorm():
    data = request.get_json()
    main_task = data.get('mainTask')

    if not main_task:
        app.logger.error("AI Brainstorm: No main task provided.")
        return jsonify({"error": "Main task is required for brainstorming"}), 400

    try:
        # Construct the prompt for the LLM
        prompt = f"""Given the main task '{main_task}', break it down into 5-7 smaller, actionable sub-tasks.
        Provide the output as a JSON object with a single key 'sub_tasks' which is an array of strings.
        Example:
        {{
          "sub_tasks": [
            "Sub-task 1",
            "Sub-task 2",
            "Sub-task 3"
          ]
        }}
        """

        # Prepare the payload for the Gemini API call
        payload = {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {
                "responseMimeType": "application/json",
                "responseSchema": {
                    "type": "OBJECT",
                    "properties": {
                        "sub_tasks": {
                            "type": "ARRAY",
                            "items": {"type": "STRING"}
                        }
                    },
                    "required": ["sub_tasks"]
                }
            }
        }

        # The API key is automatically provided by the Canvas environment if left empty.
        api_key = ""
        api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"

        app.logger.info(f"AI Brainstorm: Calling Gemini API with prompt: {main_task}")
        # Make the fetch call to the Gemini API
        response = requests.post(api_url, json=payload, timeout=30) # Added a timeout for the request
        response.raise_for_status() # Raise an exception for HTTP errors (4xx or 5xx)

        result = response.json()
        app.logger.info(f"AI Brainstorm: Received raw LLM response: {json.dumps(result)}")

        llm_text_response = None # Initialize to None
        # Parse the LLM's structured response
        if result.get('candidates') and len(result['candidates']) > 0 and \
           result['candidates'][0].get('content') and result['candidates'][0]['content'].get('parts') and \
           len(result['candidates'][0]['content']['parts']) > 0:
            
            llm_text_response = result['candidates'][0]['content']['parts'][0]['text']
            app.logger.info(f"AI Brainstorm: Extracted LLM text part: {llm_text_response}")
            
            # The LLM is instructed to return JSON, so we parse it directly
            parsed_llm_response = json.loads(llm_text_response)
            
            if 'sub_tasks' in parsed_llm_response and isinstance(parsed_llm_response['sub_tasks'], list):
                app.logger.info(f"AI Brainstorm: Successfully parsed sub_tasks: {parsed_llm_response['sub_tasks']}")
                return jsonify({"sub_tasks": parsed_llm_response['sub_tasks']}), 200
            else:
                app.logger.error(f"AI Brainstorm: LLM response did not contain expected 'sub_tasks' array. Parsed: {parsed_llm_response}")
                return jsonify({"error": "LLM response did not contain expected 'sub_tasks' array. Check server logs."}), 500
        else:
            app.logger.error(f"AI Brainstorm: Failed to get valid candidates/content from LLM response. Raw: {json.dumps(result)}")
            return jsonify({"error": "Failed to get a valid response from the AI service. Check server logs."}), 500

    except requests.exceptions.Timeout:
        app.logger.error(f"AI Brainstorm: Request to Gemini API timed out for task: {main_task}")
        return jsonify({"error": "AI service request timed out. Please try again."}), 504 # Use 504 for gateway timeout
    except requests.exceptions.RequestException as e:
        app.logger.error(f"AI Brainstorm: Error calling Gemini API for task '{main_task}': {e}")
        return jsonify({"error": f"Failed to connect to AI service: {e}. Check server logs."}), 500
    except json.JSONDecodeError as e:
        app.logger.error(f"AI Brainstorm: Error parsing LLM JSON response: {e}. Raw response text was: {llm_text_response}")
        return jsonify({"error": f"Failed to parse AI response: {e}. Check server logs."}), 500
    except Exception as e:
        app.logger.error(f"AI Brainstorm: An unexpected error occurred during AI brainstorming for task '{main_task}': {e}", exc_info=True)
        return jsonify({"error": f"An unexpected server error occurred: {e}. Check server logs."}), 500


if __name__ == '__main__':
    with app.app_context():
        # This will create tables if they don't exist when running locally.
        # For Render, you typically hit /init-db once after deployment.
        db.create_all()

    app.run(debug=True) # Set debug=False for production for security
