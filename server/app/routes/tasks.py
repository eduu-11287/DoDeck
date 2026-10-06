from flask import Blueprint, request, jsonify, session
from app.models import Note, Task
from app import db
from app.utils.decorators import login_required
import datetime
import json

tasks_bp = Blueprint('tasks', __name__)

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
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "A JSON object is required"}), 400
    name = data.get('name')
    category = data.get('category', 'Uncategorized')
    description = data.get('description', '')
    checklist = data.get('checklist', [])
    priority = data.get('priority', 3)
    due_date_str = data.get('dueDate')
    due_time_str = data.get('dueTime')

    if not isinstance(name, str) or not name.strip():
        return jsonify({"error": "Task name is required"}), 400
    if (
        not isinstance(priority, int)
        or isinstance(priority, bool)
        or priority not in range(1, 5)
    ):
        return jsonify({"error": "Priority must be an integer from 1 to 4"}), 400
    if not isinstance(category, str) or len(category) > 80:
        return jsonify({"error": "Category must be 80 characters or fewer"}), 400
    if len(name.strip()) > 120:
        return jsonify({"error": "Task name must be 120 characters or fewer"}), 400
    if not isinstance(description, str) or len(description) > 5000:
        return jsonify({"error": "Task description must be text up to 5,000 characters"}), 400
    if not valid_checklist(checklist):
        return jsonify({"error": "Checklist must contain up to 50 items with text up to 200 characters"}), 400
    if due_date_str is not None and not isinstance(due_date_str, str):
        return jsonify({"error": "Due date must be a string in YYYY-MM-DD format"}), 400
    if due_time_str is not None and not isinstance(due_time_str, str):
        return jsonify({"error": "Due time must be a string in HH:MM format"}), 400

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
        name=name.strip(),
        category=category,
        description=description.strip() or None,
        checklist_data=json.dumps(normalize_checklist(checklist)),
        priority=priority,
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

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "A JSON object is required"}), 400

    if 'name' in data:
        if not isinstance(data['name'], str) or not data['name'].strip():
            return jsonify({"error": "Task name is required"}), 400
        if len(data['name'].strip()) > 120:
            return jsonify({"error": "Task name must be 120 characters or fewer"}), 400
        task.name = data['name'].strip()
    if 'category' in data:
        if not isinstance(data['category'], str) or len(data['category']) > 80:
            return jsonify({"error": "Category must be 80 characters or fewer"}), 400
        task.category = data['category']
    if 'description' in data:
        description = data['description']
        if not isinstance(description, str) or len(description) > 5000:
            return jsonify({"error": "Task description must be text up to 5,000 characters"}), 400
        task.description = description.strip() or None
    if 'checklist' in data:
        if not valid_checklist(data['checklist']):
            return jsonify({"error": "Checklist must contain up to 50 items with text up to 200 characters"}), 400
        task.checklist_data = json.dumps(normalize_checklist(data['checklist']))
    if 'priority' in data:
        priority = data['priority']
        if (
            not isinstance(priority, int)
            or isinstance(priority, bool)
            or priority not in range(1, 5)
        ):
            return jsonify({"error": "Priority must be an integer from 1 to 4"}), 400
        task.priority = priority
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

        if new_due_date_str is not None and not isinstance(new_due_date_str, str):
            return jsonify({"error": "Due date must be a string in YYYY-MM-DD format"}), 400
        if new_due_time_str is not None and not isinstance(new_due_time_str, str):
            return jsonify({"error": "Due time must be a string in HH:MM format"}), 400

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
                        parsed_date, datetime.time(23, 59, 59)
                    )
            except ValueError as e:
                return jsonify(
                    {"error": f"Invalid date/time format: {e}"}
                ), 400
        else:
            task.due_date = None

    db.session.commit()
    return jsonify(task.to_dict())


def valid_checklist(checklist):
    return (
        isinstance(checklist, list)
        and len(checklist) <= 50
        and all(
            isinstance(item, dict)
            and isinstance(item.get('text'), str)
            and 0 < len(item['text'].strip())
            and len(item['text']) <= 200
            and isinstance(item.get('done', False), bool)
            for item in checklist
        )
    )


def normalize_checklist(checklist):
    return [
        {'text': item['text'].strip(), 'done': item.get('done', False)}
        for item in checklist
    ]


@tasks_bp.route('/tasks/<int:task_id>', methods=['DELETE'])
@login_required
def delete_task(task_id):
    user_id = session['user_id']
    task = db.session.get(Task, task_id)

    if task is None or task.user_id != user_id:
        return jsonify({"message": "Task not found or not authorized"}), 404

    Note.query.filter_by(task_id=task.id, user_id=user_id).update(
        {Note.task_id: None}, synchronize_session=False
    )
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
