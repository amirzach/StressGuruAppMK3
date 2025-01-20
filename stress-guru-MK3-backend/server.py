import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import datetime
import warnings
from functools import wraps
from collections import defaultdict

# Import the new AI system
from twentyq_ai import AdaptiveStress20QAI

# Load environment variables
from dotenv import load_dotenv
load_dotenv(dotenv_path="db.env")

# Initialize Flask app
app = Flask(__name__)
CORS(app, origins=os.getenv("FRONTEND_URL", "http://localhost:3000"), supports_credentials=True)

# Secret key for JWT
app.config['SECRET_KEY'] = os.getenv("SECRET_KEY", "your_secret_key")

# MongoDB setup
mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017/mydatabase")
client = MongoClient(mongo_uri)
db = client[os.getenv("DB_NAME", "mydatabase")]
users_collection = db["users"]
assessments_collection = db["stress_assessments"]
knowledge_base_collection = db["ai_knowledge_base"]

# Initialize AI system
ai_system = AdaptiveStress20QAI()

# Modified initialize_user_knowledge_base function in server.py
def initialize_user_knowledge_base(user_id):
    """
    Initialize a new user's knowledge base in MongoDB if it doesn't exist.
    """
    try:
        # Check if knowledge base already exists for user
        existing_kb = knowledge_base_collection.find_one({"user_id": str(user_id)})
        
        if not existing_kb:
            # Initial knowledge base structure
            initial_kb = {
                "user_id": str(user_id),
                "knowledge_base": {
                    "patterns": [
                        {
                            "responses": {
                                "0": "very often",
                                "1": "very often",
                                "2": "fairly often",
                                "3": "almost never",
                                "4": "almost never"
                            },
                            "stress_level": "high stress",
                            "frequency": 5
                        },
                        {
                            "responses": {
                                "0": "never",
                                "1": "almost never",
                                "2": "sometimes",
                                "3": "fairly often",
                                "4": "fairly often"
                            },
                            "stress_level": "low stress",
                            "frequency": 5
                        }
                    ]
                },
                "question_weights": {str(i): 1.0 for i in range(10)},
                "historical_data": [],
                "created_at": datetime.datetime.utcnow(),
                "last_updated": datetime.datetime.utcnow()
            }
            
            knowledge_base_collection.insert_one(initial_kb)
            return True
            
        return False
        
    except Exception as e:
        print(f"Error initializing knowledge base: {str(e)}")
        return False

# JWT decorator
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('x-access-token')
        if not token:
            return jsonify({"message": "Token is missing!"}), 401
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = users_collection.find_one({"email": data['email']})
        except:
            return jsonify({"message": "Token is invalid!"}), 401
        return f(current_user, *args, **kwargs)
    return decorated

# Modified load_user_knowledge_base function
def load_user_knowledge_base(user_id):
    """Load a user's knowledge base from MongoDB"""
    try:
        kb_data = knowledge_base_collection.find_one({"user_id": str(user_id)})
        if kb_data:
            ai_system.knowledge_base = kb_data.get('knowledge_base', ai_system.initialize_knowledge_base())
            ai_system.question_weights = kb_data.get('question_weights', {str(i): 1.0 for i in range(10)})
            ai_system.historical_data = kb_data.get('historical_data', [])
            return True
    except Exception as e:
        print(f"Error loading knowledge base: {str(e)}")
        
    # If anything fails, initialize the AI system with defaults
    ai_system.__init__()
    return False

# Modified save_user_knowledge_base function
def save_user_knowledge_base(user_id):
    """Save a user's knowledge base to MongoDB"""
    try:
        kb_data = {
            "user_id": str(user_id),
            "knowledge_base": ai_system.knowledge_base,
            "question_weights": ai_system.question_weights,
            "historical_data": ai_system.historical_data,
            "last_updated": datetime.datetime.utcnow()
        }
        knowledge_base_collection.update_one(
            {"user_id": str(user_id)},
            {"$set": kb_data},
            upsert=True
        )
        return True
    except Exception as e:
        print(f"Error saving knowledge base: {str(e)}")
        return False

@app.route('/pss/questions', methods=['GET'])
@token_required
def get_questions(current_user):
    """Get all PSS questions"""
    return jsonify({
        "questions": ai_system.questions,
        "reverse_score_questions": ai_system.reverse_score_questions
    })

