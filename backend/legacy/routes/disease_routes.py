from flask import Blueprint, request, jsonify
from disease_detection import DiseaseDetector
import traceback

disease_bp = Blueprint('disease', __name__)
detector = DiseaseDetector()

@disease_bp.route('/detect', methods=['POST'])
def detect_disease():
    if 'image' not in request.files:
        return jsonify({'error': 'No image uploaded'}), 400
    
    try:
        image_file = request.files['image']
        result = detector.predict_disease(image_file)
        return jsonify(result)
        
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500