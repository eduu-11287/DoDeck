from app import db
import datetime


class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    category = db.Column(db.String(80), nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    due_date = db.Column(db.DateTime, nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    def __repr__(self):
        return (
            f'<Task {self.id}: {self.name} (User: {self.user_id}) '
            f'- Active: {self.is_active} - Due: {self.due_date} '
            f'- Completed: {self.completed_at}>'
        )

    @property
    def time_left(self):
        if not self.due_date:
            return None
        if not self.is_active:
            return None
        now = datetime.datetime.now()
        delta = self.due_date - now
        if delta.total_seconds() < 0:
            days_overdue = abs(delta.days)
            if days_overdue == 0:
                return "Overdue today"
            elif days_overdue == 1:
                return "Overdue by 1 day"
            else:
                return f"Overdue by {days_overdue} days"
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
            'dueDate': (
                self.due_date.isoformat() if self.due_date else None
            ),
            'dueTime': (
                self.due_date.strftime('%H:%M') if self.due_date else None
            ),
            'completedAt': (
                self.completed_at.isoformat() if self.completed_at else None
            ),
            'userId': self.user_id
        }
