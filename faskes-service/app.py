import json
import os
import math
import uuid
from datetime import datetime
from flask import Flask, jsonify, request
from kafka_producer import get_booking_producer

app = Flask(__name__)

# Configuration
DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
DEFAULT_PAGE_SIZE = 20


def load_json_file(filename):
    """Load data from JSON file"""
    try:
        with open(os.path.join(DATA_DIR, filename), 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return []


def paginate_data(data, page, size):
    """Paginate data array"""
    start = page * size
    end = start + size
    paginated_data = data[start:end]

    return {
        'data': paginated_data,
        'pagination': {
            'page': page,
            'size': size,
            'totalElements': len(data),
            'totalPages': (len(data) + size - 1) // size,
            'hasNext': end < len(data),
            'hasPrevious': page > 0
        }
    }


def calculate_distance(lat1, lon1, lat2, lon2):
    """Calculate distance between two coordinates using Haversine formula"""
    R = 6371  # Earth's radius in km

    lat1_rad = math.radians(lat1)
    lon1_rad = math.radians(lon1)
    lat2_rad = math.radians(lat2)
    lon2_rad = math.radians(lon2)

    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad

    a = (math.sin(dlat / 2) ** 2 +
         math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2) ** 2)
    c = 2 * math.asin(math.sqrt(a))

    distance = R * c  # Distance in km
    return distance


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'faskes-service',
        'timestamp': datetime.utcnow().isoformat(),
        'external_sources': {
            'bpjs': {
                'status': 'simulated',
                'last_sync': datetime.utcnow().isoformat()
            },
            'allo_bank': {
                'status': 'simulated',
                'last_sync': datetime.utcnow().isoformat()
            }
        }
    })


@app.route('/faskes', methods=['GET'])
def list_faskes():
    """List all faskes with pagination"""
    faskes = load_json_file('faskes.json')

    # Get query parameters
    jenis_faskes = request.args.get('jenis_faskes')
    search = request.args.get('search')
    page = int(request.args.get('page', 0))
    size = int(request.args.get('size', DEFAULT_PAGE_SIZE))

    # Filter by jenis_faskes
    if jenis_faskes:
        faskes = [f for f in faskes if f['jenis_faskes'] == jenis_faskes]

    # Search by nama or alamat
    if search:
        faskes = [f for f in faskes if
                  search.lower() in f['nama_faskes'].lower() or
                  search.lower() in f['alamat'].lower()]

    return jsonify(paginate_data(faskes, page, size))


@app.route('/faskes/nearby', methods=['POST'])
def find_nearby_faskes():
    """Find nearby faskes based on latitude and longitude"""
    data = request.get_json()

    # Validate required fields
    if not data or 'latitude' not in data or 'longitude' not in data:
        return jsonify({
            'error': {
                'code': 'INVALID_REQUEST',
                'message': 'latitude and longitude are required'
            }
        }), 400

    user_lat = data['latitude']
    user_lon = data['longitude']
    radius = data.get('radius', 5000)  # Default 5km in meters
    radius_km = radius / 1000  # Convert to km
    jenis_faskes = data.get('jenis_faskes')

    faskes = load_json_file('faskes.json')

    # Calculate distance and filter by radius
    nearby_faskes = []
    for faskes in faskes:
        if 'latitude' not in faskes or 'longitude' not in faskes:
            continue

        distance = calculate_distance(
            user_lat, user_lon,
            faskes['latitude'], faskes['longitude']
        )

        # Filter by radius
        if distance <= radius_km:
            # Filter by jenis_faskes if specified
            if jenis_faskes and faskes['jenis_faskes'] != jenis_faskes:
                continue

            # Add distance to faskes data
            faskes_with_distance = faskes.copy()
            faskes_with_distance['distance_km'] = round(distance, 2)
            nearby_faskes.append(faskes_with_distance)

    # Sort by distance
    nearby_faskes.sort(key=lambda x: x['distance_km'])

    # Get pagination params
    page = int(request.args.get('page', 0))
    size = int(request.args.get('size', DEFAULT_PAGE_SIZE))

    return jsonify(paginate_data(nearby_faskes, page, size))


