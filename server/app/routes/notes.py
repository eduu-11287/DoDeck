from flask import Blueprint, request, jsonify, session
from app.models import Note
from app import db
from app.utils.decorators import login_required
import datetime

notes_bp = Blueprint('notes', __name__)


@notes_bp.route('/notes', methods=['GET'])
@login_required
def get_notes():
    user_id = session['user_id']
    notes = Note.query.filter_by(user_id=user_id) \
        .order_by(Note.note_date.desc()).all()
    return jsonify([note.to_dict() for note in notes])


@notes_bp.route('/notes', methods=['POST'])
@login_required
def add_note():
    user_id = session['user_id']
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "A JSON object is required"}), 400

    topic = data.get('topic')
    content = data.get('content')
    note_date_str = data.get('date')

    if not isinstance(topic, str) or not topic.strip():
        return jsonify({"error": "Note topic is required"}), 400
    if len(topic.strip()) > 200:
        return jsonify({"error": "Note title must be 200 characters or fewer"}), 400
    if not isinstance(content, str) or not content.strip():
        return jsonify({"error": "Note content is required"}), 400
    if len(content) > 12000:
        return jsonify({"error": "Note content must be 12,000 characters or fewer"}), 400
    if not valid_tags(data.get('tags')):
        return jsonify({"error": "Tags must be text or a list of text, up to 500 characters"}), 400

    note_date = datetime.date.today()
    if note_date_str is not None and note_date_str != '':
        if not isinstance(note_date_str, str):
            return jsonify({"error": "Note date must use YYYY-MM-DD format"}), 400
        try:
            note_date = datetime.date.fromisoformat(note_date_str)
        except ValueError as e:
            return jsonify({"error": f"Invalid note date format: {e}"}), 400

    new_note = Note(
        topic=topic.strip(),
        content=content,
        tags=normalize_tags(data.get('tags')),
        note_date=note_date,
        user_id=user_id
    )
    db.session.add(new_note)
    db.session.commit()
    return jsonify(new_note.to_dict()), 201


@notes_bp.route('/notes/<int:note_id>', methods=['PUT'])
@login_required
def update_note(note_id):
    user_id = session['user_id']
    note = db.session.get(Note, note_id)

    if note is None or note.user_id != user_id:
        return jsonify({"error": "Note not found or not authorized"}), 404

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "A JSON object is required"}), 400

    if 'topic' in data:
        if not isinstance(data['topic'], str) or not data['topic'].strip():
            return jsonify({"error": "Note topic is required"}), 400
        if len(data['topic'].strip()) > 200:
            return jsonify({"error": "Note title must be 200 characters or fewer"}), 400
        note.topic = data['topic'].strip()
    if 'content' in data:
        if not isinstance(data['content'], str) or not data['content'].strip():
            return jsonify({"error": "Note content is required"}), 400
        if len(data['content']) > 12000:
            return jsonify({"error": "Note content must be 12,000 characters or fewer"}), 400
        note.content = data['content']
    if 'tags' in data:
        if not valid_tags(data['tags']):
            return jsonify({"error": "Tags must be text or a list of text, up to 500 characters"}), 400
        note.tags = normalize_tags(data['tags'])
    if 'date' in data:
        if data['date'] is not None and data['date'] != '':
            if not isinstance(data['date'], str):
                return jsonify({"error": "Note date must use YYYY-MM-DD format"}), 400
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
@login_required
def delete_note(note_id):
    user_id = session['user_id']
    note = db.session.get(Note, note_id)

    if note is None or note.user_id != user_id:
        return jsonify({"message": "Note not found or not authorized"}), 404

    db.session.delete(note)
    db.session.commit()
    return jsonify({"message": "Note deleted successfully"}), 200


def normalize_tags(tags):
    if isinstance(tags, list):
        tags = ','.join(str(tag) for tag in tags)
    if not isinstance(tags, str):
        return None
    normalized = ','.join(dict.fromkeys(
        tag.strip().lstrip('#') for tag in tags.split(',') if tag.strip()
    ))
    return normalized[:500] or None


def valid_tags(tags):
    if tags is None:
        return True
    if isinstance(tags, str):
        return len(tags) <= 500
    return isinstance(tags, list) and all(
        isinstance(tag, str) for tag in tags
    ) and sum(map(len, tags)) <= 500
