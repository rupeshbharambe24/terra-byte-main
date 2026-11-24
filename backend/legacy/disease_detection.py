
import tensorflow as tf
import numpy as np
from PIL import Image
import io
import os
import google.generativeai as genai
import json

class DiseaseDetector:
    def __init__(self):
        self.model_path = r"ai_models/crop-disease-model.keras"
        self.model = tf.keras.models.load_model(self.model_path)
        self.gemini_model = genai.GenerativeModel('gemini-1.5-flash')
        genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
        
        self.CLASS_NAMES = [
            'Apple___Apple_scab', 
            'Apple___Black_rot', 
            'Apple___Cedar_apple_rust', 
            'Apple___healthy', 
            'Blueberry___healthy', 
            'Cherry_(including_sour)___healthy', 
            'Cherry_(including_sour)___Powdery_mildew', 
            'Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot', 
            'Corn_(maize)___Common_rust_', 
            'Corn_(maize)___healthy', 
            'Corn_(maize)___Northern_Leaf_Blight', 
            'Grape___Black_rot', 
            'Grape___Esca_(Black_Measles)', 
            'Grape___healthy', 
            'Grape___Leaf_blight_(Isariopsis_Leaf_Spot)', 
            'Orange___Haunglongbing_(Citrus_greening)', 
            'Peach___Bacterial_spot', 
            'Peach___healthy', 
            'Pepper,_bell___Bacterial_spot', 
            'Pepper,_bell___healthy', 
            'Potato___Early_blight', 
            'Potato___healthy', 
            'Potato___Late_blight', 
            'Raspberry___healthy', 
            'Soybean___healthy', 
            'Squash___Powdery_mildew', 
            'Strawberry___healthy', 
            'Strawberry___Leaf_scorch', 
            'Tomato___Bacterial_spot', 
            'Tomato___Early_blight', 
            'Tomato___healthy', 
            'Tomato___Late_blight', 
            'Tomato___Leaf_Mold', 
            'Tomato___Septoria_leaf_spot', 
            'Tomato___Spider_mites Two-spotted_spider_mite', 
            'Tomato___Target_Spot', 
            'Tomato___Tomato_mosaic_virus', 
            'Tomato___Tomato_Yellow_Leaf_Curl_Virus'
        ]

    def preprocess_image(self, image_file):
        """Process uploaded image for model prediction"""
        image = Image.open(io.BytesIO(image_file.read()))
        image = image.resize((256, 256))
        image_array = np.array(image) / 255.0
        return np.expand_dims(image_array, axis=0)

    def predict_disease(self, image_file):
        """Run full prediction pipeline"""
        try:
            # Image processing
            img_array = self.preprocess_image(image_file)
            
            # Model prediction
            predictions = self.model.predict(img_array)
            predicted_class = self.CLASS_NAMES[np.argmax(predictions[0])]
            confidence = float(np.max(predictions[0]))
            
            # Get treatment plan
            treatment_data = self._get_treatment_plan(predicted_class)
            
            return {
                'disease': predicted_class.replace('_', ' '),
                'confidence': int(confidence * 100) / 100,
                'severity': treatment_data.get('severity', 'Medium'),
                'treatment': treatment_data.get('treatment', []),
                'prevention': treatment_data.get('prevention', [])
            }
            
        except Exception as e:
            raise e

    def _get_treatment_plan(self, disease):
        """Get treatment suggestions from Gemini with better formatting"""
        prompt = f"""
        Provide a concise treatment and prevention guide for {disease} in plants.
        Structure the response in this exact format:

        **About the Disease**
        [Brief 1-2 sentence description of the disease]

        **Immediate Treatment**
        - [Treatment step 1]
        - [Treatment step 2]
        - [Treatment step 3]

        **Prevention Tips**
        - [Prevention tip 1]
        - [Prevention tip 2]
        - [Prevention tip 3]

        Also provide the severity level ("Low", "Medium", or "High") in a separate line.
        """
        
        try:
            response = self.gemini_model.generate_content(prompt)
            return self._format_response(response.text, disease)
        except:
            return self._get_fallback_plan()

    def _format_response(self, text, disease):
        try:
            about = []
            treatment = []
            prevention = []
            severity = "Medium"

            lines = [line.strip() for line in text.split('\n') if line.strip()]
            current_section = None

            for line in lines:
                if line.startswith("**About the Disease**"):
                    current_section = "about"
                    continue
                elif line.startswith("**Prevention Tips**"):
                    current_section = "prevention"
                    continue
                elif line.startswith("**Immediate Treatment**"):
                    current_section = "treatment"
                    continue
                elif line.lower().startswith("severity:"):
                    severity = line.split(":")[1].strip()
                    continue
                elif line.startswith("-"):
                    content = line[1:].strip()
                    if current_section == "about":
                        about.append(content)
                    elif current_section == "prevention":
                        prevention.append(content)
                    elif current_section == "treatment":
                        treatment.append(content)

            # Markdown-style formatted response
            prevention_text = '\n- '.join(prevention) if prevention else 'Practice crop rotation\n- Maintain plant spacing'
            treatment_text = '\n- '.join(treatment) if treatment else 'Remove affected parts\n- Apply fungicide'
            about_text = about[0] if about else f"Affects {disease.split('___')[0]}"
            severity_text = severity if severity in ['Low', 'Medium', 'High'] else 'Medium'

            formatted = f"""**Disease:** {disease.replace('_', ' ')}

            **About the Disease**  
            {about_text}

            **Prevention Tips**  
            - {prevention_text}

            **Immediate Treatment**  
            - {treatment_text}

            **Severity:** {severity_text}
            """


            return {
                'disease': disease.replace('_', ' '),
                'about': about[0] if about else "",
                'treatment': treatment,
                'prevention': prevention,
                'severity': severity,
                'formatted': formatted
            }

        except:
            return self._get_fallback_plan()


    def _parse_gemini_response(self, text):
        """Parse Gemini's text response into structured JSON"""
        try:
            start = text.find('{')
            end = text.rfind('}') + 1
            return json.loads(text[start:end])
        except:
            return self._get_fallback_plan()

    def _get_fallback_plan(self):
        return {
            'treatment': [
                'Remove affected plant parts',
                'Apply appropriate fungicide'
            ],
            'prevention': [
                'Practice crop rotation',
                'Maintain proper plant spacing'
            ],
            'severity': 'Medium'
        }