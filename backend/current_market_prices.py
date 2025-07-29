from flask import Flask, request, jsonify
import requests
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Your API key
API_KEY = "REDACTED"
RESOURCE_ID = "9ef84268-d588-465a-a308-a864a43d0070"

@app.route('/api/market-prices', methods=['GET'])
def get_market_prices():
    market = request.args.get('market')
    if not market:
        return jsonify({"error": "Market parameter is required"}), 400
    
    # Get all commodities for the given market
    url = f"https://api.data.gov.in/resource/{RESOURCE_ID}?api-key={API_KEY}&format=json&filters[market]={market}&limit=100"
    
    try:
        response = requests.get(url)
        if response.status_code == 200:
            data = response.json()
            records = data.get("records", [])
            
            if not records:
                return jsonify({"error": "No data found for this market"}), 404
            
            # Process records to get unique commodities with their latest prices
            commodities = {}
            for record in records:
                commodity = record['commodity']
                if commodity not in commodities:
                    commodities[commodity] = {
                        "crop": commodity,
                        "currentPrice": record['modal_price'],
                        "msp": int(record['modal_price']) * 0.9,  # Mock MSP (90% of current price)
                        "change": f"{(float(record['modal_price']) - float(record['min_price'])) / float(record['modal_price']) * 100:.1f}%",
                        "trend": "up" if float(record['modal_price']) > float(record['min_price']) else "down",
                        "market": market
                    }
            
            return jsonify(list(commodities.values()))
        else:
            return jsonify({"error": "Failed to fetch data from API"}), response.status_code
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/commodity-details', methods=['GET'])
def get_commodity_details():
    market = request.args.get('market')
    commodity = request.args.get('commodity')
    
    if not market or not commodity:
        return jsonify({"error": "Both market and commodity parameters are required"}), 400
    
    # Get historical data for the commodity in this market
    url = f"https://api.data.gov.in/resource/{RESOURCE_ID}?api-key={API_KEY}&format=json&filters[market]={market}&filters[commodity]={commodity}&limit=100"
    
    try:
        response = requests.get(url)
        if response.status_code == 200:
            data = response.json()
            records = data.get("records", [])
            
            if not records:
                return jsonify({"error": "No data found for this commodity in the specified market"}), 404
            
            # Get the latest record for current price
            latest_record = records[0]
            current_price = float(latest_record['modal_price'])
            msp = current_price * 0.9  # Mock MSP
            
            # Create mock historical data (last 12 months)
            history = [
                {"month": "Jan", "price": int(current_price * 0.85)},
                {"month": "Feb", "price": int(current_price * 0.88)},
                {"month": "Mar", "price": int(current_price * 0.91)},
                {"month": "Apr", "price": int(current_price * 0.89)},
                {"month": "May", "price": int(current_price * 0.92)},
                {"month": "Jun", "price": int(current_price * 0.95)},
                {"month": "Jul", "price": int(current_price * 0.97)},
                {"month": "Aug", "price": int(current_price * 0.99)},
                {"month": "Sep", "price": int(current_price * 1.02)},
                {"month": "Oct", "price": int(current_price * 1.05)},
                {"month": "Nov", "price": int(current_price * 1.03)},
                {"month": "Dec", "price": int(current_price)}
            ]
            
            # Mock forecast data
            forecast = {
                "1 month": {
                    "predicted": int(current_price * 1.02),
                    "confidence": 78,
                    "factors": [
                        "Seasonal demand increase",
                        "Reduced supply from neighboring markets",
                        "Transportation costs rising"
                    ]
                },
                "3 months": {
                    "predicted": int(current_price * 1.08),
                    "confidence": 82,
                    "factors": [
                        "Festival season approaching",
                        "Expected export demand",
                        "Crop rotation affecting supply"
                    ]
                },
                "6 months": {
                    "predicted": int(current_price * 0.95),
                    "confidence": 65,
                    "factors": [
                        "New harvest expected",
                        "Government import policies",
                        "Alternative crops becoming popular"
                    ]
                },
                "1 year": {
                    "predicted": int(current_price * 1.12),
                    "confidence": 70,
                    "factors": [
                        "Long-term demand growth",
                        "Climate patterns favoring quality",
                        "Export market expansion"
                    ]
                }
            }
            
            response_data = {
                "commodity": commodity,
                "market": market,
                "currentPrice": current_price,
                "msp": msp,
                "history": history,
                "forecast": forecast
            }
            
            return jsonify(response_data)
        else:
            return jsonify({"error": "Failed to fetch data from API"}), response.status_code
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)