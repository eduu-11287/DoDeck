import os
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask import render_template
import datetime # Import datetime module

# --- Configuration ---
basedir = os.path.abspath(os.path.dirname(__file__))

app = Flask(__name__)

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'tasks.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
CORS(app)

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
    due_date = db.Column(db.DateTime, nullable=True) # New: Store due date as DateTime object

    def __repr__(self):
        return f'<Task {self.id}: {self.name} ({self.category}) - Active: {self.is_active} - Due: {self.due_date}>'

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'category': self.category,
            'isActive': self.is_active,
            'timeLeft': self.time_left, # Keep for now, might transition to only using due_date
            'dueDate': self.due_date.isoformat() if self.due_date else None # New: Convert DateTime to ISO format string
        }

# --- API Routes ---

# IMPORTANT: You need to re-initialize your database after this change!
# 1. Stop your Flask app.
# 2. Delete the 'tasks.db' file in your project directory.
# 3. Run the /init-db route once.
# 4. Then restart your app normally.
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
        is_active=True,
        time_left=data.get('timeLeft')
    )
    # New: Handle due_date from incoming data
    if 'dueDate' in data and data['dueDate']:
        try:
            # Assuming dueDate comes as "YYYY-MM-DDTHH:MM:SS" or "YYYY-MM-DDTHH:MM"
            # Python's datetime.fromisoformat() is robust
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
        task.is_active = data['isActive']
    if 'timeLeft' in data:
        task.time_left = data['timeLeft']
    # New: Handle due_date update
    if 'dueDate' in data: # Check if key exists (even if None)
        if data['dueDate']: # If it's not None, try to parse
            try:
                task.due_date = datetime.datetime.fromisoformat(data['dueDate'])
            except ValueError:
                return jsonify({"error": "Invalid due date format"}), 400
        else: # If it's None, set due_date to None
            task.due_date = None

    db.session.commit()
    return jsonify(task.to_dict())

@app.route('/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    task = Task.query.get_or_404(task_id)
    db.session.delete(task)
    db.session.commit()
    return jsonify({"message": "Task deleted successfully"}), 200

if __name__ == '__main__':
    app.run(debug=True, port=5555)