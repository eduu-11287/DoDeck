import pytest

from app import create_app, db


@pytest.fixture
def client():
    app = create_app('testing')
    with app.app_context():
        db.create_all()
        yield app.test_client()
        db.session.remove()
        db.drop_all()


def sign_up(client):
    return client.post(
        '/register',
        json={'username': 'daymark-user', 'password': 'correct horse battery'},
    )


def test_registration_validates_password_and_session(client):
    response = client.post(
        '/register',
        json={'username': 'daymark-user', 'password': 'short'},
    )
    assert response.status_code == 400
    assert response.json['error'] == 'Password must be at least 8 characters'

    response = sign_up(client)
    assert response.status_code == 201
    assert client.get('/check_auth').json['authenticated'] is True


def test_task_priority_is_persisted_and_validated(client):
    assert sign_up(client).status_code == 201
    response = client.post(
        '/tasks',
        json={'name': 'Plan the week', 'priority': 1, 'category': 'Work'},
    )
    assert response.status_code == 201
    task_id = response.json['id']
    assert response.json['priority'] == 1

    invalid_response = client.post(
        '/tasks',
        json={'name': 'Invalid priority', 'priority': 5},
    )
    assert invalid_response.status_code == 400

    update_response = client.put(
        f'/tasks/{task_id}',
        json={'priority': 2, 'isActive': False},
    )
    assert update_response.status_code == 200
    assert update_response.json['priority'] == 2
    assert update_response.json['isActive'] is False
    assert update_response.json['completedAt']


def test_note_tags_round_trip_and_notes_require_auth(client):
    assert client.get('/notes').status_code == 401
    assert sign_up(client).status_code == 201

    response = client.post(
        '/notes',
        json={
            'topic': 'A useful idea',
            'content': 'Keep the first step small.',
            'tags': ['#work', 'ideas', 'work'],
        },
    )
    assert response.status_code == 201
    note_id = response.json['id']
    assert response.json['tags'] == ['work', 'ideas']

    updated = client.put(f'/notes/{note_id}', json={'tags': ['personal']})
    assert updated.status_code == 200
    assert updated.json['tags'] == ['personal']
