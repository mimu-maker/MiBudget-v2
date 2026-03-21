import os
import sys
import urllib.request
import json

url = os.environ.get("VITE_SUPABASE_URL", "https://irudwhbkkdbhufjtofog.supabase.co")
key = os.environ.get("VITE_SUPABASE_ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlydWR3aGJra2RiaHVmanRvZm9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3Mjg5NzQsImV4cCI6MjA4NDMwNDk3NH0.F_HZyKq_otxZW1mBi0UZnJunFJY_0np2BrIdQA4tp2k")

headers = {
    "apikey": key,
    "Content-Type": "application/json",
}

payload = {
    "email": "demo_user_test@example.com",
    "password": "Password123!"
}

# Try sign-up
req = urllib.request.Request(url + "/auth/v1/signup", data=json.dumps(payload).encode('utf-8'), headers=headers, method='POST')
try:
    with urllib.request.urlopen(req) as response:
        result = json.loads(response.read().decode('utf-8'))
        print("Signup Success!")
        print(f"Session: {result.get('session') is not None}")
        print(f"User ID: {result.get('user', {}).get('id')}")
except Exception as e:
    print(f"Signup Error: {e}")
    if hasattr(e, 'read'):
        print(e.read().decode('utf-8'))

# Try login
req = urllib.request.Request(url + "/auth/v1/token?grant_type=password", data=json.dumps(payload).encode('utf-8'), headers=headers, method='POST')
try:
    with urllib.request.urlopen(req) as response:
        result = json.loads(response.read().decode('utf-8'))
        print("Login Success!")
        print(f"Token: {result.get('access_token')[:10]}...")
        print(f"User ID: {result.get('user', {}).get('id')}")
except Exception as e:
    print(f"Login Error: {e}")
    if hasattr(e, 'read'):
        print(e.read().decode('utf-8'))
