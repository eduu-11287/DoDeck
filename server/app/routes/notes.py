from flask import Blueprint, request, jsonify, session
from app.models import Note
from app import db
import datetime

notes_bp = Blueprint('notes', __name__)


@notes_bp.route('/notes', methods=['GET'])
def get_notes():
    if 'user_id' not in session:
        return jsonify({"error": "Authentication required"}), 401
    user_id = session['user_id']
    notes = Note.query.filter_by(user_id=user_id) \
        .order_by(Note.note_date.desc()).all()
    return jsonify([note.to_dict() for note in notes])


@notes_bp.route('/notes', methods=['POST'])
def add_note():
    if 'user_id' not in session:
        return jsonify({"error": "Authentication required"}), 401
    user_id = session['user_id']
    data = request.get_json()

    topic = data.get('topic')
    content = data.get('content')
    note_date_str = data.get('date')

    if not topic:
        return jsonify({"error": "Note topic is required"}), 400
    if not content:
        return jsonify({"error": "Note content is required"}), 400

    note_date = datetime.date.today()
    if note_date_str:
        try:
            note_date = datetime.date.fromisoformat(note_date_str)
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


@notes_bp.route('/notes/<int:note_id>', methods=['PUT'])
def update_note(note_id):
    if 'user_id' not in session:
        return jsonify({"error": "Authentication required"}), 401
    user_id = session['user_id']
    note = Note.query.get(note_id)

    if note is None or note.user_id != user_id:
        return jsonify({"error": "Note not found or not authorized"}), 404

    data = request.get_json()

    if 'topic' in data:
        note.topic = data['topic']
    if 'content' in data:
        note.content = data['content']
    if 'date' in data:
        if data['date']:
            try:
                note.note_date = datetime.date.fromisoformat(data['date'])
            except ValueError as e:
                return jsonify(
                    {"error": f"Invalid note date format: {e}"}
                ), 400
        else:
            note.note_date = datetime.date.today()

    note.updated_at = datetime.datetime.now()
    db.session.commit()
    return jsonify(note.to_dict())


@notes_bp.route('/notes/<int:note_id>', methods=['DELETE'])
def delete_note(note_id):
    if 'user_id' not in session:
        return jsonify({"error": "Authentication required"}), 401
    user_id = session['user_id']
    note = Note.query.get(note_id)

    if note is None or note.user_id != user_id:
        return jsonify({"message": "Note not found or not authorized"}), 404

    db.session.delete(note)
    db.session.commit()
    return jsonify({"message": "Note deleted successfully"}), 200
