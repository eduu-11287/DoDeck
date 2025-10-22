import os
from flask_migrate import Migrate
from flask import Flask, request, jsonify, render_template, session, redirect, url_for, send_file
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from io import BytesIO


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
    due_date = db.Column(db.DateTime, nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    def __repr__(self):
        return f'<Task {self.id}: {self.name} (User: {self.user_id}) - Active: {self.is_active} - Due: {self.due_date} - Completed: {self.completed_at}>'

    @property
    def time_left(self):
        if not self.due_date:
            return None
            
        if not self.is_active:
            return None
        
        now = datetime.datetime.now()
        delta = self.due_date - now
        
        # Overdue
        if delta.total_seconds() < 0:
            days_overdue = abs(delta.days)
            if days_overdue == 0:
                return "Overdue today"
            elif days_overdue == 1:
                return "Overdue by 1 day"
            else:
                return f"Overdue by {days_overdue} days"
        
        # Due today or tomorrow
        total_hours = delta.total_seconds() / 3600
        
        if total_hours < 24:
            if total_hours < 1:
                minutes = int(delta.total_seconds() / 60)
                return f"Due in {minutes} minutes"
            else:
                hours = int(total_hours)
                return f"Due in {hours} hour{'s' if hours != 1 else ''}"
        elif total_hours < 48:
            return "Due tomorrow"
        else:
            days = delta.days
            return f"Due in {days} days"

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
                due_datetime = datetime.datetime.combine(due_date, datetime.time(23, 59, 59)) # End of day if no time provided
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

    # If today has no completed tasks, determine if streak is broken
    tasks_completed_today_count = Task.query.filter_by(
        user_id=user_id,
        is_active=False
    ).filter(
        db.func.date(Task.completed_at) == today
    ).count()

    if tasks_completed_today_count == 0:
        if completed_dates and completed_dates[-1] == today - datetime.timedelta(days=1):
            # Streak ended yesterday, keep the current_streak value
            streak_broken = True
        elif not completed_dates or completed_dates[-1] < today - datetime.timedelta(days=1):
            # No completions or last completion was before yesterday
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

# Download notes functionality
@app.route('/download-notes', methods=['GET'])
@login_required
def download_notes():
    from fpdf import FPDF
    from fpdf.enums import XPos, YPos
    import datetime
    import tempfile
    import os

    user_id = session['user_id']
    user = db.session.get(User, user_id)
    notes = Note.query.filter_by(user_id=user_id).order_by(Note.note_date.desc()).all()

    # --- PDF Setup ---
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()

    # Colors
    primary_blue = (26, 115, 232)
    text_gray = (40, 40, 40)
    light_gray = (120, 120, 120)
    soft_bg = (245, 247, 250)

    # --- Header ---
    pdf.set_font("Helvetica", "B", 22)
    pdf.set_text_color(*primary_blue)
    pdf.cell(0, 15, f"{user.username}'s Notes", align="C", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    pdf.set_font("Helvetica", "I", 11)
    pdf.set_text_color(*light_gray)
    current_time = datetime.datetime.now().strftime("Generated on %B %d, %Y at %I:%M %p")
    pdf.cell(0, 8, current_time, align="C", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    # Decorative divider
    pdf.set_draw_color(*primary_blue)
    pdf.set_line_width(1)
    pdf.line(25, pdf.get_y() + 5, 185, pdf.get_y() + 5)
    pdf.ln(15)

    # --- Notes Section ---
    if not notes:
        pdf.set_font("Helvetica", "", 12)
        pdf.set_text_color(*light_gray)
        pdf.cell(0, 10, "You have no saved notes yet.", align="C", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    else:
        # Total count
        pdf.set_font("Helvetica", "B", 12)
        pdf.set_text_color(*text_gray)
        pdf.cell(0, 10, f"Total Notes: {len(notes)}", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.ln(8)

        # Loop through notes
        for i, note in enumerate(notes, 1):
            if pdf.get_y() > 250:
                pdf.add_page()

            # Background box for each note header
            pdf.set_fill_color(*soft_bg)
            pdf.set_draw_color(*primary_blue)
            y_start = pdf.get_y()
            pdf.rect(20, y_start, 170, 12, style="F")

            # Note title
            pdf.set_font("Helvetica", "BI", 13)
            pdf.set_text_color(*text_gray)
            clean_title = note.topic.encode('ascii', 'replace').decode('ascii').replace('?', '')
            pdf.set_xy(25, y_start + 2)
            pdf.cell(0, 8, f"{i}. {clean_title}")

            # Note date (right-aligned, italic)
            pdf.set_font("Helvetica", "I", 10)
            pdf.set_text_color(*light_gray)
            note_date = note.note_date.strftime("%b %d, %Y")
            pdf.set_xy(150, y_start + 2)
            pdf.cell(40, 8, note_date, align="R")

            # Move to content
            pdf.ln(12)

            # Note content box
            pdf.set_font("Helvetica", "", 11)
            pdf.set_text_color(*text_gray)
            clean_content = note.content.encode('ascii', 'replace').decode('ascii').replace('?', '')

            # Multi-line content
            pdf.set_fill_color(255, 255, 255)
            pdf.set_draw_color(230, 230, 230)
            pdf.set_line_width(0.3)
            pdf.set_x(25)
            pdf.multi_cell(160, 7, clean_content, border=1, fill=True)
            pdf.ln(10)

    # --- Footer ---
    pdf.set_y(-30)
    pdf.set_font("Helvetica", "I", 9)
    pdf.set_text_color(*light_gray)
    pdf.cell(0, 10, "___________________________", align="C", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    footer_text = f"Total {len(notes)} note" + ("s" if len(notes) != 1 else "")
    pdf.cell(0, 5, f"{footer_text} - Generated by My Diary", align="C")

    # --- Save Temp File ---
    temp_dir = tempfile.gettempdir()
    timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"{user.username}.pdf"
    filepath = os.path.join(temp_dir, filename)

    try:
        pdf.output(filepath)
        if not os.path.exists(filepath) or os.path.getsize(filepath) == 0:
            raise Exception("PDF file failed to generate")

        response = send_file(
            filepath,
            as_attachment=True,
            download_name=filename,
            mimetype='application/pdf'
        )

        @response.call_on_close
        def cleanup():
            if os.path.exists(filepath):
                os.remove(filepath)

        return response

    except Exception as e:
        print(f"Error creating PDF: {e}")
        if os.path.exists(filepath):
            os.remove(filepath)
        raise


if __name__ == '__main__':
    import os
    with app.app_context():
         db.create_all()
    port = int(os.environ.get('PORT', 5134))
    app.run(host='0.0.0.0', port=port, debug=False)