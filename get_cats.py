import requests
import json

url = 'https://irudwhbkkdbhufjtofog.supabase.co/rest/v1/categories'
headers = {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlydWR3aGJra2RiaHVmanRvZm9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3Mjg5NzQsImV4cCI6MjA4NDMwNDk3NH0.F_HZyKq_otxZW1mBi0UZnJunFJY_0np2BrIdQA4tp2k',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlydWR3aGJra2RiaHVmanRvZm9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3Mjg5NzQsImV4cCI6MjA4NDMwNDk3NH0.F_HZyKq_otxZW1mBi0UZnJunFJY_0np2BrIdQA4tp2k'
}
params = {
    'select': 'id,name,category_group,sub_categories(id,name,budget_amount)',
    'user_id': 'eq.00000000-0000-0000-0000-000000000002'
}

response = requests.get(url, headers=headers, params=params)
if response.status_code == 200:
    print(json.dumps(response.json(), indent=2))
else:
    print(f"Error {response.status_code}: {response.text}")
