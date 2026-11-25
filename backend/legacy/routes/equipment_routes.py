from flask import Blueprint, request, jsonify
from firebase_admin import firestore
import datetime
import logging

equipment_bp = Blueprint('equipment', __name__)

@equipment_bp.route('/rent', methods=['POST'])
def handle_rental():
    print("\n=== INCOMING RENTAL REQUEST ===")
    print("Headers:", request.headers)
    try:
        print("JSON Data:", request.json)
    except Exception as e:
        print("Failed to parse JSON:", str(e))
    print("Method:", request.method)
    print("Path:", request.path)
    print("=============================\n")
    try:
        db = firestore.client()  # Get Firestore client here
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['equipment', 'customerName', 'phone', 'farmAddress', 'city', 
                         'state', 'pincode', 'startDate', 'endDate', 'purpose']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Prepare rental data
        rental_data = {
            'equipment': data['equipment'],
            'customer_info': {
                'name': data['customerName'],
                'email': data.get('email', ''),
                'phone': data['phone'],
                'address': data['farmAddress'],
                'city': data['city'],
                'state': data['state'],
                'pincode': data['pincode']
            },
            'rental_period': {
                'start_date': datetime.datetime.strptime(data['startDate'], '%Y-%m-%d'),
                'end_date': datetime.datetime.strptime(data['endDate'], '%Y-%m-%d'),
                'start_time': data.get('startTime', ''),
                'end_time': data.get('endTime', '')
            },
            'duration_hours': data.get('durationHours', 0),
            'purpose': data['purpose'],
            'services': {
                'operator_required': data.get('operatorRequired', False),
                'transport_required': data.get('transportRequired', False)
            },
            'special_requirements': data.get('specialRequirements', ''),
            'total_amount': data.get('totalAmount', 0),
            'rental_date': datetime.datetime.now(),
            'status': 'pending',
            'owner_id': data['equipment'].get('owner_id', ''),  # Link to equipment owner
            'processed': False
        }
        
        # Add to Firestore
        rentals_ref = db.collection('equipment_rentals')
        new_rental_ref = rentals_ref.add(rental_data)
        
        return jsonify({
            'success': True,
            'rental_id': new_rental_ref[1].id,
            'message': 'Equipment booked successfully'
        }), 201
        
    except Exception as e:
        logging.error(f"Error processing rental: {str(e)}")
        return jsonify({'error': 'Failed to process rental'}), 500

@equipment_bp.route('/api/equipment/rentals/<owner_id>', methods=['GET'])
def get_owner_rentals(owner_id):
    try:
        if not owner_id:
            return jsonify({'error': 'Owner ID is required'}), 400
        
        rentals_ref = db.collection('equipment_rentals')
        query = rentals_ref.where('owner_id', '==', owner_id).order_by('rental_date', direction=firestore.Query.DESCENDING)
        docs = query.stream()
        
        rentals = []
        for doc in docs:
            rental = doc.to_dict()
            rental['id'] = doc.id
            # Convert Firestore timestamps to strings
            if 'rental_date' in rental:
                rental['rental_date'] = rental['rental_date'].strftime('%Y-%m-%d %H:%M:%S')
            if 'rental_period' in rental:
                if 'start_date' in rental['rental_period']:
                    rental['rental_period']['start_date'] = rental['rental_period']['start_date'].strftime('%Y-%m-%d')
                if 'end_date' in rental['rental_period']:
                    rental['rental_period']['end_date'] = rental['rental_period']['end_date'].strftime('%Y-%m-%d')
            rentals.append(rental)
            
        return jsonify(rentals), 200
        
    except Exception as e:
        logging.error(f"Error fetching rentals: {str(e)}")
        return jsonify({'error': 'Failed to fetch rentals'}), 500