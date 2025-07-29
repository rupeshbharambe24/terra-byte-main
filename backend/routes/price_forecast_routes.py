from flask import Blueprint, jsonify, request
from price_forecast import PriceForecast

price_forecast_bp = Blueprint('price_forecast', __name__)
price_forecast = PriceForecast()

@price_forecast_bp.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'loaded_models': price_forecast.get_loaded_models()
    })

@price_forecast_bp.route('/', methods=['POST', 'OPTIONS'])
def forecast_prices():
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No input data provided'}), 400
        
        commodity = data.get('commodity', '').lower()
        date_str = data.get('date', '')
        
        if not commodity or not date_str:
            return jsonify({'error': 'Commodity and date are required'}), 400
        
        predictions = price_forecast.get_predictions(commodity, date_str)
        return jsonify(predictions)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500