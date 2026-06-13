from flask import Blueprint, request, jsonify, session
from app.models import Task
from app import db
import datetime

tasks_bp = Blueprint('tasks', __name__)


def login_required(f):
    from functools import wraps

    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({"error": "Authentication required"}), 401
        return f(*args, **kwargs)
    return decorated_function


@tasks_bp.route('/tasks', methods=['GET'])
@login_required
def get_tasks():
    user_id = session['user_id']
    tasks = Task.query.filter_by(user_id=user_id) \
        .order_by(Task.due_date.asc(), Task.id.asc()).all()
    return jsonify([task.to_dict() for task in tasks])


@tasks_bp.route('/tasks', methods=['POST'])
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
            due_date = datetime.datetime.strptime(
                due_date_str, '%Y-%m-%d'
            ).date()
            if due_time_str:
                due_time = datetime.datetime.strptime(
                    due_time_str, '%H:%M'
                ).time()
                due_datetime = datetime.datetime.combine(due_date, due_time)
            else:
                due_datetime = datetime.datetime.combine(
                    due_date, datetime.time(23, 59, 59)
                )
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


@tasks_bp.route('/tasks/<int:task_id>', methods=['PUT'])
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
        if data['isActive'] is False and task.is_active is True:
            task.completed_at = datetime.datetime.now()
        elif data['isActive'] is True and task.is_active is False:
            task.completed_at = None
        task.is_active = data['isActive']

    if 'dueDate' in data or 'dueTime' in data:
        existing_date = task.due_date
        if existing_date:
            date_str = existing_date.isoformat().split('T')[0]
            time_str = existing_date.strftime('%H:%M')
        else:
            date_str = None
            time_str = None
        new_due_date_str = data.get('dueDate', date_str)
        new_due_time_str = data.get('dueTime', time_str)

        if new_due_date_str:
            try:
                parsed_date = datetime.datetime.strptime(
                    new_due_date_str, '%Y-%m-%d'
                ).date()
                if new_due_time_str:
                    parsed_time = datetime.datetime.strptime(
                        new_due_time_str, '%H:%M'
                    ).time()
                    task.due_date = datetime.datetime.combine(
                        parsed_date, parsed_time
                    )
                else:
                    task.due_date = datetime.datetime.combine(
                        parsed_date, datetime.time(0, 0)
                    )
            except ValueError as e:
                return jsonify(
                    {"error": f"Invalid date/time format: {e}"}
                ), 400
        else:
            task.due_date = None

    db.session.commit()
    return jsonify(task.to_dict())


@tasks_bp.route('/tasks/<int:task_id>', methods=['DELETE'])
@login_required
def delete_task(task_id):
    user_id = session['user_id']
    task = db.session.get(Task, task_id)

    if task is None or task.user_id != user_id:
        return jsonify({"message": "Task not found or not authorized"}), 404

    db.session.delete(task)
    db.session.commit()
    return jsonify({"message": "Task deleted successfully"}), 200


@tasks_bp.route('/streak', methods=['GET'])
@login_required
def get_streak():
    user_id = session['user_id']
    today = datetime.date.today()

    completed_tasks = Task.query.filter_by(
        user_id=user_id,
        is_active=False
    ).filter(Task.completed_at.isnot(None)) \
        .order_by(Task.completed_at.asc()).all()

    completed_dates = sorted(
        list(set([t.completed_at.date() for t in completed_tasks]))
    )

    current_streak = 0
    longest_streak = 0
    last_date = None
    streak_broken = False

    for i, date in enumerate(completed_dates):
        if i == 0:
            current_streak = 1
        elif (date - last_date).days == 1:
            current_streak += 1
        elif (date - last_date).days > 1:
            current_streak = 1
        longest_streak = max(longest_streak, current_streak)
        last_date = date

    if completed_dates:
        latest_completed_date = completed_dates[-1]

        if latest_completed_date == today:
            pass
        elif latest_completed_date == today - datetime.timedelta(days=1):
            streak_broken = True
        elif latest_completed_date < today - datetime.timedelta(days=1):
            current_streak = 0
            streak_broken = True

    tasks_completed_today_count = Task.query.filter_by(
        user_id=user_id,
        is_active=False
    ).filter(
        db.func.date(Task.completed_at) == today
    ).count()

    if tasks_completed_today_count == 0:
        if completed_dates and completed_dates[-1] == today - \
                datetime.timedelta(days=1):
            streak_broken = True
        elif (
            not completed_dates or
            completed_dates[-1] < today - datetime.timedelta(days=1)
        ):
            current_streak = 0
            streak_broken = True

    return jsonify({
        "current_streak": current_streak,
        "longest_streak": longest_streak,
        "streak_broken": streak_broken
    })
