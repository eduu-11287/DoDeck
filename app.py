import os
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask import render_template
import datetime
# Removed: import requests # No longer needed for this API
# Removed: from dotenv import load_dotenv # No longer needed if you only use .env for API key

# --- Configuration ---
basedir = os.path.abspath(os.path.dirname(__file__))

app = Flask(__name__)

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'tasks.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
CORS(app)

# Removed: API_NINJAS_KEY = os.getenv('API_NINJAS_KEY', 'YOUR_API_NINJAS_KEY_HERE')
# Removed: load_dotenv() # Call to load .env, no longer strictly necessary if no other env vars

@app.route('/')
def index():
    return render_template('index.html')

# --- Database Model ---
class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    category = db.Column(db.String(80), nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    time_left = db.Column(db.String(20), nullable=True) # Could be removed later if due_date is primary time field
    due_date = db.Column(db.DateTime, nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True) # New: Timestamp when task was completed

    def __repr__(self):
        return f'<Task {self.id}: {self.name} ({self.category}) - Active: {self.is_active} - Due: {self.due_date} - Completed: {self.completed_at}>'

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'category': self.category,
            'isActive': self.is_active,
            'timeLeft': self.time_left,
            'dueDate': self.due_date.isoformat() if self.due_date else None,
            'completedAt': self.completed_at.isoformat() if self.completed_at else None # New: Include completed_at
        }

# --- API Routes ---

@app.route('/init-db')
def init_db():
    with app.app_context():
        db.drop_all() # Optional: Drops existing tables first to ensure clean recreate
        db.create_all()
    return jsonify({"message": "Database tables (re)created!"}), 200

@app.route('/tasks', methods=['GET'])
def get_tasks():
    tasks = Task.query.all()
    return jsonify([task.to_dict() for task in tasks])

@app.route('/tasks', methods=['POST'])
def add_task():
    data = request.get_json()
    new_task = Task(
        name=data['name'],
        category=data.get('category', 'Uncategorized'),
        is_active=True, # New tasks are always active
        time_left=data.get('timeLeft')
    )
    if 'dueDate' in data and data['dueDate']:
        try:
            new_task.due_date = datetime.datetime.fromisoformat(data['dueDate'])
        except ValueError:
            return jsonify({"error": "Invalid due date format"}), 400

    db.session.add(new_task)
    db.session.commit()
    return jsonify(new_task.to_dict()), 201

@app.route('/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    task = Task.query.get_or_404(task_id)
    data = request.get_json()

    if 'name' in data:
        task.name = data['name']
    if 'category' in data:
        task.category = data['category']
    if 'isActive' in data:
        # New: If task is being set to inactive, set completed_at
        if data['isActive'] == False and task.is_active == True: # If it was active and now is inactive
            task.completed_at = datetime.datetime.now()
        elif data['isActive'] == True and task.is_active == False: # If it was inactive and now is active (un-checked)
            task.completed_at = None # Clear completed_at
        task.is_active = data['isActive']
    if 'timeLeft' in data:
        task.time_left = data['timeLeft']
    if 'dueDate' in data:
        if data['dueDate']:
            try:
                task.due_date = datetime.datetime.fromisoformat(data['dueDate'])
            except ValueError:
                return jsonify({"error": "Invalid due date format"}), 400
        else:
            task.due_date = None

    db.session.commit()
    return jsonify(task.to_dict())

@app.route('/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    task = Task.query.get_or_404(task_id)
    db.session.delete(task)
    db.session.commit()
    return jsonify({"message": "Task deleted successfully"}), 200

# Removed: @app.route('/api/fun-fact', methods=['GET'])
# Removed the entire get_fun_fact function from here.

if __name__ == '__main__':
    app.run(debug=True, port=5555)