import os
from flask import Flask, request, jsonify, render_template
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import datetime
# Removed: from flask_apscheduler import APScheduler
# Removed: from flask_mail import Mail, Message

# --- Configuration ---
basedir = os.path.abspath(os.path.dirname(__file__))

app = Flask(__name__)

# In app.py
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///' + os.path.join(basedir, 'tasks.db'))
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
# New: Add a secret key for Flask sessions (important for production)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your_super_secret_key_for_dev') # REPLACE THIS FOR PROD!

db = SQLAlchemy(app)
CORS(app)

# Removed: Flask-APScheduler configuration and initialization
# Removed: Flask-Mail configuration and initialization

@app.route('/')
def index():
    return render_template('index.html')

# --- Database Model ---
class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    category = db.Column(db.String(80), nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    time_left = db.Column(db.String(20), nullable=True)
    due_date = db.Column(db.DateTime, nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)
    # Removed: notification_sent_date field

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
            'completedAt': self.completed_at.isoformat() if self.completed_at else None
        }

# --- API Routes ---

@app.route('/init-db')
def init_db():
    with app.app_context():
        db.drop_all() # Drops existing tables first to ensure clean recreate
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
        is_active=True,
        time_left=data.get('timeLeft')
    )
    if 'dueDate' in data and data['dueDate']:
        try:
            # Handle potential timezone info in ISO format
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
def update_task(task_id):
    task = db.session.get(Task, task_id)
    if task is None:
        return jsonify({"error": "Task not found"}), 404
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
def delete_task(task_id):
    task = db.session.get(Task, task_id)
    if task is None:
        return jsonify({"message": "Task not found"}), 404
    db.session.delete(task)
    db.session.commit()
    return jsonify({"message": "Task deleted successfully"}), 200

# Removed: send_task_notifications function
# Removed: scheduler initialization from __name__ == '__main__'

if __name__ == '__main__':
    # For initial DB setup or re-creating it for testing.
    # In production, you'd typically manage DB creation/migrations separately.
    with app.app_context():
        db.create_all() # This will create tables if they don't exist

    app.run(debug=True, port=5555)