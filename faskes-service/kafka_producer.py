import os
import json
from datetime import datetime
from kafka import KafkaProducer
import logging

logger = logging.getLogger(__name__)

class BookingProducer:
    """Kafka Producer for Booking Events"""

    def __init__(self):
        self.bootstrap_servers = os.getenv('KAFKA_BROKERS', 'localhost:9092')
        self.topic = os.getenv('KAFKA_TOPIC', 'booking-events')

        logger.info(f"Initializing Kafka Producer: {self.bootstrap_servers}")

        self.producer = KafkaProducer(
            bootstrap_servers=self.bootstrap_servers,
            value_serializer=lambda v: json.dumps(v).encode('utf-8'),
            key_serializer=lambda k: k.encode('utf-8') if k else None,
            acks='all',  # Wait for all replicas
            retries=3,
            max_in_flight_requests_per_connection=1,
        )

        logger.info("Kafka Producer initialized successfully")

    def publish_booking(self, booking_data):
        """Publish booking event to Kafka"""
        try:
            event = {
                **booking_data,
                'timestamp': datetime.utcnow().isoformat(),
                'source': 'faskes-service',
            }

            future = self.producer.send(
                self.topic,
                value=event,
                key=str(booking_data.get('id'))
            )

            # Block until message is sent
            record_metadata = future.get(timeout=10)

            logger.info(f"Booking event published: {booking_data.get('id')}")
            logger.info(f"Topic: {record_metadata.topic}, Partition: {record_metadata.partition}, Offset: {record_metadata.offset}")

            return {
                'success': True,
                'topic': record_metadata.topic,
                'partition': record_metadata.partition,
                'offset': record_metadata.offset
            }

        except Exception as e:
            logger.error(f"Failed to publish booking event: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    def close(self):
        """Close the producer"""
        self.producer.flush()
        self.producer.close()
        logger.info("Kafka Producer closed")


# Global producer instance
booking_producer = None

def get_booking_producer():
    """Get or create global producer instance"""
    global booking_producer
    if booking_producer is None:
        booking_producer = BookingProducer()
    return booking_producer
