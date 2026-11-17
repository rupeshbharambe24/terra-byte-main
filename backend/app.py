from flask import Flask
from firebase_admin import credentials, initialize_app
import os
from flask_cors import CORS

def create_app():
    app = Flask(__name__)
    
    # Enable CORS with more specific configuration
    CORS(app, supports_credentials=True, resources={
        r"/api/*": {
            "origins": ["http://localhost:8080"],  # Your frontend URL
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type"],
            "supports_credentials": True
        }
    })
    
    # Initialize Firebase
    # Service-account JSON is NOT committed. Point FIREBASE_CREDENTIALS (or
    # GOOGLE_APPLICATION_CREDENTIALS) at your own key file, or place it at
    # backend/firebase-serviceAccountKey.json (git-ignored).
    cred_path = (
        os.getenv('FIREBASE_CREDENTIALS')
        or os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
        or os.path.join(os.path.dirname(__file__), 'firebase-serviceAccountKey.json')
    )
    cred = credentials.Certificate(cred_path)
    firebase_app = initialize_app(cred)
    
    # Import all blueprints
    from routes.marketplace_routes import marketplace_bp
    from routes.equipment_routes import equipment_bp
    from routes.disease_routes import disease_bp
    from routes.price_forecast_routes import price_forecast_bp
    from routes.fertilizer_routes import fertilizer_bp
    
    # Register blueprints with proper prefixes
    app.register_blueprint(marketplace_bp, url_prefix='/api/marketplace')
    app.register_blueprint(equipment_bp, url_prefix='/api/equipment')
    app.register_blueprint(disease_bp, url_prefix='/api/disease')
    app.register_blueprint(price_forecast_bp, url_prefix='/api/price-forecast')
    app.register_blueprint(fertilizer_bp, url_prefix='/api')
    
    
    return app



if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5000, debug=True)