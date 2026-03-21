import json
import uuid
import datetime

json_path = "docs/PRD/UI_Specification/demo_transactions.json"
out_path = "insert_demo.sql"

with open(json_path, 'r') as f:
    data = json.load(f)

# The user_id we configured for the local demo account
user_id = "00000000-0000-0000-0000-000000000002"

out = f"""
-- Ensure the demo user exists in auth.users to satisfy the foreign key constraint
INSERT INTO auth.users (id, aud, role, email, email_confirmed_at)
VALUES (
    '{user_id}', 
    'authenticated', 
    'authenticated', 
    'demo@example.com', 
    now()
) ON CONFLICT (id) DO NOTHING;

-- Drop the restrictive check constraint because our statuses like 'Pending' and 'Pending Reconciliation' are valid
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_status_check;

DELETE FROM public.transactions WHERE user_id = '{user_id}';

"""

vals = []
for d in data:
    tx_id = str(uuid.uuid4())
    date = d.get('date', '2026-03-01')
    merchant = d.get('merchant', 'Unknown').replace("'", "''")
    amount = float(d.get('amount', 0))
    account = d.get('account', 'Demo').replace("'", "''")
    status = d.get('status', 'Complete').replace("'", "''")
    category = d.get('category', '').replace("'", "''")
    sub_category = d.get('sub_category', '').replace("'", "''")
    planned = "true" if d.get('planned') else "false"
    recurring = d.get('recurring', 'N/A').replace("'", "''")
    
    # generate a unique fingerprint
    ts = int(datetime.datetime.now().timestamp() * 1000)
    fingerprint = f"demo-fg-{date}-{merchant}-{amount}-{ts}-{tx_id}"
    
    val = f"('{tx_id}', '{user_id}', '{date}', '{merchant}', {amount}, '{account}', '{status}', '{category}', '{sub_category}', {planned}, '{recurring}', '{fingerprint}')"
    vals.append(val)

# Chunk the inserts so Supabase Editor doesn't crash on a massive 1900 row Insert
CHUNK_SIZE = 500
for i in range(0, len(vals), CHUNK_SIZE):
    chunk = vals[i:i + CHUNK_SIZE]
    sql = "INSERT INTO public.transactions (id, user_id, date, merchant, amount, account, status, category, sub_category, planned, recurring, fingerprint) VALUES\n"
    sql += ",\n".join(chunk) + ";\n\n"
    out += sql

with open(out_path, 'w') as f:
    f.write(out)

print(f"Generated SQL for {len(vals)} records.")
