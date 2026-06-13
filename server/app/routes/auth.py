from flask import Blueprint, request, jsonify, session
from app.models import User
from app import db

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy"}), 200


@auth_bp.route('/init-db')
def init_db():
    db.create_all()
    return jsonify(
        {"message": "Database tables created (if they didn't exist)!"}
    ), 200


@auth_bp.route('/register', methods=['POST'])
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
    return jsonify({
        "message": "Registration successful",
        "userId": new_user.id,
        "username": new_user.username
    }), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    user = User.query.filter_by(username=username).first()

    if user and user.check_password(password):
        session['user_id'] = user.id
        return jsonify({
            "message": "Login successful",
            "userId": user.id,
            "username": user.username
        }), 200
    else:
        return jsonify({"error": "Invalid username or password"}), 401


@auth_bp.route('/logout', methods=['POST'])
def logout():
    session.pop('user_id', None)
    return jsonify({"message": "Logged out successfully"}), 200


@auth_bp.route('/check_auth', methods=['GET'])
def check_auth():
    if 'user_id' in session:
        user = User.query.get(session['user_id'])
        if user:
            return jsonify({
                "authenticated": True,
                "userId": user.id,
                "username": user.username
            }), 200
    return jsonify({"authenticated": False}), 200