@app.route('/external/sync', methods=['POST'])
def sync_external_data():
    """Sync data from external API (BPJS, Allo Bank, etc.)"""
    data = request.get_json() or {}

    source = data.get('source', 'BPJS')
    force_full_sync = data.get('force_full_sync', False)
    since = data.get('since')

    # Simulate sync from external API
    faskes = load_json_file('faskes.json')

    # Mock sync statistics
    sync_stats = {
        'faskes_created': len(faskes) if force_full_sync else 0,
        'faskes_updated': len(faskes) if not force_full_sync else 0,
        'dokter_created': len(load_json_file('dokter.json')) if force_full_sync else 0,
        'layanan_created': 15 if force_full_sync else 0
    }

    return jsonify({
        'status': 'success',
        'source': source,
        'sync_time': datetime.utcnow().isoformat(),
        'since': since,
        'force_full_sync': force_full_sync,
        'stats': sync_stats,
        'message': f'Successfully synced data from {source}'
    })


@app.route('/faskes/<faskes_id>', methods=['GET'])
def get_faskes_detail(faskes_id):
    """Get faskes detail with dokter and layanan"""
    faskes = load_json_file('faskes.json')
    dokters = load_json_file('dokter.json')

    # Find faskes
    faskes_data = next((f for f in faskes if f['id'] == faskes_id), None)

    if not faskes_data:
        return jsonify({'error': {'code': 'NOT_FOUND', 'message': 'Faskes not found'}}), 404

    # Get dokter for this faskes
    faskes_dokters = [d for d in dokters if d['faskes_id'] == faskes_id]

    # Remove sensitive data
    for dokter in faskes_dokters:
        if 'faskes_id' in dokter:
            del dokter['faskes_id']

    return jsonify({
        'data': faskes_data,
        'dokter': faskes_dokters
    })


@app.route('/faskes/<faskes_id>/dokter', methods=['GET'])
def list_dokter_by_faskes(faskes_id):
    """List dokter at specific faskes"""
    dokters = load_json_file('dokter.json')

    # Filter by faskes_id
    faskes_dokters = [d for d in dokters if d['faskes_id'] == faskes_id]

    # Filter by spesialisasi
    spesialisasi = request.args.get('spesialisasi')
    if spesialisasi:
        faskes_dokters = [d for d in faskes_dokters
                          if spesialisasi.lower() in d['spesialisasi'].lower()]

    page = int(request.args.get('page', 0))
    size = int(request.args.get('size', DEFAULT_PAGE_SIZE))

    return jsonify(paginate_data(faskes_dokters, page, size))


@app.route('/faskes/<faskes_id>/layanan', methods=['GET'])
def list_layanan_by_faskes(faskes_id):
    """List layanan at specific faskes"""
    faskes = load_json_file('faskes.json')
    faskes_data = next((f for f in faskes if f['id'] == faskes_id), None)

    if not faskes_data:
        return jsonify({'error': {'code': 'NOT_FOUND', 'message': 'Faskes not found'}}), 404

    # Mock layanan based on jenis_faskes
    layanan = [
        {
            'id': 'lay-001',
            'faskes_id': faskes_id,
            'nama_layanan': 'Konsultasi Psikologi Individu',
            'deskripsi': 'Sesi konsultasi one-on-one dengan psikolog profesional',
            'harga': 500000,
            'durasi': 60,
            'created_at': '2024-01-15T10:00:00Z',
            'updated_at': '2024-01-15T10:00:00Z'
        },
        {
            'id': 'lay-002',
            'faskes_id': faskes_id,
            'nama_layanan': 'Terapi Kelompok',
            'deskripsi': 'Terapi dalam kelompok kecil dengan topik spesifik',
            'harga': 250000,
            'durasi': 90,
            'created_at': '2024-01-15T10:00:00Z',
            'updated_at': '2024-01-15T10:00:00Z'
        },
        {
            'id': 'lay-003',
            'faskes_id': faskes_id,
            'nama_layanan': 'Psikotes',
            'deskripsi': 'Tes psikologi untuk evaluasi mental dan emosional',
            'harga': 750000,
            'durasi': 120,
            'created_at': '2024-01-15T10:00:00Z',
            'updated_at': '2024-01-15T10:00:00Z'
        }
    ]

    page = int(request.args.get('page', 0))
    size = int(request.args.get('size', DEFAULT_PAGE_SIZE))

    return jsonify(paginate_data(layanan, page, size))


