import pandas as pd
import numpy as np
from tensorflow.keras.models import load_model
import joblib
from datetime import datetime, timedelta
from tensorflow.keras.layers import TFSMLayer

class PriceForecast:
    def __init__(self):
        # Path configurations
        self.MODEL_PATHS = {
            'bhindi': {
                'model': "ai_models/Bhendi/Bhendi_price_lstm_model.keras",
                'feature_scaler': "ai_models/Bhendi/Bhendi_feature_scaler.save",
                'target_scaler': "ai_models/Bhendi/Bhendi_target_scaler.save",
                'data': "datasets/Bhendi_with_distances.xlsx"
            },
            'onion': {
                'model': "ai_models/Onion/onion_price_lstm_model.keras",
                'feature_scaler': "ai_models/Onion/onion_feature_scaler.save",
                'target_scaler': "ai_models/Onion/onion_target_scaler.save",
                'data': "datasets/Onion_Merged_with_distance.xlsx"
            },
            'potato': {
                'model': "ai_models/Potato/Potato_price_lstm_model.keras",
                'feature_scaler': "ai_models/Potato/Potato_feature_scaler.save",
                'target_scaler': "ai_models/Potato/Potato_target_scaler.save",
                'data': "datasets/Potato_with_distances.xlsx"
            },
            'tomato': {
                'model': "ai_models/Tomato/Tomato_price_lstm_model.keras",
                'feature_scaler': "ai_models/Tomato/Tomato_feature_scaler.save",
                'target_scaler': "ai_models/Tomato/Tomato_target_scaler.save",
                'data': "datasets/Tomato_with_distances.xlsx"
            }
        }
        
        # Load all models and data at startup
        self.commodity_data = {}
        print("Loading all commodity models and data...")
        self.load_all_models()
    
    def get_loaded_models(self):
        print("Fetching loaded models...")
        return list(self.commodity_data.keys())
    
    def load_all_models(self):
        for commodity, paths in self.MODEL_PATHS.items():
            try:
                # Load model - handle different file formats
                if paths['model'].endswith('.save'):
                    # For SavedModel format (.save files)
                    model = TFSMLayer(paths['model'], call_endpoint='serving_default')
                else:
                    # For .keras or .h5 files
                    model = load_model(paths['model'])
                
                # Load scalers
                feature_scaler = joblib.load(paths['feature_scaler'])
                target_scaler = joblib.load(paths['target_scaler'])
                
                # Load and prepare data
                df = pd.read_excel(paths['data'])
                df = df.sort_values('Price Date')
                df['Price Date'] = pd.to_datetime(df['Price Date'])
                
                # Feature engineering
                df['Modal_Lag1'] = df['Modal Price (Rs./Quintal)'].shift(1)
                df['Modal_Roll7'] = df['Modal Price (Rs./Quintal)'].rolling(7).mean()
                df['Modal_Roll30'] = df['Modal Price (Rs./Quintal)'].rolling(30).mean()
                df.dropna(inplace=True)
                
                # Store everything
                self.commodity_data[commodity] = {
                    'model': model,
                    'feature_scaler': feature_scaler,
                    'target_scaler': target_scaler,
                    'data': df,
                    'features': self.get_features_for_commodity(commodity, df)
                }
                
                print(f"Successfully loaded {commodity} model and data")
            except Exception as e:
                print(f"Error loading {commodity}: {str(e)}")
                self.commodity_data[commodity] = None
            
    
    def get_features_for_commodity(self, commodity, df):
        """Get the feature columns for each commodity"""
        if commodity == 'bhindi':
            return [
                'temp', 'dew', 'humidity', 'precip', 'sealevelpressure',
                'Season_Monsoon', 'Season_Post_Monsoon', 'Season_Summer', 'Season_Winter',
                'Junnar(Narayangaon)', 'Junnar(Otur)', 'Khed', 'Khed(Chakan)',
                'Manchar', 'Pune', 'Pune(Pimpri)', 'Modal_Lag1', 'Modal_Roll7',
                'Modal_Roll30'
            ]
        elif commodity == 'onion':
            return [
                'temp', 'dew', 'humidity', 'precip', 'sealevelpressure',
                'Season_Monsoon', 'Season_Post_Monsoon', 'Season_Summer', 'Season_Winter',
                'Baramati', 'Indapur', 'Junnar', 'Alephata', 'Narayangaon', 'Otur',
                'Chakan', 'Manchar', 'Pune', 'Khadki', 'Manjri', 'Moshi', 'Pimpri',
                'Modal_Lag1', 'Modal_Roll7', 'Modal_Roll30'
            ]
        elif commodity == 'potato':
            return [
                'temp', 'dew', 'humidity', 'precip', 'sealevelpressure',
                'Season_Monsoon', 'Season_Post_Monsoon', 'Season_Summer', 'Season_Winter',
                'Junnar', 'Junnar(Narayangaon)', 'Junnar(Otur)', 'Khed(Chakan)', 'Manchar',
                'Pune', 'Pune(Khadki)', 'Pune(Manjri)', 'Pune(Moshi)', 'Modal_Lag1',
                'Modal_Roll7', 'Modal_Roll30'
            ]
        elif commodity == 'tomato':
            return [
                'temp', 'dew', 'humidity', 'precip', 'sealevelpressure',
                'Season_Monsoon', 'Season_Post_Monsoon', 'Season_Summer', 'Season_Winter',
                'Junnar(Narayangaon)', 'Junnar(Otur)',
                'Khed(Chakan)', 'Manchar', 'Pune', 'Pune(Khadki)', 'Pune(Manjri)',
                'Pune(Pimpri)', 'Modal_Lag1', 'Modal_Roll7', 'Modal_Roll30'
            ]
    
    def get_predictions(self, commodity, date_str):
        """Get predictions for a commodity and date"""
        print(f"Generating predictions for {commodity} on {date_str}")
        if commodity not in self.commodity_data:
            raise ValueError('Invalid commodity. Choose from bhindi, onion, potato, or tomato')
            
        if self.commodity_data[commodity] is None:
            raise ValueError(f'{commodity} model is not available')
            
        try:
            start_date = pd.to_datetime(date_str)
        except:
            raise ValueError('Invalid date format. Use YYYY-MM-DD')
            
        # Get commodity data
        model_data = self.commodity_data[commodity]
        df = model_data['data']
        
        # Validate date exists in dataset
        if start_date not in df['Price Date'].values:
            raise ValueError('Date not found in data. Please enter a valid date from the dataset.')
            
        idx = df[df['Price Date'] == start_date].index[0]
        
        # Check for sufficient history
        window_size = 30
        if idx < window_size:
            raise ValueError(f'Not enough history to generate input for {start_date.date()}.')
            
        # Prepare sequence for rolling predictions
        input_seq = df[model_data['features']].iloc[idx - window_size:idx].copy()
        forecast_dates = []
        predictions = []
        
        for day in range(15):
            # Scale and reshape input
            X_input = model_data['feature_scaler'].transform(input_seq)
            X_input = np.expand_dims(X_input, axis=0)
            
            # Predict
            y_pred_scaled = model_data['model'].predict(X_input, verbose=0)
            y_pred = model_data['target_scaler'].inverse_transform(y_pred_scaled)[0][0]
            
            # Convert numpy.float32 to native Python float
            predictions.append(float(y_pred))  # <-- This is the key fix
            
            # Simulate next row
            last_row = input_seq.iloc[-1].copy()
            
            # Shift modal price features
            last_row['Modal_Lag1'] = y_pred
            past_modal = list(input_seq['Modal_Lag1'].values[-6:]) + [y_pred]
            last_row['Modal_Roll7'] = np.mean(past_modal)
            past_modal30 = list(input_seq['Modal_Lag1'].values[-29:]) + [y_pred]
            last_row['Modal_Roll30'] = np.mean(past_modal30)
            
            # Append to sequence
            input_seq = pd.concat([input_seq, pd.DataFrame([last_row])], ignore_index=True)
            input_seq = input_seq.iloc[1:]  # keep size constant at 30
            
            forecast_dates.append((start_date + timedelta(days=day + 1)).strftime('%Y-%m-%d'))
        
        # Prepare response
        return {
            'commodity': commodity,
            'start_date': start_date.strftime('%Y-%m-%d'),
            'predictions': [
                {'date': date, 'price': round(price, 2)} 
                for date, price in zip(forecast_dates, predictions)
            ]
        }
        