@app.route('/pss/next-question', methods=['POST'])
@token_required
def get_next_question(current_user):
    """Get the next question for the assessment"""
    try:
        # Get and validate request data
        data = request.get_json()
        if data is None:
            data = {'current_responses': []}
            
        current_responses = data.get('current_responses', [])
        
        # Validate current_responses format
        if not isinstance(current_responses, list):
            current_responses = []
            
        # Load user's knowledge base with error handling
        try:
            load_user_knowledge_base(current_user['_id'])
        except Exception as e:
            print(f"Knowledge base load error: {str(e)}")
            # Continue with default AI system state if knowledge base load fails
            ai_system.__init__()
            
        # Get next question with error handling
        try:
            next_question_idx = ai_system.get_next_question(current_responses)
            
            # Check if assessment is complete
            if next_question_idx is None:
                return jsonify({
                    "complete": True,
                    "message": "Assessment complete"
                })
                
            # Ensure question index is valid
            if not isinstance(next_question_idx, int) or next_question_idx < 0 or next_question_idx >= len(ai_system.questions):
                return jsonify({
                    "question_index": 0,
                    "question": ai_system.questions[0]
                })
                
            # Return next question
            return jsonify({
                "question_index": next_question_idx,
                "question": ai_system.questions[next_question_idx],
                "complete": False
            })
            
        except Exception as e:
            print(f"Error getting next question: {str(e)}")
            # Fallback to first question if there's an error
            return jsonify({
                "question_index": 0,
                "question": ai_system.questions[0],
                "complete": False
            })
            
    except Exception as e:
        print(f"General error in get_next_question endpoint: {str(e)}")
        return jsonify({
            "error": "Internal server error",
            "message": str(e)
        }), 500

@app.route('/pss/assess', methods=['POST'])
@token_required
def assess_stress(current_user):
    """Process stress assessment responses"""
    try:
        data = request.json
        responses = data.get('responses', [])
        
        # Add debug logging
        print("Received responses:", responses)
        
        if not responses:
            return jsonify({"message": "No responses provided"}), 400

        # Input validation
        if not isinstance(responses, list):
            return jsonify({"message": "Responses must be a list"}), 400

        # Validate each response
        valid_values = {'never', 'almost never', 'sometimes', 'fairly often', 'very often'}
        for idx, response in responses:
            if not isinstance(idx, (int, float)) or not isinstance(response, str):
                return jsonify({"message": f"Invalid response format at index {idx}"}), 400
            if response.lower() not in valid_values:
                return jsonify({"message": f"Invalid response value: {response}"}), 400

        # Load user's knowledge base
        load_user_knowledge_base(current_user['_id'])
        
        # Initialize score calculation
        total_score = 0
        response_values = {
            'never': 0,
            'almost never': 1,
            'sometimes': 2,
            'fairly often': 3,
            'very often': 4
        }

        # Calculate score
        try:
            for idx, response in responses:
                score = response_values[response.lower()]
                if idx in ai_system.reverse_score_questions:
                    score = 4 - score
                total_score += score
        except Exception as e:
            print(f"Score calculation error: {str(e)}")
            return jsonify({"message": "Error calculating score"}), 500

        # Scale score if not all questions answered
        questions_answered = len(responses)
        if questions_answered < len(ai_system.questions):
            total_score = total_score * (len(ai_system.questions) / questions_answered)
        
        # Get prediction from AI
        try:
            prediction, confidence = ai_system.predict_stress_level(responses)
        except Exception as e:
            print(f"AI prediction error: {str(e)}")
            return jsonify({"message": "Error generating AI prediction"}), 500

        # Update AI knowledge base
        try:
            ai_system.update_knowledge_base(responses, prediction)
            save_user_knowledge_base(current_user['_id'])
        except Exception as e:
            print(f"Knowledge base update error: {str(e)}")
            # Don't return error here, as the assessment is still valid

        # Store assessment in database
        try:
            assessment_data = {
                "user_id": str(current_user['_id']),
                "timestamp": datetime.datetime.utcnow(),
                "responses": responses,
                "score": total_score,
                "stress_level": prediction,
                "ai_confidence": confidence,
                "questions_answered": questions_answered
            }
            assessments_collection.insert_one(assessment_data)
        except Exception as e:
            print(f"Database storage error: {str(e)}")
            return jsonify({"message": "Error storing assessment"}), 500

        return jsonify({
            "score": total_score,
            "stress_level": prediction,
            "confidence": confidence,
            "questions_answered": questions_answered
        })

    except Exception as e:
        print(f"General error in assess_stress: {str(e)}")
        return jsonify({"message": f"An error occurred: {str(e)}"}), 500