@app.route('/dokter/<dokter_id>/jadwal', methods=['GET'])
def get_jadwal_dokter(dokter_id):
    """Get jadwal praktik dokter"""
    dokters = load_json_file('dokter.json')

    # Find dokter
    dokter_data = next((d for d in dokters if d['id'] == dokter_id), None)

    if not dokter_data:
        return jsonify({'error': {'code': 'NOT_FOUND', 'message': 'Dokter not found'}}), 404

    return jsonify({
        'data': {
            'dokter': dokter_data,
            'jadwal': dokter_data['jadwal_praktik']
        }
    })


@app.route('/booking', methods=['POST'])
def create_booking():
    """Receive booking request and publish to Kafka (Producer)"""
    try:
        data = request.get_json()

        if not data:
            return jsonify({
                'error': {
                    'code': 'INVALID_REQUEST',
                    'message': 'Request body is required'
                }
            }), 400

        # Validate required fields
        required_fields = ['faskes_id', 'dokter_id', 'pasien_id', 'jadwal']
        missing_fields = [field for field in required_fields if field not in data]

        if missing_fields:
            return jsonify({
                'error': {
                    'code': 'MISSING_FIELDS',
                    'message': 'Missing required fields',
                    'fields': missing_fields
                }
            }), 400

        # Validate jadwal format
        try:
            jadwal_datetime = datetime.fromisoformat(data['jadwal'].replace('Z', '+00:00'))
        except ValueError:
            return jsonify({
                'error': {
                    'code': 'INVALID_DATE',
                    'message': 'Invalid jadwal format. Use ISO 8601 format (e.g., 2026-03-15T10:00:00Z)'
                }
            }), 400

        # Check if faskes exists
        faskes = load_json_file('faskes.json')
        faskes_data = next((f for f in faskes if f['id'] == data['faskes_id']), None)

        if not faskes_data:
            return jsonify({
                'error': {
                    'code': 'FAKES_NOT_FOUND',
                    'message': f'Faskes with id {data["faskes_id"]} not found'
                }
            }), 404

        # Check if dokter exists
        dokters = load_json_file('dokter.json')
        dokter_data = next((d for d in dokters if d['id'] == data['dokter_id']), None)

        if not dokter_data:
            return jsonify({
                'error': {
                    'code': 'DOKTER_NOT_FOUND',
                    'message': f'Dokter with id {data["dokter_id"]} not found'
                }
            }), 404

        # Check if dokter belongs to faskes
        if dokter_data['faskes_id'] != data['faskes_id']:
            return jsonify({
                'error': {
                    'code': 'DOKTER_NOT_IN_FASKES',
                    'message': 'Dokter tidak berada di faskes tersebut'
                }
            }), 400

        # Generate booking ID
        booking_id = str(uuid.uuid4())

        # Prepare booking event
        booking_event = {
            'id': booking_id,
            'faskes_id': data['faskes_id'],
            'faskes_name': faskes_data['nama_faskes'],
            'dokter_id': data['dokter_id'],
            'dokter_name': dokter_data['nama_dokter'],
            'spesialisasi': dokter_data['spesialisasi'],
            'pasien_id': data['pasien_id'],
            'jadwal': data['jadwal'],
            'session_type': data.get('session_type', 'VIDEO'),
            'notes': data.get('notes', ''),
            'status': 'PENDING',
            'created_at': datetime.utcnow().isoformat(),
            'source': 'faskes-service'
        }

        # Publish to Kafka
        producer = get_booking_producer()
        result = producer.publish_booking(booking_event)

        if not result.get('success'):
            return jsonify({
                'error': {
                    'code': 'KAFKA_ERROR',
                    'message': 'Failed to queue booking',
                    'details': result.get('error')
                }
            }), 500

        # Return success response (accepted for processing)
        return jsonify({
            'status': 'success',
            'message': 'Booking request received and queued for processing',
            'data': {
                'booking_id': booking_id,
                'faskes_name': faskes_data['nama_faskes'],
                'dokter_name': dokter_data['nama_dokter'],
                'jadwal': data['jadwal'],
                'status': 'PENDING',
                'estimated_processing_time': '1-2 minutes'
            }
        }), 202  # 202 Accepted

    except Exception as e:
        return jsonify({
            'error': {
                'code': 'INTERNAL_ERROR',
                'message': str(e)
            }
        }), 500


@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({
        'error': {
            'code': 'NOT_FOUND',
            'message': 'Resource not found'
        }
    }), 404


@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    return jsonify({
        'error': {
            'code': 'INTERNAL_ERROR',
            'message': 'Internal server error'
        }
    }), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8009, debug=True)
