from flask import Flask, request, jsonify
import pickle
import sklearn
from sklearn.ensemble import RandomForestClassifier
import google.generativeai as genai
from google.generativeai import GenerativeModel

class FertilizerRecommendation:
    def __init__(self, gemini_api_key=None):
        # Load model and encoders
        with open("ai_models/fertilizer_model.pkl", "rb") as f:
            self.model = pickle.load(f)

        with open("ai_models/label_encoders.pkl", "rb") as f:
            self.label_encoders = pickle.load(f)

        # Initialize Gemini
        self.gemini_model = None
        if gemini_api_key:
            genai.configure(api_key=gemini_api_key)
            self.gemini_model = GenerativeModel('gemini-pro')

    def predict(self, data):
        try:
            # First make the ML prediction
            ml_prediction = self._make_ml_prediction(data)
            
            # If prediction was successful, add Gemini explanation
            if 'fertilizerType' in ml_prediction:
                explanation = self._get_fertilizer_explanation(ml_prediction['fertilizerType'])
                ml_prediction['explanation'] = explanation
            
            return ml_prediction
            
        except Exception as e:
            return {'error': str(e)}

    def _make_ml_prediction(self, data):
        """Core ML prediction logic"""
        # Validate required fields
        required_fields = ['soilType', 'nitrogen', 'phosphorus', 'potassium', 'pH', 'cropType']
        for field in required_fields:
            if field not in data:
                return {'error': f'Missing required field: {field}'}

        # Transform categorical features
        soil = self.label_encoders['Soil Type'].transform([data['soilType']])[0]
        crop = self.label_encoders['Crop Type'].transform([data['cropType']])[0]

        # Prepare input features (8 features)
        input_features = [
            float(data.get('temperature', 25)),
            float(data.get('humidity', 50)),
            float(data.get('moisture', 50)),
            soil,
            crop,
            float(data['nitrogen']),
            float(data['phosphorus']),
            float(data['pH'])
        ]

        # Make prediction
        prediction = self.model.predict([input_features])[0]
        fertilizer = self.label_encoders['Fertilizer Name'].inverse_transform([prediction])[0]

        return {
            'fertilizerType': fertilizer,
            'status': 'success',
            'inputData': data
        }

    def _get_fertilizer_explanation(self, fertilizer_name):
        """
        Get structured explanation from Gemini about the fertilizer
        
        Args:
            fertilizer_name: Name of recommended fertilizer
            
        Returns:
            Dictionary with formatted explanation
        """
        if not self.gemini_model:
            return self._get_fallback_explanation()
            
        prompt = f"""
        Provide a concise explanation for why {fertilizer_name} is recommended for plants.
        Structure the response in this exact format:

        **Best For**
        [1-2 sentences describing which crops/conditions it works best for]

        **Key Benefits**
        - [Benefit 1]
        - [Benefit 2]
        - [Benefit 3]

        **When To Use**
        - [Ideal condition 1]
        - [Ideal condition 2]

        Also provide the fertilizer type ("Organic", "Inorganic", or "Mixed") in a separate line.
        """
        
        try:
            response = self.gemini_model.generate_content(prompt)
            return self._format_gemini_response(response.text, fertilizer_name)
        except Exception as e:
            print(f"Gemini error: {str(e)}")
            return self._get_fallback_explanation()

    def _format_gemini_response(self, text, fertilizer_name):
        """
        Format Gemini's response into structured data
        
        Args:
            text: Raw response text from Gemini
            fertilizer_name: Name of the fertilizer
            
        Returns:
            Dictionary with parsed explanation
        """
        try:
            sections = {
                'best_for': [],
                'benefits': [],
                'when_to_use': [],
                'type': 'Mixed'
            }
            
            current_section = None
            
            for line in text.split('\n'):
                line = line.strip()
                if not line:
                    continue
                
                if line.startswith("**Best For**"):
                    current_section = 'best_for'
                elif line.startswith("**Key Benefits**"):
                    current_section = 'benefits'
                elif line.startswith("**When To Use**"):
                    current_section = 'when_to_use'
                elif line.lower().startswith("fertilizer type:"):
                    sections['type'] = line.split(':')[1].strip()
                elif line.startswith('-'):
                    if current_section in sections:
                        sections[current_section].append(line[1:].strip())
                elif current_section == 'best_for':
                    sections['best_for'].append(line)
            
            # Clean up the best_for section
            if sections['best_for']:
                sections['best_for'] = ' '.join(sections['best_for'])
            else:
                sections['best_for'] = f"General purpose fertilizer {fertilizer_name}"
            
            return {
                'fertilizer': fertilizer_name,
                'best_for': sections['best_for'],
                'benefits': sections['benefits'] if sections['benefits'] else self._get_fallback_explanation()['benefits'],
                'when_to_use': sections['when_to_use'] if sections['when_to_use'] else self._get_fallback_explanation()['when_to_use'],
                'type': sections['type'] if sections['type'] in ['Organic', 'Inorganic', 'Mixed'] else 'Mixed'
            }
            
        except Exception as e:
            print(f"Formatting error: {str(e)}")
            return self._get_fallback_explanation()

    def _get_fallback_explanation(self):
        """Default explanation if Gemini fails"""
        return {
            'best_for': 'General purpose fertilizer recommendation',
            'benefits': [
                'Provides essential nutrients for plant growth',
                'Improves soil fertility',
                'Enhances crop yield'
            ],
            'when_to_use': [
                'During main growing season',
                'When soil tests indicate nutrient deficiency'
            ],
            'type': 'Mixed'
        }