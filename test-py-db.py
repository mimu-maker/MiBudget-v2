import os
import sys
import urllib.request
import json
from datetime import datetime

# Read JSON
json_path = "docs/PRD/UI_Specification/demo_transactions.json"
with open(json_path, 'r') as f:
    raw_data = json.load(f)

url = os.environ.get("VITE_SUPABASE_URL", "https://irudwhbkkdbhufjtofog.supabase.co") + "/rest/v1/transactions"
key = os.environ.get("VITE_SUPABASE_ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlydWR3aGJra2RiaHVmanRvZm9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3Mjg5NzQsImV4cCI6MjA4NDMwNDk3NH0.F_HZyKq_otxZW1mBi0UZnJunFJY_0np2BrIdQA4tp2k")

headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

payloads = []
for t in raw_data:
    payloads.append({
        "user_id": "00000000-0000-0000-0000-000000000002",
        "date": t.get("date"),
        "merchant": t.get("merchant", "Unknown"),
        "amount": t.get("amount", 0),
        "account": t.get("account", "Demo Checking"),
        "status": t.get("status", "Complete"),
        "category": t.get("category", ""),
        "sub_category": t.get("sub_category", ""),
        "planned": t.get("planned", False),
        "recurring": t.get("recurring", "N/A"),
        "fingerprint": f"demo-fg-{t.get('date')}-{t.get('merchant')}-{t.get('amount')}-{int(datetime.now().timestamp() * 1000)}"
    })

# Supabase limits inserts, chunk them
CHUNK_SIZE = 100
for i in range(0, len(payloads), CHUNK_SIZE):
    chunk = payloads[i:i + CHUNK_SIZE]
    req = urllib.request.Request(url, data=json.dumps(chunk).encode('utf-8'), headers=headers, method='POST')
    try:
        with urllib.request.urlopen(req) as response:
            result = response.read().decode('utf-8')
            print(f"Success inserted chunk {i // CHUNK_SIZE + 1}: {len(chunk)} records")
    except Exception as e:
        print(f"Error on chunk {i // CHUNK_SIZE + 1}: {e}")
        if hasattr(e, 'read'):
            print(e.read().decode('utf-8'))
