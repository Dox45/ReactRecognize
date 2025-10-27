from fastapi import FastAPI, HTTPException, Depends, File, UploadFile, Form, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, validator, Field
from typing import Optional, List, Dict, Any
from contextlib import contextmanager
from functools import lru_cache
from datetime import datetime, timedelta, time
from math import radians, sin, cos, sqrt, atan2
import sqlite3
import jwt
import bcrypt
import numpy as np
import cv2
from PIL import Image
import io
import torch
from retinaface.pre_trained_models import get_model
import logging
import os
import hashlib
import re
import base64
import binascii

# ============================================================================
# CONFIGURATION & LOGGING
# ============================================================================

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class Config:
    """Application configuration"""
    # Database
    DATABASE_PATH = os.getenv('DATABASE_PATH', 'attendance.db')
    
    # Security
    SECRET_KEY = os.getenv('SECRET_KEY', 'CHANGE-THIS-IN-PRODUCTION-USE-ENV-VAR')
    ALGORITHM = "HS256"
    TOKEN_EXPIRE_DAYS = 7
    
    # Face Recognition
    FACE_MODEL = "resnet50_2020-07-20"
    MAX_IMAGE_SIZE = 1048
    DEVICE = "cpu"
    SIMILARITY_THRESHOLD = 0.5
    MAX_FACES_PER_IMAGE = 10
    
    # File Storage
    FACE_IMAGES_DIR = os.getenv('FACE_IMAGES_DIR', 'face_images')
    MAX_IMAGE_FILE_SIZE = 5 * 1024 * 1024  # 5MB
    
    # Business Rules
    OFFICE_LATITUDE = float(os.getenv('OFFICE_LAT', '6.5991886')) 
    OFFICE_LONGITUDE = float(os.getenv('OFFICE_LON', '3.3489671'))
    GEOFENCE_RADIUS_KM = float(os.getenv('GEOFENCE_RADIUS', '0.5'))
    CHECK_IN_START_TIME = time(6, 0)
    CHECK_IN_END_TIME = time(10, 0)
    CHECK_OUT_START_TIME = time(15, 0)
    CHECK_OUT_END_TIME = time(23, 59)
    
    # Rate Limiting
    LOGIN_RATE_LIMIT = 5  # attempts per minute
    CHECKIN_RATE_LIMIT = 3  # attempts per minute

config = Config()

# Create directories
os.makedirs(config.FACE_IMAGES_DIR, exist_ok=True)

# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class Login(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)

class EmployeeRegistration(BaseModel):
    employee_id: str = Field(..., min_length=3, max_length=50)
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8)
    role: str = Field(default="employee")
    
    @validator('employee_id')
    def validate_employee_id(cls, v):
        if not re.match(r'^[a-zA-Z0-9_-]+$', v):
            raise ValueError('Employee ID must contain only alphanumeric characters, hyphens, and underscores')
        return v
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'[0-9]', v):
            raise ValueError('Password must contain at least one digit')
        return v
    
    @validator('role')
    def validate_role(cls, v):
        if v not in ['admin', 'employee']:
            raise ValueError('Role must be either "admin" or "employee"')
        return v

class LocationData(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)

class AttendanceFilter(BaseModel):
    date: Optional[str] = None
    employee_id: Optional[str] = None
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=50, ge=1, le=100)

# ============================================================================
# DATABASE MANAGEMENT
# ============================================================================

