import os
from dotenv import load_dotenv
load_dotenv() # This line loads the variables from .env

from flask import Flask, request, jsonify, render_template
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_apscheduler import APScheduler # New: Import APScheduler
from flask_mail import Mail, Message # New: Import Mail and Message for sending emails
import datetime
# Removed: import requests # No longer needed for external fact API, as it's now handled by JS
# Removed: from dotenv import load_dotenv # Only needed if using .env for general env vars, but we'll use os.getenv directly

# --- Configuration ---
basedir = os.path.abspath(os.path.dirname(__file__))

app = Flask(__name__)

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'tasks.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
CORS(app)

# --- Flask-APScheduler Configuration ---
class SchedulerConfig:
    SCHEDULER_API_ENABLED = True
    # If you need to debug scheduler, uncomment this
    # SCHEDULER_DEBUG = True

app.config.from_object(SchedulerConfig())
scheduler = APScheduler() # Initialize scheduler

# --- Flask-Mail Configuration ---
# IMPORTANT: Use environment variables for these sensitive details!
# If running locally, set these in your terminal or a .env file (and remember to .gitignore .env)
app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER', 'smtp.gmail.com') # e.g., 'smtp.gmail.com' for Gmail
app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', 587)) # e.g., 587 for TLS, 465 for SSL
app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS', 'True').lower() == 'true'
app.config['MAIL_USE_SSL'] = os.getenv('MAIL_USE_SSL', 'False').lower() == 'true'
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME', 'your_email@example.com') # Your email address
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD', 'your_email_password_or_app_password') # Your email password or app-specific password
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER', 'your_email@example.com') # Sender email

mail = Mail(app) # Initialize mail

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
    # New: Field to track if a notification has been sent for this task for today's due date
    notification_sent_date = db.Column(db.Date, nullable=True)

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
            'completedAt': self.completed_at.isoformat() if self.completed_at else None,
            'notificationSentDate': self.notification_sent_date.isoformat() if self.notification_sent_date else None
        }

# --- API Routes ---

@app.route('/init-db')
def init_db():
    with app.app_context():
        db.drop_all() # Optional: Drops existing tables first to ensure clean recreate
        db.create_all()
        # Add a sample task with a due date for testing notifications
        sample_task = Task(
            name="Buy groceries",
            category="Personal",
            due_date=datetime.datetime.now() + datetime.timedelta(minutes=5) # Due in 5 minutes
        )
        db.session.add(sample_task)
        db.session.commit()
    return jsonify({"message": "Database tables (re)created with a sample task!"}), 200

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
    task = db.session.get(Task, task_id) # Use db.session.get for primary key lookup
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
            # If task is completed, reset notification sent flag for future re-activation
            task.notification_sent_date = None
        elif data['isActive'] == True and task.is_active == False:
            task.completed_at = None
            # If task is re-activated, reset notification sent flag
            task.notification_sent_date = None
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
                # If due date changes, reset notification sent flag
                task.notification_sent_date = None
            except ValueError as e:
                return jsonify({"error": f"Invalid due date format: {e}"}), 400
        else:
            task.due_date = None
            task.notification_sent_date = None # If due date removed, clear notification flag

    db.session.commit()
    return jsonify(task.to_dict())

