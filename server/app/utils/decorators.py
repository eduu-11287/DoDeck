from functools import wraps
from flask import jsonify, session


def login_required(view):
    @wraps(view)
    def decorated_view(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({"error": "Authentication required"}), 401
        return view(*args, **kwargs)

    return decorated_view