class DatabaseManager:
    """Handles all database operations with connection pooling"""
    
    @staticmethod
    @contextmanager
    def get_connection():
        """Context manager for database connections with automatic commit/rollback"""
        conn = sqlite3.connect(config.DATABASE_PATH)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        except Exception as e:
            conn.rollback()
            logger.error(f"Database error: {str(e)}")
            raise
        finally:
            conn.close()
    
    @staticmethod
    def init_database():
        """Initialize database with all required tables"""
        with DatabaseManager.get_connection() as conn:
            cursor = conn.cursor()
            
            # Employees table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS employees (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    employee_id TEXT UNIQUE NOT NULL,
                    name TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    role TEXT NOT NULL,
                    is_active INTEGER DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Face embeddings table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS face_embeddings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    employee_id TEXT NOT NULL,
                    embedding BLOB NOT NULL,
                    image_hash TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (employee_id) REFERENCES employees (employee_id) ON DELETE CASCADE
                )
            ''')
            
            # Attendance table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS attendance (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    employee_id TEXT NOT NULL,
                    check_in_time TIMESTAMP,
                    check_out_time TIMESTAMP,
                    check_in_lat REAL,
                    check_in_lon REAL,
                    check_out_lat REAL,
                    check_out_lon REAL,
                    check_in_image_path TEXT,
                    check_out_image_path TEXT,
                    date DATE NOT NULL,
                    check_in_confidence REAL,
                    check_out_confidence REAL,
                    status TEXT DEFAULT 'pending',
                    notes TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
                )
            ''')
            
            # Audit log table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS audit_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    employee_id TEXT,
                    action TEXT NOT NULL,
                    details TEXT,
                    ip_address TEXT,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Rate limiting table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS rate_limits (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    identifier TEXT NOT NULL,
                    endpoint TEXT NOT NULL,
                    attempt_count INTEGER DEFAULT 1,
                    window_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(identifier, endpoint)
                )
            ''')

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS system_settings (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL,
                    description TEXT,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_by TEXT
                )
            """)
            
            # Insert default settings if not exists
            default_settings = [
                ('office_latitude', '6.5991886', 'Office location latitude'),
                ('office_longitude', '3.3489671', 'Office location longitude'),
                ('office_radius_km', '1.0', 'Allowed check-in radius in kilometers'),
                ('check_in_start_time', '07:00', 'Earliest check-in time (HH:MM)'),
                ('check_in_end_time', '10:00', 'Latest check-in time (HH:MM)'),
                ('check_out_start_time', '16:00', 'Earliest check-out time (HH:MM)'),
                ('check_out_end_time', '20:00', 'Latest check-out time (HH:MM)'),
            ]
            
            for key, value, description in default_settings:
                cursor.execute("""
                    INSERT OR IGNORE INTO system_settings (key, value, description)
                    VALUES (?, ?, ?)
                """, (key, value, description))
            
            # Create indexes
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance(employee_id, date)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_audit_employee ON audit_log(employee_id)')
            
            logger.info("Database initialized successfully")


            cursor.execute("""
                CREATE TABLE IF NOT EXISTS shifts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    shift_name TEXT NOT NULL UNIQUE,
                    start_time TEXT NOT NULL,
                    end_time TEXT NOT NULL,
                    check_in_start TEXT NOT NULL,
                    check_in_end TEXT NOT NULL,
                    check_out_start TEXT NOT NULL,
                    check_out_end TEXT NOT NULL,
                    days_of_week TEXT NOT NULL,
                    is_active INTEGER DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    created_by TEXT
                )
            """)
    
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS employee_shifts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    employee_id TEXT NOT NULL,
                    shift_id INTEGER NOT NULL,
                    effective_from DATE NOT NULL,
                    effective_to DATE,
                    is_active INTEGER DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    created_by TEXT,
                    FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
                    FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE
                )
            """)
            
            # Insert default shifts
            default_shifts = [
                ('Morning Shift', '08:00', '16:00', '07:00', '08:30', '15:30', '17:00', 'Mon,Tue,Wed,Thu,Fri'),
                ('Afternoon Shift', '14:00', '22:00', '13:00', '14:30', '21:30', '23:00', 'Mon,Tue,Wed,Thu,Fri'),
                ('Night Shift', '22:00', '06:00', '21:00', '22:30', '05:30', '07:00', 'Mon,Tue,Wed,Thu,Fri,Sat,Sun'),
                ('Flexible', '00:00', '23:59', '00:00', '23:59', '00:00', '23:59', 'Mon,Tue,Wed,Thu,Fri,Sat,Sun'),
            ]
            
            for shift_name, start, end, ci_start, ci_end, co_start, co_end, days in default_shifts:
                cursor.execute("""
                    INSERT OR IGNORE INTO shifts 
                    (shift_name, start_time, end_time, check_in_start, check_in_end, 
                     check_out_start, check_out_end, days_of_week, created_by)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'system')
                """, (shift_name, start, end, ci_start, ci_end, co_start, co_end, days))


#=============================================================
# SETTINGS MANAGER
#========================================================
class SettingsManager:
    """Manage system settings"""
    
    @staticmethod
    def get_setting(key: str, default=None):
        """Get a setting value"""
        try:
            with DatabaseManager.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT value FROM system_settings WHERE key = ?",
                    (key,)
                )
                result = cursor.fetchone()
                return result['value'] if result else default
        except Exception as e:
            logger.error(f"Error getting setting {key}: {str(e)}")
            return default
    
    @staticmethod
    def set_setting(key: str, value: str, updated_by: str):
        """Update a setting value"""
        try:
            with DatabaseManager.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE system_settings 
                    SET value = ?, updated_at = ?, updated_by = ?
                    WHERE key = ?
                """, (value, datetime.now(), updated_by, key))
                return cursor.rowcount > 0
        except Exception as e:
            logger.error(f"Error setting {key}: {str(e)}")
            return False
    
    @staticmethod
    def get_all_settings():
        """Get all settings"""
        try:
            with DatabaseManager.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM system_settings ORDER BY key")
                return cursor.fetchall()
        except Exception as e:
            logger.error(f"Error getting all settings: {str(e)}")
            return []



# ============================================================================
# UTILITIES
# ============================================================================

class SecurityUtils:
    """Security-related utility functions"""
    
    @staticmethod
    def create_token(employee_id: str, role: str) -> str:
        """Create JWT token"""
        payload = {
            "employee_id": employee_id,
            "role": role,
            "iat": datetime.utcnow(),
            "exp": datetime.utcnow() + timedelta(days=config.TOKEN_EXPIRE_DAYS)
        }
        return jwt.encode(payload, config.SECRET_KEY, algorithm=config.ALGORITHM)
    
    @staticmethod
    def verify_token(credentials: HTTPAuthorizationCredentials) -> Dict[str, Any]:
        """Verify JWT token"""
        try:
            payload = jwt.decode(
                credentials.credentials,
                config.SECRET_KEY,
                algorithms=[config.ALGORITHM]
            )
            return payload
        except jwt.ExpiredSignatureError:
            logger.warning("Token expired")
            raise HTTPException(status_code=401, detail="Token expired")
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid token: {str(e)}")
            raise HTTPException(status_code=401, detail="Invalid token")
    
    @staticmethod
    def hash_password(password: str) -> bytes:
        """Hash password using bcrypt"""
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    
    @staticmethod
    def verify_password(password: str, hashed: bytes) -> bool:
        """Verify password against hash"""
        return bcrypt.checkpw(password.encode('utf-8'), hashed)
    
    @staticmethod
    def hash_image(image_bytes: bytes) -> str:
        """Create SHA256 hash of image"""
        return hashlib.sha256(image_bytes).hexdigest()

class LocationUtils:
    """Location-related utility functions"""
    
    @staticmethod
    def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate distance between two coordinates using Haversine formula (in kilometers)"""
        R = 6371  # Earth's radius in kilometers
        
        lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))
        
        return R * c
    
    @staticmethod
    def validate_location(latitude: float, longitude: float) -> tuple[bool, str]:
        """Validate if location is within office geofence"""
        office_lat = float(SettingsManager.get_setting('office_latitude', 0))
        office_lon = float(SettingsManager.get_setting('office_longitude', 0))
        radius_km = float(SettingsManager.get_setting('office_radius_km', 1.0))
        distance = LocationUtils.calculate_distance(
            latitude, longitude,
            office_lat, office_lon
        )
        
        if distance <= radius_km:
            return True, f"Within office premises ({distance:.2f} km from office)"
        else:
            return False, f"Outside office premises ({distance:.2f} km from office)"

# class TimeUtils:
#     """Time-related utility functions"""
    
#     @staticmethod
#     def validate_check_in_time() -> tuple[bool, str]:
#         """Validate if current time is within check-in hours"""
#         current_time = datetime.now().time()
#         check_in_start = datetime.strptime(SettingsManager.get_setting("check_in_start_time"), "%H:%M").time()
#         check_in_end = datetime.strptime(SettingsManager.get_setting("check_in_end_time"), "%H:%M").time()
#         check_out_start = datetime.strptime(SettingsManager.get_setting("check_out_start_time"), "%H:%M").time()
#         check_out_end = datetime.strptime(SettingsManager.get_setting("check_out_end_time"), "%H:%M").time()
        
#         if check_in_start <= current_time <= check_in_end:
#             return True, "Within check-in hours"
#         else:
#             return False, f"Check-in only allowed between {check_in_start.strftime('%H:%M')} and {check_in_end.strftime('%H:%M')}"
    
#     @staticmethod
#     def validate_check_out_time() -> tuple[bool, str]:
#         """Validate if current time is within check-out hours"""
#         current_time = datetime.now().time()
        
#         if check_out_start <= current_time <= check_out_end:
#             return True, "Within check-out hours"
#         else:
#             return False, f"Check-out only allowed between {check_out_start.strftime('%H:%M')} and {check_out_end.strftime('%H:%M')}"


# Update TimeUtils to use shift-based validation

class TimeUtils:
    @staticmethod
    def get_employee_shift_times(employee_id: str):
        """Get shift times for a specific employee"""
        try:
            today = datetime.now().strftime('%A')[:3]  # Mon, Tue, etc.
            
            with DatabaseManager.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT s.* FROM employee_shifts es
                    JOIN shifts s ON es.shift_id = s.id
                    WHERE es.employee_id = ? 
                    AND es.is_active = 1
                    AND (es.effective_from <= date('now'))
                    AND (es.effective_to IS NULL OR es.effective_to >= date('now'))
                    AND s.days_of_week LIKE ?
                    LIMIT 1
                """, (employee_id, f'%{today}%'))
                
                shift = cursor.fetchone()
                
                if shift:
                    return {
                        'check_in_start': shift['check_in_start'],
                        'check_in_end': shift['check_in_end'],
                        'check_out_start': shift['check_out_start'],
                        'check_out_end': shift['check_out_end']
                    }
                
                # Fallback to global settings
                return {
                    'check_in_start': SettingsManager.get_setting('check_in_start_time', '07:00'),
                    'check_in_end': SettingsManager.get_setting('check_in_end_time', '10:00'),
                    'check_out_start': SettingsManager.get_setting('check_out_start_time', '16:00'),
                    'check_out_end': SettingsManager.get_setting('check_out_end_time', '20:00')
                }
        except Exception as e:
            logger.error(f"Error getting shift times: {str(e)}")
            return None
    
    @staticmethod
    def validate_check_in_time(employee_id: str = None) -> tuple[bool, str]:
        """Validate check-in time based on employee shift"""
        try:
            current_time = datetime.now().time()
            
            if employee_id:
                times = TimeUtils.get_employee_shift_times(employee_id)
                if times:
                    start_str = times['check_in_start']
                    end_str = times['check_in_end']
                else:
                    return False, "No shift assigned"
            else:
                start_str = SettingsManager.get_setting('check_in_start_time', '07:00')
                end_str = SettingsManager.get_setting('check_in_end_time', '10:00')
            
            check_in_start = datetime.strptime(start_str, '%H:%M').time()
            check_in_end = datetime.strptime(end_str, '%H:%M').time()
            
            if check_in_start <= current_time <= check_in_end:
                return True, "Within check-in hours"
            
            return False, f"Outside check-in hours ({start_str} - {end_str})"
        except Exception as e:
            logger.error(f"Time validation error: {str(e)}")
            return True, "Time validation bypassed"
    
    @staticmethod
    def validate_check_out_time(employee_id: str = None) -> tuple[bool, str]:
        """Validate check-out time based on employee shift"""
        try:
            current_time = datetime.now().time()
            
            if employee_id:
                times = TimeUtils.get_employee_shift_times(employee_id)
                if times:
                    start_str = times['check_out_start']
                    end_str = times['check_out_end']
                else:
                    return False, "No shift assigned"
            else:
                start_str = SettingsManager.get_setting('check_out_start_time', '16:00')
                end_str = SettingsManager.get_setting('check_out_end_time', '20:00')
            
            check_out_start = datetime.strptime(start_str, '%H:%M').time()
            check_out_end = datetime.strptime(end_str, '%H:%M').time()
            
            if check_out_start <= current_time <= check_out_end:
                return True, "Within check-out hours"
            
            return False, f"Outside check-out hours ({start_str} - {end_str})"
        except Exception as e:
            logger.error(f"Time validation error: {str(e)}")
            return True, "Time validation bypassed"



class AuditLogger:
    """Audit logging for important actions"""
    
    @staticmethod
    def log_action(employee_id: str, action: str, details: str = None, ip_address: str = None):
        """Log an action to audit trail"""
        try:
            with DatabaseManager.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "INSERT INTO audit_log (employee_id, action, details, ip_address) VALUES (?, ?, ?, ?)",
                    (employee_id, action, details, ip_address)
                )
                logger.info(f"Audit log: {action} by {employee_id}")
        except Exception as e:
            logger.error(f"Failed to log audit action: {str(e)}")

class RateLimiter:
    """Simple rate limiting implementation"""
    
    @staticmethod
    def check_rate_limit(identifier: str, endpoint: str, limit: int, window_minutes: int = 1) -> bool:
        """Check if request is within rate limit"""
        try:
            with DatabaseManager.get_connection() as conn:
                cursor = conn.cursor()
                
                # Clean old entries
                cursor.execute(
                    "DELETE FROM rate_limits WHERE window_start < datetime('now', '-' || ? || ' minutes')",
                    (window_minutes,)
                )
                
                # Check current count
                cursor.execute(
                    "SELECT attempt_count, window_start FROM rate_limits WHERE identifier = ? AND endpoint = ?",
                    (identifier, endpoint)
                )
                result = cursor.fetchone()
                
                if result:
                    if result['attempt_count'] >= limit:
                        return False
                    cursor.execute(
                        "UPDATE rate_limits SET attempt_count = attempt_count + 1 WHERE identifier = ? AND endpoint = ?",
                        (identifier, endpoint)
                    )
                else:
                    cursor.execute(
                        "INSERT INTO rate_limits (identifier, endpoint) VALUES (?, ?)",
                        (identifier, endpoint)
                    )
                
                return True
        except Exception as e:
            logger.error(f"Rate limit check failed: {str(e)}")
            return True  # Allow on error to avoid blocking legitimate users

# ============================================================================
# FACE RECOGNITION SYSTEM
# ============================================================================

class FaceRecognitionSystem:
    """Enhanced face recognition with better error handling"""
    
    def __init__(self):
        self.model = None
        self.load_model()
    
    def load_model(self):
        """Load the RetinaFace model"""
        try:
            self.model = get_model(
                config.FACE_MODEL,
                max_size=config.MAX_IMAGE_SIZE,
                device=config.DEVICE
            )
            self.model.eval()
            logger.info("RetinaFace model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load model: {str(e)}")
            raise RuntimeError("Face recognition system initialization failed")
    
    def extract_face_features(self, image: np.ndarray) -> List[dict]:
        """Extract face features using RetinaFace"""
        try:
            with torch.no_grad():
                annotations = self.model.predict_jsons(image)
            
            if not annotations or not annotations[0].get("bbox"):
                return []
            
            faces = []
            for annotation in annotations[:config.MAX_FACES_PER_IMAGE]:
                bbox = annotation["bbox"]
                landmarks = annotation.get("landmarks", [])
                
                x1, y1, x2, y2 = map(int, bbox)
                x1, y1 = max(0, x1), max(0, y1)
                x2, y2 = min(image.shape[1], x2), min(image.shape[0], y2)
                
                if x2 <= x1 or y2 <= y1:
                    continue
                
                face_region = image[y1:y2, x1:x2]
                face_embedding = self._generate_face_embedding(face_region)
                
                faces.append({
                    "bbox": bbox,
                    "landmarks": landmarks,
                    "embedding": face_embedding,
                    "face_region": face_region
                })
            
            return faces
        except Exception as e:
            logger.error(f"Failed to extract face features: {str(e)}")
            return []
    
    def _generate_face_embedding(self, face_region: np.ndarray) -> np.ndarray:
        """Generate face embedding using patch-based features"""
        try:
            if face_region.size == 0:
                return np.zeros(512, dtype=np.float32)
            
            face_resized = cv2.resize(face_region, (112, 112))
            
            if len(face_resized.shape) == 3:
                face_gray = cv2.cvtColor(face_resized, cv2.COLOR_RGB2GRAY)
            else:
                face_gray = face_resized
            
            face_normalized = face_gray.astype(np.float32) / 255.0
            
            embedding = []
            patch_size = 8
            for i in range(0, 112, patch_size):
                for j in range(0, 112, patch_size):
                    patch = face_normalized[i:i+patch_size, j:j+patch_size]
                    if patch.size > 0:
                        embedding.extend([
                            np.mean(patch),
                            np.std(patch),
                            np.min(patch),
                            np.max(patch)
                        ])
            
            embedding_array = np.array(embedding[:512], dtype=np.float32)
            
            # Normalize
            norm = np.linalg.norm(embedding_array)
            if norm > 0:
                embedding_array = embedding_array / norm
            
            return embedding_array
        except Exception as e:
            logger.error(f"Failed to generate embedding: {str(e)}")
            return np.zeros(512, dtype=np.float32)
    
    def _calculate_similarity(self, embedding1: np.ndarray, embedding2: np.ndarray) -> float:
        """Calculate cosine similarity between two embeddings"""
        try:
            if embedding1.shape != embedding2.shape:
                logger.error(f"Embedding shape mismatch: {embedding1.shape} vs {embedding2.shape}")
                return 0.0
            
            emb1 = embedding1.astype(np.float32)
            emb2 = embedding2.astype(np.float32)
            
            norm1 = np.linalg.norm(emb1)
            norm2 = np.linalg.norm(emb2)
            
            if norm1 == 0 or norm2 == 0:
                return 0.0
            
            similarity = float(np.dot(emb1, emb2) / (norm1 * norm2))
            return max(0.0, min(1.0, similarity))
        except Exception as e:
            logger.error(f"Failed to calculate similarity: {str(e)}")
            return 0.0
    
    def save_face_image(self, employee_id: str, image_bytes: bytes, prefix: str = "checkin") -> str:
        """Save face image to disk and return path"""
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{employee_id}_{prefix}_{timestamp}.jpg"
            filepath = os.path.join(config.FACE_IMAGES_DIR, filename)
            
            with open(filepath, 'wb') as f:
                f.write(image_bytes)
            
            return filepath
        except Exception as e:
            logger.error(f"Failed to save face image: {str(e)}")
            return None
    
    def register_employee_face(self, employee_id: str, image_bytes: bytes) -> dict:
        """Register employee face from image bytes"""
        try:
            if len(image_bytes) > config.MAX_IMAGE_FILE_SIZE:
                return {"success": False, "message": "Image file too large (max 5MB)"}
            
            pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            image_array = np.array(pil_image)
            
            faces = self.extract_face_features(image_array)
            
            if not faces:
                return {"success": False, "message": "No face detected in image"}
            
            if len(faces) > 1:
                return {"success": False, "message": "Multiple faces detected. Please use image with single face"}
            
            face = faces[0]
            embedding = face["embedding"].astype(np.float32)
            embedding_blob = embedding.tobytes()
            image_hash = SecurityUtils.hash_image(image_bytes)
            
            with DatabaseManager.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "INSERT INTO face_embeddings (employee_id, embedding, image_hash) VALUES (?, ?, ?)",
                    (employee_id, embedding_blob, image_hash)
                )
            
            logger.info(f"Face registered successfully for employee: {employee_id}")
            return {"success": True, "message": "Face registered successfully"}
        except Exception as e:
            logger.error(f"Failed to register face: {str(e)}")
            return {"success": False, "message": f"Registration failed: {str(e)}"}
    
    def recognize_employee(self, image_bytes: bytes) -> dict:
        """Recognize employee from image bytes"""
        try:
            if len(image_bytes) > config.MAX_IMAGE_FILE_SIZE:
                return {"success": False, "message": "Image file too large"}
            
            pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            image_array = np.array(pil_image)
            
            faces = self.extract_face_features(image_array)
            
            if not faces:
                return {"success": False, "message": "No face detected"}
            
            with DatabaseManager.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    SELECT fe.employee_id, fe.embedding, e.name
                    FROM face_embeddings fe
                    JOIN employees e ON fe.employee_id = e.employee_id
                    WHERE e.is_active = 1
                ''')
                registered_faces = cursor.fetchall()
            
            if not registered_faces:
                return {"success": False, "message": "No registered employees found"}
            
            best_matches = []
            for face in faces:
                query_embedding = face["embedding"]
                best_similarity = 0
                best_match = None
                
                for emp_id, embedding_blob, name in registered_faces:
                    stored_embedding = np.frombuffer(embedding_blob, dtype=np.float32)
                    similarity = self._calculate_similarity(query_embedding, stored_embedding)
                    
                    if similarity > best_similarity and similarity > config.SIMILARITY_THRESHOLD:
                        best_similarity = similarity
                        best_match = {
                            "employee_id": emp_id,
                            "name": name,
                            "confidence": float(similarity),
                            "bbox": face["bbox"]
                        }
                
                if best_match:
                    best_matches.append(best_match)
            
            if not best_matches:
                return {"success": False, "message": "No matching employee found"}
            
            return {
                "success": True,
                "matches": best_matches,
                "total_faces": len(faces),
                "recognized_faces": len(best_matches)
            }
        except Exception as e:
            logger.error(f"Failed to recognize employee: {str(e)}")
            return {"success": False, "message": f"Recognition failed: {str(e)}"}

