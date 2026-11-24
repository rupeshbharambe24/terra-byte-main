from flask import Blueprint, request, jsonify
from fertilizer_recommendation import FertilizerRecommendation
import traceback

# Change to empty url_prefix since we'll handle the full path in the route
fertilizer_bp = Blueprint('fertilizer', __name__)
detector = FertilizerRecommendation()

@fertilizer_bp.route('/fertilizer-recommendation', methods=['POST', 'OPTIONS'])
def fertilizer_recommendation():    
    if request.method == 'OPTIONS':
        # Handle preflight request
        response = jsonify({'status': 'preflight ok'})
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:8080')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST')
        return response
    
    try:
        data = request.get_json()
        print("Received data:", data)
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        result = detector.predict(data)
        print("Prediction result:", result)
        
        if 'error' in result:
            return jsonify(result), 400
        
        response = jsonify(result)
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:8080')
        return response
        
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500