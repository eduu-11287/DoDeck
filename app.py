import os
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS # This is crucial for allowing our frontend to talk to the backend
from flask import render_template


# --- Configuration ---
# Imagine these are secret notes for our app on how to run
basedir = os.path.abspath(os.path.dirname(__file__))

app = Flask(__name__) # This creates our Flask application, like setting up our vault manager

# Database Configuration (where our data lives)
# Here we're using SQLite, which stores data in a file named 'tasks.db'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'tasks.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False # Good practice to turn this off

db = SQLAlchemy(app) # This connects SQLAlchemy to our Flask app, setting up our magical translator
CORS(app) # This initializes CORS, giving permission for our frontend to talk to us

# Route to serve the main HTML file
@app.route('/')
def index():
    return render_template('index.html')


# --- Database Model (The blueprint for our "Task" sticky notes) ---
# This tells SQLAlchemy how a 'Task' should look when saved in the database
class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True) # Unique number for each task
    name = db.Column(db.String(120), nullable=False) # The task description (e.g., "Homework")
    category = db.Column(db.String(80), nullable=True) # The category (e.g., "School")
    is_active = db.Column(db.Boolean, default=True) # Is the task still active? (True/False)
    time_left = db.Column(db.String(20), nullable=True) # Optional: time remaining (e.g., "20:53")

    def __repr__(self):
        # A nice way to see our Task objects if we print them
        return f'<Task {self.id}: {self.name} ({self.category}) - Active: {self.is_active}>'

    def to_dict(self):
        # This function converts a Task object into a dictionary
        # which is easy to send as JSON to our frontend
        return {
            'id': self.id,
            'name': self.name,
            'category': self.category,
            'isActive': self.is_active, # Frontend uses 'isActive'
            'timeLeft': self.time_left
        }

# --- API Routes (These are the specific "doorways" our frontend will use to talk to the backend) ---

# Route to create the database tables
@app.route('/init-db')
def init_db():
    with app.app_context():
        db.create_all() # This command tells SQLAlchemy to create all tables defined in our models
    return jsonify({"message": "Database tables created!"}), 200

# Route to get all tasks (READ operation)
@app.route('/tasks', methods=['GET'])
def get_tasks():
    tasks = Task.query.all() # Get all task sticky notes from the database
    return jsonify([task.to_dict() for task in tasks]) # Convert them to dictionaries and send as JSON

# Route to add a new task (CREATE operation)
@app.route('/tasks', methods=['POST'])
def add_task():
    data = request.get_json() # Get the data (new task info) that the frontend sent us
    new_task = Task(
        name=data['name'],
        category=data.get('category', 'Uncategorized'), # If no category, use 'Uncategorized'
        is_active=True, # New tasks are always active
        time_left=data.get('timeLeft')
    )
    db.session.add(new_task) # Add the new task to our database "session" (like preparing to save)
    db.session.commit() # Save the task permanently to the database!
    return jsonify(new_task.to_dict()), 201 # Send back the new task's info and a 'Created' status code

# Route to update a task (UPDATE operation)
@app.route('/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    task = Task.query.get_or_404(task_id) # Find the task by its ID, or say "not found" if it doesn't exist
    data = request.get_json() # Get the updated info from the frontend

    # Update the task's properties based on what the frontend sent
    if 'name' in data:
        task.name = data['name']
    if 'category' in data:
        task.category = data['category']
    if 'isActive' in data: # Frontend uses 'isActive', backend uses 'is_active'
        task.is_active = data['isActive']
    if 'timeLeft' in data:
        task.time_left = data['timeLeft']

    db.session.commit() # Save the updated task permanently
    return jsonify(task.to_dict()) # Send back the updated task's info

# Route to delete a task (DELETE operation)
@app.route('/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    task = Task.query.get_or_404(task_id) # Find the task by its ID
    db.session.delete(task) # Mark the task for deletion
    db.session.commit() # Delete the task permanently
    return jsonify({"message": "Task deleted successfully"}), 200 # Send a confirmation message

# --- Running the Flask App ---
if __name__ == '__main__':
    # This ensures that our virtual environment is active before running.
    # It's generally better to run `flask run` from the terminal.
    # But for a simple direct run, this works.
    app.run(debug=True, port=5555) # Run the app! debug=True helps us see errors