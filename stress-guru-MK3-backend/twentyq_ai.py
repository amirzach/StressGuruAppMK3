import numpy as np
from collections import defaultdict
import joblib
import warnings
import os
import json
from math import log2

class AdaptiveStress20QAI:
    def __init__(self):
        warnings.filterwarnings('ignore')
        
        # PSS-10 questions
        self.questions = [
            "Have you been upset because of something that happened unexpectedly?",
            "Have you felt unable to control the important things in your life?",
            "Have you felt nervous and stressed?",
            "Have you felt confident about your ability to handle your personal problems?",
            "Have you felt that things were going your way?",
            "Have you found that you could not cope with all the things you had to do?",
            "Have you been able to control irritations in your life?",
            "Have you felt that you were on top of things?",
            "Have you been angered because of things that happened outside of your control?",
            "Have you felt difficulties were piling up so high that you could not overcome them?"
        ]
        
        self.response_values = {
            'never': 0,
            'almost never': 1,
            'sometimes': 2,
            'fairly often': 3,
            'very often': 4
        }

        self.reverse_score_questions = [3, 4, 6, 7]
        
        # Initialize knowledge base with some example patterns
        self.knowledge_base = self.initialize_knowledge_base()
        
        # Track information gain for each question
        self.question_weights = {i: 1.0 for i in range(len(self.questions))}
        
        # Historical data storage
        self.historical_data = []

    def initialize_knowledge_base(self):
        """Initialize with some common stress pattern examples"""
        knowledge_base = {
            'patterns': [
                {
                    'responses': {
                        '0': 'very often',
                        '1': 'very often',
                        '2': 'fairly often',
                        '3': 'almost never',
                        '4': 'almost never'
                    },
                    'stress_level': 'high stress',
                    'frequency': 5
                },
                {
                    'responses': {
                        '0': 'never',
                        '1': 'almost never',
                        '2': 'sometimes',
                        '3': 'fairly often',
                        '4': 'fairly often'
                    },
                    'stress_level': 'low stress',
                    'frequency': 5
                },
                {
                    'responses': {
                        '0': 'sometimes',
                        '1': 'sometimes',
                        '2': 'sometimes',
                        '3': 'sometimes',
                        '4': 'sometimes'
                    },
                    'stress_level': 'moderate stress',
                    'frequency': 5
                }
            ]
        }
        return knowledge_base

    def calculate_information_gain(self, question_idx, current_responses):
        """Calculate information gain for a specific question based on current knowledge"""
        try:
            total_patterns = len(self.knowledge_base.get('patterns', []))
            if total_patterns == 0:
                return 0
                
            # Calculate current entropy
            stress_counts = defaultdict(int)
            for pattern in self.knowledge_base.get('patterns', []):
                stress_counts[pattern.get('stress_level', 'moderate stress')] += pattern.get('frequency', 1)
            
            total_freq = sum(stress_counts.values()) or 1  # Avoid division by zero
            current_entropy = 0
            for count in stress_counts.values():
                p = count / total_freq
                current_entropy -= p * log2(p) if p > 0 else 0
                
            # Calculate conditional entropy
            answer_patterns = defaultdict(lambda: defaultdict(int))
            for pattern in self.knowledge_base.get('patterns', []):
                if str(question_idx) in pattern.get('responses', {}):
                    answer = pattern['responses'][str(question_idx)]
                    answer_patterns[answer][pattern.get('stress_level', 'moderate stress')] += pattern.get('frequency', 1)
                    
            conditional_entropy = 0
            total_answers = sum(sum(stress_dict.values()) for stress_dict in answer_patterns.values()) or 1
            
            for answer_counts in answer_patterns.values():
                answer_total = sum(answer_counts.values()) or 1
                answer_entropy = 0
                for count in answer_counts.values():
                    p = count / answer_total
                    answer_entropy -= p * log2(p) if p > 0 else 0
                conditional_entropy += (answer_total / total_answers) * answer_entropy
                
            return max(0, current_entropy - conditional_entropy)
            
        except Exception as e:
            print(f"Error calculating information gain: {str(e)}")
            return 0

    def get_next_question(self, current_responses):
        """
        Determine the next question to ask based on current responses.
        Returns the index of the next question.
        """
        try:
            # Validate input
            if not isinstance(current_responses, list):
                current_responses = []
                
            # Get already asked questions
            asked_indices = set()
            for response in current_responses:
                try:
                    if isinstance(response, (list, tuple)) and len(response) >= 2:
                        idx = response[0]
                        if isinstance(idx, (int, float)):
                            asked_indices.add(int(idx))
                except (IndexError, ValueError, TypeError):
                    continue
                    
            # Get remaining questions
            all_indices = set(range(len(self.questions)))
            remaining_questions = list(all_indices - asked_indices)
            
            # If no questions remain, return None to indicate completion
            if not remaining_questions:
                return None
                
            # If no valid knowledge base or on first question, return the first unanswered question
            if not self.knowledge_base.get('patterns') or not current_responses:
                return min(remaining_questions)
                
            # Calculate information gain for remaining questions
            gains = []
            for idx in remaining_questions:
                try:
                    gain = self.calculate_information_gain(idx, current_responses)
                    weight = float(self.question_weights.get(str(idx), 1.0))
                    weighted_gain = gain * weight
                    gains.append((weighted_gain, idx))
                except Exception as e:
                    print(f"Error calculating gain for question {idx}: {str(e)}")
                    gains.append((0, idx))
                    
            # If we couldn't calculate gains, return the first unanswered question
            if not gains:
                return min(remaining_questions)
                
            # Return the question with highest information gain
            return max(gains, key=lambda x: x[0])[1]
            
        except Exception as e:
            print(f"Error in get_next_question: {str(e)}")
            # Fallback to first unanswered question
            try:
                asked = set(idx for idx, _ in current_responses if isinstance(idx, (int, float)))
                for i in range(len(self.questions)):
                    if i not in asked:
                        return i
                return None
            except Exception:
                return 0

    def predict_stress_level(self, responses):
        """Predict stress level using pattern matching and similarity scoring"""
        if not responses:
            return "moderate stress", 0.5
            
        # Convert responses to dict format for easier matching
        current_responses = {str(idx): resp for idx, resp in responses}
        
        # Calculate similarity scores with known patterns
        pattern_scores = []
        for pattern in self.knowledge_base['patterns']:
            score = 0
            matches = 0
            for idx, resp in current_responses.items():
                if idx in pattern['responses']:
                    if resp == pattern['responses'][idx]:
                        score += 1
                    matches += 1
            
            if matches > 0:
                similarity = score / matches
                pattern_scores.append((similarity * pattern['frequency'], pattern['stress_level']))
                
        if not pattern_scores:
            return self.calculate_traditional_score(responses)
            
        # Weight predictions by similarity and frequency
        stress_weights = defaultdict(float)
        total_weight = 0
        
        for weight, stress_level in pattern_scores:
            stress_weights[stress_level] += weight
            total_weight += weight
            
        if total_weight == 0:
            return self.calculate_traditional_score(responses)
            
        # Get highest weighted prediction and calculate confidence
        prediction = max(stress_weights.items(), key=lambda x: x[1])[0]
        confidence = stress_weights[prediction] / total_weight
        
        return prediction, confidence

    def calculate_traditional_score(self, responses):
        """Fallback to traditional PSS scoring"""
        total_score = 0
        for idx, response in responses:
            score = self.response_values[response]
            if idx in self.reverse_score_questions:
                score = 4 - score
            total_score += score
            
        # Scale score if not all questions answered
        total_score = total_score * (40 / (len(responses) * 4))
        
        if total_score <= 13:
            return "low stress", 0.5
        elif total_score <= 26:
            return "moderate stress", 0.5
        else:
            return "high stress", 0.5

    def update_knowledge_base(self, responses, final_stress_level):
        """Update knowledge base with new response pattern"""
        response_dict = {str(idx): resp for idx, resp in responses}
        
        # Look for similar existing patterns
        for pattern in self.knowledge_base['patterns']:
            matches = 0
            total = 0
            for idx, resp in response_dict.items():
                if idx in pattern['responses']:
                    total += 1
                    if resp == pattern['responses'][idx]:
                        matches += 1
                        
            # If pattern is very similar, just update frequency
            if total > 0 and matches/total > 0.8 and pattern['stress_level'] == final_stress_level:
                pattern['frequency'] += 1
                return
                
        # Add new pattern
        self.knowledge_base['patterns'].append({
            'responses': response_dict,
            'stress_level': final_stress_level,
            'frequency': 1
        })

    def save_model(self, filename="stress_20q_model.pkl"):
        """Save the knowledge base and weights"""
        model_data = {
            'knowledge_base': self.knowledge_base,
            'question_weights': self.question_weights,
            'historical_data': self.historical_data
        }
        try:
            joblib.dump(model_data, filename)
            print(f"\nModel saved successfully to {filename}")
        except Exception as e:
            print(f"\nWarning: Could not save model - {str(e)}")

    def load_model(self, filename="stress_20q_model.pkl"):
        """Load the knowledge base and weights"""
        if not os.path.exists(filename):
            return False
            
        try:
            model_data = joblib.load(filename)
            self.knowledge_base = model_data['knowledge_base']
            self.question_weights = model_data['question_weights']
            self.historical_data = model_data['historical_data']
            print(f"\nModel loaded successfully from {filename}")
            print(f"Knowledge base patterns: {len(self.knowledge_base['patterns'])}")
            return True
        except Exception as e:
            print(f"\nWarning: Could not load model - {str(e)}")
            return False

    def ask_question(self, question):
        """Get user response with input validation"""
        while True:
            print("\nIn the last month, " + question)
            response = input("(never/almost never/sometimes/fairly often/very often): ").lower().strip()
            if response in self.response_values:
                return response
            print("\nPlease answer with one of these options:")
            print("- never")
            print("- almost never")
            print("- sometimes")
            print("- fairly often")
            print("- very often")

    def conduct_assessment(self):
        """Conduct an adaptive stress assessment using 20Q approach"""
        print("\nWelcome to the 20 Questions Style Stress Assessment")
        print("This AI will learn from your responses to ask the most relevant questions.")
        
        if len(self.knowledge_base['patterns']) < 10:
            print("\nNote: The AI is still learning. Initial assessments will use basic pattern matching.")
            print("More accurate predictions will be available after more assessments.\n")
        else:
            print(f"\nAI trained on {len(self.knowledge_base['patterns'])} response patterns.")
        
        current_responses = []
        
        while len(current_responses) < len(self.questions):
            next_idx = self.get_next_question(current_responses)
            if next_idx is None:
                break
                
            response = self.ask_question(self.questions[next_idx])
            current_responses.append((next_idx, response))
            
            print(f"\nProgress: {len(current_responses)}/{len(self.questions)} questions completed")
            
            if len(current_responses) >= 3:
                prediction, confidence = self.predict_stress_level(current_responses)
                if confidence > 0.8:
                    print(f"\nPreliminary Assessment: {prediction} (Confidence: {confidence:.2f})")
                    if input("\nWould you like to continue for a more accurate assessment? (yes/no): ").lower() != 'yes':
                        break
        
        print("\nAnalyzing response pattern...")
        final_stress_level, confidence = self.predict_stress_level(current_responses)
        
        # Calculate traditional score for comparison
        total_score = 0
        for idx, response in current_responses:
            score = self.response_values[response]
            if idx in self.reverse_score_questions:
                score = 4 - score
            total_score += score
        
        if len(current_responses) < len(self.questions):
            total_score = total_score * (len(self.questions) / len(current_responses))
        
        print("Updating AI knowledge base...")
        self.update_knowledge_base(current_responses, final_stress_level)
        self.historical_data.append((current_responses, final_stress_level, total_score))
        
        print("\n=== Assessment Results ===")
        print(f"AI Prediction: {final_stress_level}")
        print(f"Confidence: {confidence:.2f}")
        print(f"Traditional PSS score: {total_score:.1f}")
        
        if total_score > 26 or final_stress_level == "high stress":
            print("\nNote: If you're experiencing high levels of stress, consider talking to a mental health professional.")
        
        return current_responses, final_stress_level, total_score

def main():
    assessment = AdaptiveStress20QAI()
    
    if not assessment.load_model():
        print("Starting with a new knowledge base...")
    
    while True:
        start = input("\nWould you like to take a stress assessment? (yes/no): ").lower().strip()
        if start != 'yes':
            break
            
        responses, stress_level, score = assessment.conduct_assessment()
        assessment.save_model()
        
        feedback = input("\nWould you like to see your detailed responses? (yes/no): ").lower().strip()
        if feedback == 'yes':
            print("\n=== Detailed Responses ===")
            for idx, response in responses:
                print(f"\nQ{idx+1}: {assessment.questions[idx]}")
                print(f"Your response: {response}")
    
    print("\nThank you for using the 20 Questions Style Stress Assessment.")

if __name__ == "__main__":
    main()