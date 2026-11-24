from flask import Blueprint, request, jsonify
from firebase_admin import firestore
import datetime
import logging

marketplace_bp = Blueprint('marketplace', __name__)

@marketplace_bp.route('/purchase', methods=['POST'])
def handle_purchase():
    print("\n=== INCOMING REQUEST ===")
    print("Headers:", request.headers)
    print("JSON Data:", request.json)
    print("Method:", request.method)
    print("Path:", request.path)
    print("=======================\n")
    try:
        db = firestore.client()  # Get Firestore client here
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['product', 'quantity', 'customerName', 'phone', 'address', 'city', 'state', 'pincode', 'paymentMethod']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Prepare order data
        order_data = {
            'product': data['product'],
            'quantity': data['quantity'],
            'customer_info': {
                'name': data['customerName'],
                'email': data.get('email', ''),
                'phone': data['phone'],
                'address': data['address'],
                'city': data['city'],
                'state': data['state'],
                'pincode': data['pincode']
            },
            'payment_method': data['paymentMethod'],
            'special_instructions': data.get('specialInstructions', ''),
            'total_amount': data.get('totalAmount', 0),
            'order_date': datetime.datetime.now(),
            'status': 'pending',
            'vendor_id': data['product'].get('vendor_id', ''),  # Link to vendor
            'processed': False
        }
        
        # Add to Firestore
        orders_ref = db.collection('marketplace_orders')
        new_order_ref = orders_ref.add(order_data)
        
        return jsonify({
            'success': True,
            'order_id': new_order_ref[1].id,
            'message': 'Order placed successfully'
        }), 201
        
    except Exception as e:
        logging.error(f"Error processing order: {str(e)}")
        return jsonify({'error': 'Failed to process order'}), 500

@marketplace_bp.route('/api/marketplace/orders/<vendor_id>', methods=['GET'])
def get_vendor_orders(vendor_id):
    try:
        if not vendor_id:
            return jsonify({'error': 'Vendor ID is required'}), 400
        
        orders_ref = db.collection('marketplace_orders')
        query = orders_ref.where('vendor_id', '==', vendor_id).order_by('order_date', direction=firestore.Query.DESCENDING)
        docs = query.stream()
        
        orders = []
        for doc in docs:
            order = doc.to_dict()
            order['id'] = doc.id
            # Convert Firestore timestamp to string
            if 'order_date' in order:
                order['order_date'] = order['order_date'].strftime('%Y-%m-%d %H:%M:%S')
            orders.append(order)
            
        return jsonify(orders), 200
        
    except Exception as e:
        logging.error(f"Error processing order: {str(e)}")
        return jsonify({'error': 'Failed to process order'}), 500