# ============================================================================
# FASTAPI APPLICATION
# ============================================================================

app = FastAPI(
    title="Employee Attendance System API",
    version="2.0",
    description="Enhanced attendance system with face recognition"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

# Initialize systems
DatabaseManager.init_database()
face_system = FaceRecognitionSystem()

# ============================================================================
# DEPENDENCY FUNCTIONS
# ============================================================================

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    """Verify token and return user data"""
    return SecurityUtils.verify_token(credentials)

async def require_admin(token_data: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """Ensure user has admin role"""
    if token_data.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    return token_data

def get_client_ip(request: Request) -> str:
    """Get client IP address"""
    return request.client.host if request.client else "unknown"

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

async def verify_employee_face(employee_id: str, image_bytes: bytes) -> dict:
    """Reusable face verification logic"""
    recognition_result = face_system.recognize_employee(image_bytes)
    
    if not recognition_result["success"] or not recognition_result.get("matches"):
        raise HTTPException(status_code=401, detail="Face verification failed")
    
    for match in recognition_result["matches"]:
        if match["employee_id"] == employee_id:
            return match
    
    raise HTTPException(
        status_code=401,
        detail="Face does not match registered employee"
    )

# ============================================================================
# API ENDPOINTS
# ============================================================================

@app.get("/")
def root():
    """Root endpoint"""
    return {
        "message": "Employee Attendance System API",
        "version": "2.0",
        "status": "operational"
    }

@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat()
    }

# ============================================================================
# AUTHENTICATION ENDPOINTS
# ============================================================================

@app.post("/api/auth/login")
async def login(credentials: Login, request: Request):
    """User login endpoint with rate limiting"""
    client_ip = get_client_ip(request)
    
    # Rate limiting
    if not RateLimiter.check_rate_limit(client_ip, "login", config.LOGIN_RATE_LIMIT):
        raise HTTPException(
            status_code=429,
            detail="Too many login attempts. Please try again later."
        )
    
    try:
        with DatabaseManager.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM employees WHERE email = ? AND is_active = 1",
                (credentials.email,)
            )
            employee = cursor.fetchone()
        
        if not employee:
            AuditLogger.log_action(credentials.email, "LOGIN_FAILED", "User not found", client_ip)
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        if not SecurityUtils.verify_password(credentials.password, employee['password']):
            AuditLogger.log_action(employee['employee_id'], "LOGIN_FAILED", "Invalid password", client_ip)
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        token = SecurityUtils.create_token(employee['employee_id'], employee['role'])
        
        AuditLogger.log_action(employee['employee_id'], "LOGIN_SUCCESS", None, client_ip)
        
        return {
            "token": token,
            "employee": {
                "id": employee['employee_id'],
                "name": employee['name'],
                "email": employee['email'],
                "role": employee['role']
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(status_code=500, detail="Login failed")

# ============================================================================
# ADMIN ENDPOINTS
# ============================================================================

@app.post("/api/admin/register-employee")
async def register_employee(
    request: Request,
    employee_id: str = Form(...),
    name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    role: str = Form("employee"),
    face_image: Optional[UploadFile] = File(None),
    face_image_base64: Optional[str] = Form(None),
    token_data: dict = Depends(require_admin)
):
    """Register new employee with face data"""
    client_ip = get_client_ip(request)
    
    try:
        logger.info(f"Registration request for employee: {employee_id}")
        logger.info(f"Has face_image file: {face_image is not None}")
        logger.info(f"Has face_image_base64: {face_image_base64 is not None}")
        
        # Validate input
        employee_data = EmployeeRegistration(
            employee_id=employee_id,
            name=name,
            email=email,
            password=password,
            role=role
        )
        
        # Get image bytes from either source
        image_bytes = None
        
        if face_image:
            logger.info(f"Processing file upload: {face_image.filename}")
            image_bytes = await face_image.read()
            logger.info(f"File size: {len(image_bytes)} bytes")
            
        elif face_image_base64:
            try:
                logger.info(f"Processing base64 data, received length: {len(face_image_base64)}")
                logger.info(f"Base64 prefix: {face_image_base64[:50]}")
                
                # Remove data URI prefix if present
                base64_data = face_image_base64
                if ',' in base64_data:
                    prefix, base64_data = base64_data.split(',', 1)
                    logger.info(f"Removed prefix: {prefix}")
                
                # Clean the base64 string
                base64_data = base64_data.strip().replace('\n', '').replace('\r', '').replace(' ', '')
                logger.info(f"Cleaned base64 length: {len(base64_data)}")
                
                # Check if it's valid base64
                if len(base64_data) < 100:
                    raise HTTPException(status_code=400, detail="Base64 data too short")
                
                # Decode
                image_bytes = base64.b64decode(base64_data)
                logger.info(f"Successfully decoded to {len(image_bytes)} bytes")
                
                # Verify it's a valid image by checking magic bytes
                if image_bytes[:4] == b'\x89PNG':
                    logger.info("Detected PNG image")
                elif image_bytes[:2] == b'\xff\xd8':
                    logger.info("Detected JPEG image")
                else:
                    logger.warning(f"Unknown image format, magic bytes: {image_bytes[:10].hex()}")
                
            except binascii.Error as e:
                logger.error(f"Base64 decode error: {str(e)}")
                raise HTTPException(status_code=400, detail=f"Invalid base64 encoding: {str(e)}")
            except Exception as e:
                logger.error(f"Base64 processing error: {str(e)}", exc_info=True)
                raise HTTPException(status_code=400, detail=f"Failed to process base64 image: {str(e)}")
        else:
            raise HTTPException(status_code=400, detail="No face image provided")
        
        if len(image_bytes) > config.MAX_IMAGE_FILE_SIZE:
            raise HTTPException(status_code=400, detail=f"Image file too large: {len(image_bytes)} bytes (max {config.MAX_IMAGE_FILE_SIZE})")
        
        logger.info(f"Image validated, size: {len(image_bytes)} bytes")
        
        # Register face first (atomic operation)
        face_result = face_system.register_employee_face(employee_id, image_bytes)
        
        if not face_result["success"]:
            logger.error(f"Face registration failed: {face_result['message']}")
            raise HTTPException(status_code=400, detail=face_result["message"])
        
        logger.info("Face registered successfully")
        
        # Hash password
        hashed_password = SecurityUtils.hash_password(password)
        
        # Insert employee
        with DatabaseManager.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """INSERT INTO employees (employee_id, name, email, password, role)
                   VALUES (?, ?, ?, ?, ?)""",
                (employee_id, name, email, hashed_password, role)
            )
        
        AuditLogger.log_action(
            token_data['employee_id'],
            "EMPLOYEE_REGISTERED",
            f"Registered {employee_id}",
            client_ip
        )
        
        logger.info(f"Employee registered successfully: {employee_id}")
        
        return {
            "message": "Employee registered successfully",
            "employee_id": employee_id
        }
        
    except HTTPException:
        raise
    except sqlite3.IntegrityError as e:
        logger.error(f"Database integrity error: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail="Employee ID or email already exists"
        )
    except Exception as e:
        logger.error(f"Unexpected registration error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")


@app.get("/api/admin/attendance")
async def get_attendance(
    date: Optional[str] = None,
    employee_id: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
    token_data: dict = Depends(require_admin)
):
    """Get attendance records with pagination"""
    try:
        # Validate pagination
        if page < 1 or limit < 1 or limit > 100:
            raise HTTPException(status_code=400, detail="Invalid pagination parameters")
        
        offset = (page - 1) * limit
        
        with DatabaseManager.get_connection() as conn:
            cursor = conn.cursor()
            
            # Build query
            query = """
                SELECT a.*, e.name, e.email
                FROM attendance a
                JOIN employees e ON a.employee_id = e.employee_id
                WHERE 1=1
            """
            count_query = """
                SELECT COUNT(*) as total
                FROM attendance a
                JOIN employees e ON a.employee_id = e.employee_id
                WHERE 1=1
            """
            params = []
            
            if date:
                query += " AND a.date = ?"
                count_query += " AND a.date = ?"
                params.append(date)
            
            if employee_id:
                query += " AND a.employee_id = ?"
                count_query += " AND a.employee_id = ?"
                params.append(employee_id)
            
            # Get total count
            cursor.execute(count_query, params)
            total_records = cursor.fetchone()['total']
            
            # Get paginated records
            query += " ORDER BY a.date DESC, a.check_in_time DESC LIMIT ? OFFSET ?"
            params.extend([limit, offset])
            
            cursor.execute(query, params)
            records = cursor.fetchall()
        
        result = []
        for record in records:
            result.append({
                "id": record['id'],
                "employee_id": record['employee_id'],
                "name": record['name'],
                "email": record['email'],
                "date": record['date'],
                "check_in_time": record['check_in_time'],
                "check_out_time": record['check_out_time'],
                "check_in_location": {
                    "latitude": record['check_in_lat'],
                    "longitude": record['check_in_lon']
                } if record['check_in_lat'] else None,
                "check_out_location": {
                    "latitude": record['check_out_lat'],
                    "longitude": record['check_out_lon']
                } if record['check_out_lat'] else None,
                "check_in_confidence": record['check_in_confidence'],
                "check_out_confidence": record['check_out_confidence'],
                "status": record['status']
            })
        
        return {
            "records": result,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total_records,
                "pages": (total_records + limit - 1) // limit
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get attendance: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve attendance records")

@app.get("/api/admin/employees")
async def get_employees(
    page: int = 1,
    limit: int = 50,
    token_data: dict = Depends(require_admin)
):
    """Get all employees with pagination"""
    try:
        if page < 1 or limit < 1 or limit > 100:
            raise HTTPException(status_code=400, detail="Invalid pagination parameters")
        
        offset = (page - 1) * limit
        
        with DatabaseManager.get_connection() as conn:
            cursor = conn.cursor()
            
            # Get total count
            cursor.execute("SELECT COUNT(*) as total FROM employees")
            total = cursor.fetchone()['total']
            
            # Get paginated employees
            cursor.execute(
                """SELECT employee_id, name, email, role, is_active, created_at
                   FROM employees
                   ORDER BY created_at DESC
                   LIMIT ? OFFSET ?""",
                (limit, offset)
            )
            employees = cursor.fetchall()
        
        return {
            "employees": [
                {
                    "employee_id": e['employee_id'],
                    "name": e['name'],
                    "email": e['email'],
                    "role": e['role'],
                    "is_active": bool(e['is_active']),
                    "created_at": e['created_at']
                }
                for e in employees
            ],
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        }
    except Exception as e:
        logger.error(f"Failed to get employees: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve employees")

@app.get("/api/admin/analytics")
async def get_analytics(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    token_data: dict = Depends(require_admin)
):
    """Get attendance analytics"""
    try:
        with DatabaseManager.get_connection() as conn:
            cursor = conn.cursor()
            
            # Build date filter
            date_filter = ""
            params = []
            if start_date and end_date:
                date_filter = "WHERE date BETWEEN ? AND ?"
                params = [start_date, end_date]
            elif start_date:
                date_filter = "WHERE date >= ?"
                params = [start_date]
            elif end_date:
                date_filter = "WHERE date <= ?"
                params = [end_date]
            
            # Total attendance records
            cursor.execute(f"SELECT COUNT(*) as total FROM attendance {date_filter}", params)
            total_records = cursor.fetchone()['total']
            
            # Complete check-ins and check-outs
            cursor.execute(
                f"""SELECT 
                    COUNT(*) as complete_days,
                    COUNT(CASE WHEN check_out_time IS NULL THEN 1 END) as incomplete_days
                    FROM attendance {date_filter}""",
                params
            )
            completion = cursor.fetchone()
            
            # Average confidence
            cursor.execute(
                f"""SELECT 
                    AVG(check_in_confidence) as avg_checkin_confidence,
                    AVG(check_out_confidence) as avg_checkout_confidence
                    FROM attendance {date_filter}""",
                params
            )
            confidence = cursor.fetchone()
            
            # Top employees by attendance
            cursor.execute(
                f"""SELECT e.name, e.employee_id, COUNT(*) as days
                    FROM attendance a
                    JOIN employees e ON a.employee_id = e.employee_id
                    {date_filter}
                    GROUP BY a.employee_id
                    ORDER BY days DESC
                    LIMIT 10""",
                params
            )
            top_employees = cursor.fetchall()
        
        return {
            "total_records": total_records,
            "complete_days": completion['complete_days'],
            "incomplete_days": completion['incomplete_days'],
            "average_confidence": {
                "check_in": round(confidence['avg_checkin_confidence'] or 0, 4),
                "check_out": round(confidence['avg_checkout_confidence'] or 0, 4)
            },
            "top_employees": [
                {
                    "name": emp['name'],
                    "employee_id": emp['employee_id'],
                    "attendance_days": emp['days']
                }
                for emp in top_employees
            ]
        }
    except Exception as e:
        logger.error(f"Failed to get analytics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve analytics")

@app.patch("/api/admin/employees/{employee_id}/status")
async def update_employee_status(
    employee_id: str,
    is_active: bool,
    request: Request,
    token_data: dict = Depends(require_admin)
):
    """Activate or deactivate an employee"""
    client_ip = get_client_ip(request)
    
    try:
        with DatabaseManager.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE employees SET is_active = ? WHERE employee_id = ?",
                (1 if is_active else 0, employee_id)
            )
            
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Employee not found")
        
        action = "EMPLOYEE_ACTIVATED" if is_active else "EMPLOYEE_DEACTIVATED"
        AuditLogger.log_action(token_data['employee_id'], action, f"Employee: {employee_id}", client_ip)
        
        return {
            "message": f"Employee {'activated' if is_active else 'deactivated'} successfully",
            "employee_id": employee_id,
            "is_active": is_active
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update employee status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update employee status")

# ============================================================================
# ATTENDANCE ENDPOINTS
# ============================================================================
@app.post("/api/attendance/check-in")
async def check_in(
    request: Request,
    latitude: float = Form(...),
    longitude: float = Form(...),
    face_image: Optional[UploadFile] = File(None),
    face_image_base64: Optional[str] = Form(None),
    token_data: dict = Depends(get_current_user)
):
    """Check-in with face verification and location validation"""
    employee_id = token_data['employee_id']
    client_ip = get_client_ip(request)
    
    logger.info(f"Check-in attempt by {employee_id} from ({latitude}, {longitude})")
    
    # Rate limiting
    if not RateLimiter.check_rate_limit(employee_id, "checkin", config.CHECKIN_RATE_LIMIT):
        raise HTTPException(
            status_code=429,
            detail="Too many check-in attempts. Please try again later."
        )
    
    try:
        # Validate location
        logger.info(f"Validating location: {latitude}, {longitude}")
        location_valid, location_msg = LocationUtils.validate_location(latitude, longitude)
        logger.info(f"Location validation result: {location_valid}, message: {location_msg}")
        
        if not location_valid:
            AuditLogger.log_action(employee_id, "CHECKIN_FAILED", f"Invalid location: {location_msg}", client_ip)
            raise HTTPException(status_code=400, detail=location_msg)
        
        # Validate time
        logger.info("Validating check-in time")
        # time_valid, time_msg = TimeUtils.validate_check_in_time()
        time_valid, time_msg = TimeUtils.validate_check_in_time(employee_id)
        logger.info(f"Time validation result: {time_valid}, message: {time_msg}")

        
  
        
        if not time_valid:
            AuditLogger.log_action(employee_id, "CHECKIN_FAILED", f"Invalid time: {time_msg}", client_ip)
            raise HTTPException(status_code=400, detail=time_msg)
        
        # Get image bytes from either source
        logger.info("Processing face image")
        image_bytes = None
        
        if face_image:
            logger.info("Receiving file upload")
            image_bytes = await face_image.read()
        elif face_image_base64:
            logger.info("Receiving base64 image")
            try:
                base64_data = face_image_base64
                if ',' in base64_data:
                    base64_data = base64_data.split(',', 1)[1]
                base64_data = base64_data.strip().replace('\n', '').replace('\r', '').replace(' ', '')
                image_bytes = base64.b64decode(base64_data)
                logger.info(f"Decoded {len(image_bytes)} bytes from base64")
            except Exception as e:
                logger.error(f"Base64 decode error: {str(e)}")
                raise HTTPException(status_code=400, detail="Invalid base64 image data")
        else:
            logger.error("No face image provided")
            raise HTTPException(status_code=400, detail="No face image provided")
        
        # Verify face
        logger.info(f"Verifying face for employee {employee_id}")
        best_match = await verify_employee_face(employee_id, image_bytes)
        logger.info(f"Face verification confidence: {best_match['confidence']}")
        
        # Check if already checked in today
        today = datetime.now().date()
        with DatabaseManager.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """SELECT id FROM attendance
                   WHERE employee_id = ? AND date = ? AND check_in_time IS NOT NULL""",
                (employee_id, today)
            )
            existing = cursor.fetchone()
            
            if existing:
                logger.warning(f"Employee {employee_id} already checked in today")
                raise HTTPException(status_code=400, detail="Already checked in today")
            
            # Save face image
            image_path = face_system.save_face_image(employee_id, image_bytes, "checkin")
            
            # Create check-in record
            check_in_time = datetime.now()
            cursor.execute(
                """INSERT INTO attendance
                   (employee_id, check_in_time, check_in_lat, check_in_lon,
                    check_in_image_path, date, check_in_confidence, status)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (employee_id, check_in_time, latitude, longitude,
                 image_path, today, best_match["confidence"], "checked_in")
            )
        
        AuditLogger.log_action(employee_id, "CHECKIN_SUCCESS", f"Location: {location_msg}", client_ip)
        logger.info(f"Check-in successful: {employee_id} at {check_in_time}")
        
        return {
            "message": "Checked in successfully",
            "time": check_in_time.isoformat(),
            "location": {
                "latitude": latitude,
                "longitude": longitude,
                "validation": location_msg
            },
            "confidence": best_match["confidence"]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Check-in error for {employee_id}: {str(e)}", exc_info=True)
        AuditLogger.log_action(employee_id, "CHECKIN_ERROR", str(e), client_ip)
        raise HTTPException(status_code=500, detail="Check-in failed")

@app.post("/api/attendance/check-out")
async def check_out(
    request: Request,
    latitude: float = Form(...),
    longitude: float = Form(...),
    face_image: Optional[UploadFile] = File(None),
    face_image_base64: Optional[str] = Form(None),
    token_data: dict = Depends(get_current_user)
):
    """Check-out with face verification and location validation"""
    employee_id = token_data['employee_id']
    client_ip = get_client_ip(request)
    
    # Rate limiting
    if not RateLimiter.check_rate_limit(employee_id, "checkout", config.CHECKIN_RATE_LIMIT):
        raise HTTPException(
            status_code=429,
            detail="Too many check-out attempts. Please try again later."
        )
    
    try:
        # Validate location
        location_valid, location_msg = LocationUtils.validate_location(latitude, longitude)
        if not location_valid:
            AuditLogger.log_action(employee_id, "CHECKOUT_FAILED", f"Invalid location: {location_msg}", client_ip)
            raise HTTPException(status_code=400, detail=location_msg)
        
        # Validate time
        # time_valid, time_msg = TimeUtils.validate_check_out_time()
        time_valid, time_msg = TimeUtils.validate_check_out_time(employee_id)
        if not time_valid:
            AuditLogger.log_action(employee_id, "CHECKOUT_FAILED", f"Invalid time: {time_msg}", client_ip)
            raise HTTPException(status_code=400, detail=time_msg)
        
        # Get image bytes from either source
        image_bytes = None
        
        if face_image:
            image_bytes = await face_image.read()
        elif face_image_base64:
            try:
                base64_data = face_image_base64
                if ',' in base64_data:
                    base64_data = base64_data.split(',', 1)[1]
                base64_data = base64_data.strip().replace('\n', '').replace('\r', '').replace(' ', '')
                image_bytes = base64.b64decode(base64_data)
            except Exception as e:
                logger.error(f"Base64 decode error: {str(e)}")
                raise HTTPException(status_code=400, detail="Invalid base64 image data")
        else:
            raise HTTPException(status_code=400, detail="No face image provided")
        
        # Verify face
        best_match = await verify_employee_face(employee_id, image_bytes)
        
        # Find today's check-in record
        today = datetime.now().date()
        with DatabaseManager.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """SELECT * FROM attendance
                   WHERE employee_id = ? AND date = ?
                   AND check_in_time IS NOT NULL AND check_out_time IS NULL""",
                (employee_id, today)
            )
            record = cursor.fetchone()
            
            if not record:
                raise HTTPException(
                    status_code=400,
                    detail="No active check-in found for today"
                )
            
            # Save face image
            image_path = face_system.save_face_image(employee_id, image_bytes, "checkout")
            
            # Update with check-out
            check_out_time = datetime.now()
            cursor.execute(
                """UPDATE attendance
                   SET check_out_time = ?, check_out_lat = ?, check_out_lon = ?,
                       check_out_image_path = ?, check_out_confidence = ?, status = ?
                   WHERE id = ?""",
                (check_out_time, latitude, longitude, image_path,
                 best_match["confidence"], "completed", record['id'])
            )
        
        AuditLogger.log_action(employee_id, "CHECKOUT_SUCCESS", f"Location: {location_msg}", client_ip)
        logger.info(f"Check-out successful: {employee_id} at {check_out_time}")
        
        return {
            "message": "Checked out successfully",
            "time": check_out_time.isoformat(),
            "location": {
                "latitude": latitude,
                "longitude": longitude,
                "validation": location_msg
            },
            "confidence": best_match["confidence"]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Check-out error for {employee_id}: {str(e)}")
        AuditLogger.log_action(employee_id, "CHECKOUT_ERROR", str(e), client_ip)
        raise HTTPException(status_code=500, detail="Check-out failed")

# ============================================================================
# EMPLOYEE ENDPOINTS
# ============================================================================

@app.get("/api/employee/my-attendance")
async def get_my_attendance(
    page: int = 1,
    limit: int = 30,
    token_data: dict = Depends(get_current_user)
):
    """Get current employee's attendance records"""
    employee_id = token_data['employee_id']
    
    try:
        if page < 1 or limit < 1 or limit > 100:
            raise HTTPException(status_code=400, detail="Invalid pagination parameters")
        
        offset = (page - 1) * limit
        
        with DatabaseManager.get_connection() as conn:
            cursor = conn.cursor()
            
            # Get total count
            cursor.execute(
                "SELECT COUNT(*) as total FROM attendance WHERE employee_id = ?",
                (employee_id,)
            )
            total = cursor.fetchone()['total']
            
            # Get paginated records
            cursor.execute(
                """SELECT * FROM attendance
                   WHERE employee_id = ?
                   ORDER BY date DESC, check_in_time DESC
                   LIMIT ? OFFSET ?""",
                (employee_id, limit, offset)
            )
            records = cursor.fetchall()
        
        result = []
        for record in records:
            result.append({
                "id": record['id'],
                "date": record['date'],
                "check_in_time": record['check_in_time'],
                "check_out_time": record['check_out_time'],
                "check_in_location": {
                    "latitude": record['check_in_lat'],
                    "longitude": record['check_in_lon']
                } if record['check_in_lat'] else None,
                "check_out_location": {
                    "latitude": record['check_out_lat'],
                    "longitude": record['check_out_lon']
                } if record['check_out_lat'] else None,
                "check_in_confidence": record['check_in_confidence'],
                "check_out_confidence": record['check_out_confidence'],
                "status": record['status']
            })
        
        return {
            "records": result,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        }
    except Exception as e:
        logger.error(f"Failed to get attendance for {employee_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve attendance records")

@app.get("/api/employee/status")
async def get_status(token_data: dict = Depends(get_current_user)):
    """Get current employee's attendance status for today"""
    employee_id = token_data['employee_id']
    today = datetime.now().date()
    
    try:
        with DatabaseManager.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM attendance WHERE employee_id = ? AND date = ?",
                (employee_id, today)
            )
            record = cursor.fetchone()
        
        return {
            "checked_in": record is not None and record['check_in_time'] is not None,
            "checked_out": record is not None and record['check_out_time'] is not None,
            "check_in_time": record['check_in_time'] if record else None,
            "check_out_time": record['check_out_time'] if record else None,
            "status": record['status'] if record else "not_checked_in",
            "date": today.isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to get status for {employee_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve status")

@app.get("/api/employee/profile")
async def get_profile(token_data: dict = Depends(get_current_user)):
    """Get current employee's profile"""
    employee_id = token_data['employee_id']
    
    try:
        with DatabaseManager.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """SELECT employee_id, name, email, role, created_at
                   FROM employees WHERE employee_id = ?""",
                (employee_id,)
            )
            employee = cursor.fetchone()
            
            if not employee:
                raise HTTPException(status_code=404, detail="Employee not found")
            
            # Get attendance statistics
            cursor.execute(
                """SELECT
                    COUNT(*) as total_days,
                    COUNT(CASE WHEN check_out_time IS NOT NULL THEN 1 END) as complete_days,
                    AVG(check_in_confidence) as avg_confidence
                   FROM attendance WHERE employee_id = ?""",
                (employee_id,)
            )
            stats = cursor.fetchone()
        
        return {
            "employee": {
                "employee_id": employee['employee_id'],
                "name": employee['name'],
                "email": employee['email'],
                "role": employee['role'],
                "joined_date": employee['created_at']
            },
            "statistics": {
                "total_attendance_days": stats['total_days'],
                "complete_days": stats['complete_days'],
                "average_confidence": round(stats['avg_confidence'] or 0, 4)
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get profile for {employee_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve profile")



# Get all settings
@app.get("/api/admin/settings")
async def get_settings(token_data: dict = Depends(require_admin)):
    """Get all system settings"""
    try:
        settings = SettingsManager.get_all_settings()
        return {
            "settings": [
                {
                    "key": s['key'],
                    "value": s['value'],
                    "description": s['description'],
                    "updated_at": s['updated_at'],
                    "updated_by": s['updated_by']
                }
                for s in settings
            ]
        }
    except Exception as e:
        logger.error(f"Failed to get settings: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve settings")

# Update setting
@app.put("/api/admin/settings/{key}")
async def update_setting(
    key: str,
    value: str = Form(...),
    request: Request = None,
    token_data: dict = Depends(require_admin)
):
    """Update a system setting"""
    client_ip = get_client_ip(request)
    
    try:
        success = SettingsManager.set_setting(key, value, token_data['employee_id'])
        
        if not success:
            raise HTTPException(status_code=404, detail="Setting not found")
        
        AuditLogger.log_action(
            token_data['employee_id'],
            "SETTING_UPDATED",
            f"Updated {key} to {value}",
            client_ip
        )
        
        return {
            "message": "Setting updated successfully",
            "key": key,
            "value": value
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update setting: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update setting")

# Bulk update settings
@app.post("/api/admin/settings/bulk-update")
async def bulk_update_settings(
    request: Request,
    settings: dict,
    token_data: dict = Depends(require_admin)
):
    """Update multiple settings at once"""
    client_ip = get_client_ip(request)
    
    try:
        updated = []
        for key, value in settings.items():
            if SettingsManager.set_setting(key, str(value), token_data['employee_id']):
                updated.append(key)
        
        AuditLogger.log_action(
            token_data['employee_id'],
            "SETTINGS_BULK_UPDATE",
            f"Updated {len(updated)} settings",
            client_ip
        )
        
        return {
            "message": f"Updated {len(updated)} settings",
            "updated": updated
        }
    except Exception as e:
        logger.error(f"Failed to bulk update settings: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update settings")


# ============================================================================
# EMPLOYEE DELETION
# ============================================================================

@app.delete("/api/admin/employees/{employee_id}")
async def delete_employee(
    employee_id: str,
    request: Request,
    token_data: dict = Depends(require_admin)
):
    """Permanently delete an employee from the system"""
    client_ip = get_client_ip(request)
    
    try:
        # Prevent self-deletion
        if employee_id == token_data['employee_id']:
            raise HTTPException(status_code=400, detail="Cannot delete your own account")
        
        with DatabaseManager.get_connection() as conn:
            cursor = conn.cursor()
            
            # Check if employee exists
            cursor.execute("SELECT * FROM employees WHERE employee_id = ?", (employee_id,))
            employee = cursor.fetchone()
            
            if not employee:
                raise HTTPException(status_code=404, detail="Employee not found")
            
            # Delete face encodings from face system
            try:
                face_system.delete_employee_face(employee_id)
            except Exception as e:
                logger.warning(f"Failed to delete face data for {employee_id}: {str(e)}")
            
            # Delete attendance records (optional - you might want to keep for records)
            # Uncomment if you want to delete attendance history
            # cursor.execute("DELETE FROM attendance WHERE employee_id = ?", (employee_id,))
            
            # Mark attendance records as deleted instead (recommended for audit trail)
            cursor.execute("""
                UPDATE attendance 
                SET status = 'deleted', check_out_time = CURRENT_TIMESTAMP 
                WHERE employee_id = ? AND status != 'deleted'
            """, (employee_id,))
            
            # Delete employee
            cursor.execute("DELETE FROM employees WHERE employee_id = ?", (employee_id,))
            
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Failed to delete employee")
        
        AuditLogger.log_action(
            token_data['employee_id'],
            "EMPLOYEE_DELETED",
            f"Deleted employee: {employee_id} ({employee['name']})",
            client_ip
        )
        
        logger.info(f"Employee deleted: {employee_id} by {token_data['employee_id']}")
        
        return {
            "message": "Employee deleted successfully",
            "employee_id": employee_id,
            "name": employee['name']
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete employee: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to delete employee")

# ============================================================================
# SHIFT SCHEDULING SYSTEM
# ============================================================================


# Shift Management Endpoints

@app.get("/api/admin/shifts")
async def get_shifts(token_data: dict = Depends(require_admin)):
    """Get all shifts"""
    try:
        with DatabaseManager.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT s.*, 
                       COUNT(es.id) as employee_count
                FROM shifts s
                LEFT JOIN employee_shifts es ON s.id = es.shift_id AND es.is_active = 1
                WHERE s.is_active = 1
                GROUP BY s.id
                ORDER BY s.shift_name
            """)
            shifts = cursor.fetchall()
        
        return {
            "shifts": [
                {
                    "id": s['id'],
                    "shift_name": s['shift_name'],
                    "start_time": s['start_time'],
                    "end_time": s['end_time'],
                    "check_in_start": s['check_in_start'],
                    "check_in_end": s['check_in_end'],
                    "check_out_start": s['check_out_start'],
                    "check_out_end": s['check_out_end'],
                    "days_of_week": s['days_of_week'].split(','),
                    "employee_count": s['employee_count'],
                    "created_at": s['created_at']
                }
                for s in shifts
            ]
        }
    except Exception as e:
        logger.error(f"Failed to get shifts: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve shifts")

@app.post("/api/admin/shifts")
async def create_shift(
    request: Request,
    shift_name: str = Form(...),
    start_time: str = Form(...),
    end_time: str = Form(...),
    check_in_start: str = Form(...),
    check_in_end: str = Form(...),
    check_out_start: str = Form(...),
    check_out_end: str = Form(...),
    days_of_week: str = Form(...),
    token_data: dict = Depends(require_admin)
):
    """Create a new shift"""
    client_ip = get_client_ip(request)
    
    try:
        with DatabaseManager.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO shifts 
                (shift_name, start_time, end_time, check_in_start, check_in_end,
                 check_out_start, check_out_end, days_of_week, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (shift_name, start_time, end_time, check_in_start, check_in_end,
                  check_out_start, check_out_end, days_of_week, token_data['employee_id']))
            
            shift_id = cursor.lastrowid
        
        AuditLogger.log_action(
            token_data['employee_id'],
            "SHIFT_CREATED",
            f"Created shift: {shift_name}",
            client_ip
        )
        
        return {
            "message": "Shift created successfully",
            "shift_id": shift_id
        }
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Shift name already exists")
    except Exception as e:
        logger.error(f"Failed to create shift: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create shift")

@app.put("/api/admin/shifts/{shift_id}")
async def update_shift(
    shift_id: int,
    request: Request,
    shift_name: str = Form(...),
    start_time: str = Form(...),
    end_time: str = Form(...),
    check_in_start: str = Form(...),
    check_in_end: str = Form(...),
    check_out_start: str = Form(...),
    check_out_end: str = Form(...),
    days_of_week: str = Form(...),
    token_data: dict = Depends(require_admin)
):
    """Update a shift"""
    client_ip = get_client_ip(request)
    
    try:
        with DatabaseManager.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE shifts
                SET shift_name = ?, start_time = ?, end_time = ?,
                    check_in_start = ?, check_in_end = ?,
                    check_out_start = ?, check_out_end = ?,
                    days_of_week = ?
                WHERE id = ?
            """, (shift_name, start_time, end_time, check_in_start, check_in_end,
                  check_out_start, check_out_end, days_of_week, shift_id))
            
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Shift not found")
        
        AuditLogger.log_action(
            token_data['employee_id'],
            "SHIFT_UPDATED",
            f"Updated shift ID: {shift_id}",
            client_ip
        )
        
        return {"message": "Shift updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update shift: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update shift")

@app.delete("/api/admin/shifts/{shift_id}")
async def delete_shift(
    shift_id: int,
    request: Request,
    token_data: dict = Depends(require_admin)
):
    """Delete a shift"""
    client_ip = get_client_ip(request)
    
    try:
        with DatabaseManager.get_connection() as conn:
            cursor = conn.cursor()
            
            # Check if shift has employees
            cursor.execute("""
                SELECT COUNT(*) as count FROM employee_shifts 
                WHERE shift_id = ? AND is_active = 1
            """, (shift_id,))
            
            if cursor.fetchone()['count'] > 0:
                raise HTTPException(
                    status_code=400,
                    detail="Cannot delete shift with active employees. Remove employees first."
                )
            
            cursor.execute("UPDATE shifts SET is_active = 0 WHERE id = ?", (shift_id,))
            
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Shift not found")
        
        AuditLogger.log_action(
            token_data['employee_id'],
            "SHIFT_DELETED",
            f"Deleted shift ID: {shift_id}",
            client_ip
        )
        
        return {"message": "Shift deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete shift: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete shift")

# Employee Shift Assignment

@app.post("/api/admin/employees/{employee_id}/assign-shift")
async def assign_shift(
    employee_id: str,
    request: Request,
    shift_id: int = Form(...),
    effective_from: str = Form(...),
    effective_to: Optional[str] = Form(None),
    token_data: dict = Depends(require_admin)
):
    """Assign shift to employee"""
    client_ip = get_client_ip(request)
    
    try:
        with DatabaseManager.get_connection() as conn:
            cursor = conn.cursor()
            
            # Deactivate previous shifts
            cursor.execute("""
                UPDATE employee_shifts 
                SET is_active = 0 
                WHERE employee_id = ? AND is_active = 1
            """, (employee_id,))
            
            # Assign new shift
            cursor.execute("""
                INSERT INTO employee_shifts
                (employee_id, shift_id, effective_from, effective_to, created_by)
                VALUES (?, ?, ?, ?, ?)
            """, (employee_id, shift_id, effective_from, effective_to, token_data['employee_id']))
        
        AuditLogger.log_action(
            token_data['employee_id'],
            "SHIFT_ASSIGNED",
            f"Assigned shift {shift_id} to {employee_id}",
            client_ip
        )
        
        return {"message": "Shift assigned successfully"}
    except Exception as e:
        logger.error(f"Failed to assign shift: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to assign shift")

@app.get("/api/admin/employees/{employee_id}/shift")
async def get_employee_shift(
    employee_id: str,
    token_data: dict = Depends(require_admin)
):
    """Get employee's current shift"""
    try:
        with DatabaseManager.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT es.*, s.*
                FROM employee_shifts es
                JOIN shifts s ON es.shift_id = s.id
                WHERE es.employee_id = ? AND es.is_active = 1
                ORDER BY es.effective_from DESC
                LIMIT 1
            """, (employee_id,))
            
            shift = cursor.fetchone()
            
            if not shift:
                return {"shift": None}
            
            return {
                "shift": {
                    "id": shift['shift_id'],
                    "shift_name": shift['shift_name'],
                    "start_time": shift['start_time'],
                    "end_time": shift['end_time'],
                    "check_in_start": shift['check_in_start'],
                    "check_in_end": shift['check_in_end'],
                    "check_out_start": shift['check_out_start'],
                    "check_out_end": shift['check_out_end'],
                    "days_of_week": shift['days_of_week'].split(','),
                    "effective_from": shift['effective_from'],
                    "effective_to": shift['effective_to']
                }
            }
    except Exception as e:
        logger.error(f"Failed to get employee shift: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve shift")



# ============================================================================
# ERROR HANDLERS
# ============================================================================

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler"""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return {
        "detail": "An internal error occurred. Please try again later.",
        "status_code": 500
    }

# ============================================================================
# STARTUP EVENT
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Run on application startup"""
    logger.info("=" * 50)
    logger.info("Employee Attendance System Starting")
    logger.info(f"Database: {config.DATABASE_PATH}")
    logger.info(f"Face Images Directory: {config.FACE_IMAGES_DIR}")
    logger.info(f"Device: {config.DEVICE}")
    logger.info("=" * 50)

# ============================================================================
# MAIN
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )











    
   