@app.route('/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    task = db.session.get(Task, task_id) # Use db.session.get
    if task is None:
        return jsonify({"message": "Task not found"}), 404
    db.session.delete(task)
    db.session.commit()
    return jsonify({"message": "Task deleted successfully"}), 200

# --- Scheduled Notification Job ---
def send_task_notifications():
    # This function needs to run within the Flask application context to access the database.
    # APScheduler handles this via app.app_context() when using init_app.
    with app.app_context():
        now = datetime.datetime.now()
        today = now.date()

        # Find active tasks that are due today or in the near future (e.g., next 24 hours)
        # and for which a notification hasn't been sent yet for today's date
        upcoming_tasks = Task.query.filter(
            Task.is_active == True,
            Task.due_date.isnot(None), # Ensure it has a due date
            Task.due_date >= now - datetime.timedelta(minutes=5), # Include slightly overdue tasks from last check
            Task.due_date <= now + datetime.timedelta(hours=24), # Due in next 24 hours
            (Task.notification_sent_date != today) | (Task.notification_sent_date.is_(None)) # Not sent today or never sent
        ).all()

        # Find active tasks that are overdue
        # and for which an overdue notification hasn't been sent today
        overdue_tasks = Task.query.filter(
            Task.is_active == True,
            Task.due_date.isnot(None), # Ensure it has a due date
            Task.due_date < now - datetime.timedelta(minutes=5), # Definitely overdue (more than 5 mins past due)
            (Task.notification_sent_date != today) | (Task.notification_sent_date.is_(None)) # Not sent today or never sent
        ).all()

        # Combine and deduplicate
        tasks_to_notify = {}
        for task in upcoming_tasks + overdue_tasks:
            tasks_to_notify[task.id] = task

        if tasks_to_notify:
            print(f"Checking for notifications at {now.strftime('%Y-%m-%d %H:%M:%S')}")
            for task_id, task in tasks_to_notify.items():
                subject = ""
                body = ""
                is_overdue = task.due_date < now
                time_diff = abs(now - task.due_date)

                if is_overdue:
                    # Overdue notification
                    minutes_overdue = int(time_diff.total_seconds() / 60)
                    hours_overdue = int(minutes_overdue / 60)
                    days_overdue = int(hours_overdue / 24)

                    if days_overdue > 0:
                        subject = f"OVERDUE: Your Task '{task.name}' is {days_overdue} day(s) overdue!"
                        body = f"Hello,\n\nJust a reminder that your task '{task.name}' ({task.category}) was due on {task.due_date.strftime('%Y-%m-%d %H:%M')}. It is now {days_overdue} day(s) overdue.\n\nPlease log in to your ToDo app to complete it.\n\nBest regards,\nYour ToDo App"
                    elif hours_overdue > 0:
                        subject = f"OVERDUE: Your Task '{task.name}' is {hours_overdue} hour(s) overdue!"
                        body = f"Hello,\n\nJust a reminder that your task '{task.name}' ({task.category}) was due on {task.due_date.strftime('%Y-%m-%d %H:%M')}. It is now {hours_overdue} hour(s) overdue.\n\nPlease log in to your ToDo app to complete it.\n\nBest regards,\nYour ToDo App"
                    else: # Minutes overdue
                        subject = f"OVERDUE: Your Task '{task.name}' is {minutes_overdue} minute(s) overdue!"
                        body = f"Hello,\n\nJust a reminder that your task '{task.name}' ({task.category}) was due on {task.due_date.strftime('%Y-%m-%d %H:%M')}. It is now {minutes_overdue} minute(s) overdue.\n\nPlease log in to your ToDo app to complete it.\n\nBest regards,\nYour ToDo App"

                else:
                    # Upcoming notification (due today/tomorrow)
                    time_until_due = task.due_date - now
                    hours_until_due = int(time_until_due.total_seconds() / 3600)
                    minutes_until_due = int((time_until_due.total_seconds() % 3600) / 60)

                    if hours_until_due < 1: # Due within the next hour
                        subject = f"REMINDER: Your Task '{task.name}' is due in {minutes_until_due} minute(s)!"
                        body = f"Hello,\n\nJust a friendly reminder that your task '{task.name}' ({task.category}) is due very soon today at {task.due_date.strftime('%H:%M')}.\n\nPlease log in to your ToDo app to complete it.\n\nBest regards,\nYour ToDo App"
                    elif hours_until_due < 24: # Due today
                         subject = f"REMINDER: Your Task '{task.name}' is due today!"
                         body = f"Hello,\n\nJust a friendly reminder that your task '{task.name}' ({task.category}) is due today at {task.due_date.strftime('%H:%M')}.\n\nPlease log in to your ToDo app to complete it.\n\nBest regards,\nYour ToDo App"
                    else: # Due tomorrow or later today (within 24 hours)
                        subject = f"REMINDER: Your Task '{task.name}' is due soon!"
                        body = f"Hello,\n\nJust a friendly reminder that your task '{task.name}' ({task.category}) is due on {task.due_date.strftime('%Y-%m-%d %H:%M')}.\n\nPlease log in to your ToDo app to complete it.\n\nBest regards,\nYour ToDo App"

                try:
                    msg = Message(subject,
                                  sender=app.config['MAIL_DEFAULT_SENDER'],
                                  recipients=[app.config['MAIL_USERNAME']]) # Send to the configured MAIL_USERNAME (your email)
                    msg.body = body
                    mail.send(msg)
                    print(f"Notification sent for task: {task.name} - Due: {task.due_date}")
                    task.notification_sent_date = today # Mark notification as sent for today
                    db.session.commit()
                except Exception as e:
                    print(f"Failed to send email for task {task.name}: {e}")
                    # In a real app, you might log this error more formally
if __name__ == '__main__':
    # Ensure application context is pushed before initializing scheduler
    # This is necessary because scheduler.init_app(app) might need app context
    with app.app_context():
        # Initialize scheduler with the app instance
        scheduler.init_app(app)
        scheduler.start()
        # Schedule the job to run every 15 minutes
        scheduler.add_job(id='send_task_notifications_job', func=send_task_notifications, trigger='interval', minutes=15)
        print("Scheduler initialized and notification job added.")

        # Optional: For initial DB setup or re-creating it for testing
        # Uncomment the following lines if you want to automatically create tables
        # or clear and re-create them every time the app starts in debug mode.
        # Be careful with db.drop_all() in production!
        # db.create_all() # Only creates tables if they don't exist
        # If you want to use the sample task from init_db route, run that endpoint in browser once.

    app.run(debug=True, port=5555)