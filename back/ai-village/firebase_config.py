from firebase_admin import credentials, firestore
import firebase_admin

def initialize_firebase():
    if not firebase_admin._apps:
        cred = credentials.Certificate("mirrorgram-20713-firebase-adminsdk-u9pdx-c3e12134b4.json")
        firebase_admin.initialize_app(cred, {
            'storageBucket': 'mirrorgram-20713.appspot.com'
        })
    
    return firestore.client()

# 전역 db 객체 생성
db = initialize_firebase()
