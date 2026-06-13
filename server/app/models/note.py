from app import db
import datetime


class Note(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    topic = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=True)
    note_date = db.Column(
        db.Date, nullable=False, default=datetime.date.today
    )
    created_at = db.Column(
        db.DateTime, nullable=False, default=datetime.datetime.now
    )
    updated_at = db.Column(
        db.DateTime, nullable=False,
        default=datetime.datetime.now, onupdate=datetime.datetime.now
    )
    user_id = db.Column(
        db.Integer, db.ForeignKey('user.id'), nullable=False
    )

    def __repr__(self):
        return (
            f'<Note {self.id}: {self.topic} '
            f'(User: {self.user_id}) - Date: {self.note_date}>'
        )

    def to_dict(self):
        return {
            'id': self.id,
            'topic': self.topic,
            'content': self.content,
            'date': self.note_date.isoformat() if self.note_date else None,
            'createdAt': (
                self.created_at.isoformat() if self.created_at else None
            ),
            'updatedAt': (
                self.updated_at.isoformat() if self.updated_at else None
            ),
            'userId': self.user_id
        }