@app.route('/pss/history', methods=['GET'])
@token_required
def get_assessment_history(current_user):
    """Get user's assessment history"""
    try:
        history = list(assessments_collection.find(
            {"user_id": str(current_user['_id'])},
            {
                "responses": 1,
                "score": 1,
                "stress_level": 1,
                "timestamp": 1,
                "ai_confidence": 1,
                "questions_answered": 1,
                "_id": 0
            }
        ).sort("timestamp", -1))
        
        # Convert timestamp to string for JSON serialization
        for entry in history:
            entry['timestamp'] = entry['timestamp'].isoformat()
            
        return jsonify({"history": history})
    except Exception as e:
        return jsonify({"message": f"An error occurred: {str(e)}"}), 500
    
@app.route('/register', methods=['POST'])
def register():
    try:
        data = request.json
        
        # Validate required fields
        if not data:
            return jsonify({"message": "No data provided"}), 400
            
        email = data.get('email')
        password = data.get('password')
        username = data.get('username')  
        
        if not email or not password:
            return jsonify({"message": "Email and password are required"}), 400
            
        # Validate email format (basic check)
        if '@' not in email:
            return jsonify({"message": "Invalid email format"}), 400
            
        # Check password length
        if len(password) < 6:
            return jsonify({"message": "Password must be at least 6 characters long"}), 400

        # Check if user exists
        if users_collection.find_one({"email": email}):
            return jsonify({"message": "User already exists"}), 400

        # Create user
        hashed_password = generate_password_hash(password, method='sha256')
        result = users_collection.insert_one({
            "email": email,
            "username": username,  
            "password": hashed_password,
            "created_at": datetime.datetime.utcnow()
        })
        
        # Initialize knowledge base for new user
        try:
            initialize_user_knowledge_base(result.inserted_id)
        except Exception as e:
            # If knowledge base initialization fails, remove the user
            users_collection.delete_one({"_id": result.inserted_id})
            raise Exception(f"Failed to initialize knowledge base: {str(e)}")
        
        return jsonify({
            "message": "User registered successfully",
            "user_id": str(result.inserted_id)
        }), 201
        
    except Exception as e:
        print(f"Registration error: {str(e)}")
        return jsonify({"message": f"Registration failed: {str(e)}"}), 500

@app.route('/login', methods=['POST'])
def login():
    try:
        data = request.json
        email = data.get('email')
        password = data.get('password')

        user = users_collection.find_one({"email": email})
        if not user:
            return jsonify({"message": "Invalid email or password."}), 401

        if not check_password_hash(user['password'], password):
            return jsonify({"message": "Invalid email or password."}), 401

        token = jwt.encode({
            'email': email,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, app.config['SECRET_KEY'], algorithm="HS256")

        return jsonify({"token": token}), 200
    except:
        return jsonify({"message": "An error occurred."}), 500

@app.route('/protected', methods=['GET'])
@token_required
def protected_route(current_user):
    try:
        return jsonify({"message": f"Welcome {current_user['email']}!"})
    except:
        return jsonify({"message": "An error occurred."}), 500

@app.route('/reset-password', methods=['POST'])
def reset_password():
    try:
        data = request.json
        email = data.get('email')
        new_password = data.get('new_password')

        # Validate inputs
        if not email or not new_password:
            return jsonify({"message": "Email and new_password are required."}), 400

        # Check if user exists
        user = users_collection.find_one({"email": email})
        if not user:
            return jsonify({"message": "Email not registered."}), 404

        # Check if new password is different from old
        if check_password_hash(user['password'], new_password):
            return jsonify({"message": "New password must not match the old password."}), 400

        # Hash and update the new password
        hashed_password = generate_password_hash(new_password, method='sha256')
        users_collection.update_one({"email": email}, {"$set": {"password": hashed_password}})
        return jsonify({"message": "Password reset successfully."}), 200

    except:
        return jsonify({"message": "An error occurred."}), 500

# Run the app
if __name__ == '__main__':
    app.run(port=int(os.getenv("PORT", 5001)), debug=True)
