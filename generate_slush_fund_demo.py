import json
import random
from datetime import datetime, timedelta

def get_random_date(start_date, end_date):
    time_between_dates = end_date - start_date
    days_between_dates = time_between_dates.days
    random_number_of_days = random.randrange(days_between_dates)
    return start_date + timedelta(days=random_number_of_days)

start_date = datetime(2024, 1, 1)
end_date = datetime(2026, 4, 30)

# We need exactly 1900 transactions.
# 50 Pending, 50 Pending Reconciliation, 100 Excluded, 1700 Complete
statuses = (
    ["Pending"] * 50 +
    ["Pending Reconciliation"] * 50 +
    ["Excluded"] * 100 +
    ["Complete"] * 1700
)
random.shuffle(statuses)

variable_categories = [
    # (Category, SubCat, Merchant, AmountRange, IsIncome), Weight
    (("Income", "Dividends", "Vanguard", (100, 400), True), 2),
    
    (("Housing", "Electricity", "ConED", (-80, -120), False), 5),
    (("Housing", "Water & Gas", "National Grid", (-40, -80), False), 5),
    (("Housing", "Internet", "Verizon", (-80, -100), False), 5),
    (("Housing", "HOA Fees", "Community HOA", (-200, -200), False), 3),
    
    (("Transport", "Fuel", "Shell", (-40, -80), False), 15),
    (("Transport", "Maintenance", "Jiffy Lube", (-80, -250), False), 5),
    (("Transport", "Public Transit", "MTA", (-30, -80), False), 10),
    (("Transport", "Parking", "City Parking", (-15, -40), False), 10),
    
    (("Food", "Groceries", "Whole Foods", (-80, -150), False), 20),
    (("Food", "Dining Out", "Local Restaurant", (-30, -80), False), 15),
    (("Food", "Coffee Shops", "Starbucks", (-5, -15), False), 30),
    (("Food", "Delivery", "UberEats", (-25, -60), False), 15),
    
    (("Insurance", "Auto", "Progressive", (-150, -220), False), 5),
    (("Insurance", "Health", "BlueCross", (-300, -500), False), 5),
    (("Insurance", "Life", "MetLife", (-80, -150), False), 5),
    
    (("Shopping", "Electronics", "Best Buy", (-80, -300), False), 10),
    (("Shopping", "Clothing", "Nordstrom", (-60, -200), False), 15),
    (("Shopping", "Personal Care", "Sephora", (-50, -150), False), 15),
    (("Shopping", "Hobbies", "Michaels", (-40, -120), False), 10),
    (("Shopping", "Gifts", "Amazon", (-50, -250), False), 10),
    
    (("Slush Fund", "Travel", "Delta Airlines", (-200, -500), False), 10),
    (("Slush Fund", "Home Repair", "Home Depot", (-100, -400), False), 10),
    (("Slush Fund", "Pets", "Veterinary ER", (-40, -180), False), 10),
    (("Slush Fund", "Events", "Ticketmaster", (-80, -200), False), 15),
    (("Slush Fund", "Tech Gadgets", "Apple Store", (-100, -300), False), 10),
    (("Slush Fund", "Furniture", "IKEA", (-150, -400), False), 10)
]

var_cats = [x[0] for x in variable_categories]
var_weights = [x[1] for x in variable_categories]

transactions = []
t_id = 1
fixed_transactions = []

for year in [2024, 2025, 2026]:
    for month in range(1, 13):
        if year == 2026 and month > 4:
            break
        
        # Salary 1
        fixed_transactions.append({
            "id": f"t_{t_id}", "user_id": "00000000-0000-0000-0000-000000000002",
            "date": f"{year}-{month:02d}-01T08:00:00Z", "amount": 6500,
            "merchant": "Tech Corp", "source": "Tech Corp",
            "category": "Income", "sub_category": "Salary", 
            "budget_month": f"{year}-{month:02d}-01", "budget_year": year,
            "status": "Complete", "type": "Credit"
        })
        t_id += 1

        # Salary 2
        fixed_transactions.append({
            "id": f"t_{t_id}", "user_id": "00000000-0000-0000-0000-000000000002",
            "date": f"{year}-{month:02d}-02T08:00:00Z", "amount": 4500,
            "merchant": "Design Agency", "source": "Design Agency",
            "category": "Income", "sub_category": "Salary", 
            "budget_month": f"{year}-{month:02d}-01", "budget_year": year,
            "status": "Complete", "type": "Credit"
        })
        t_id += 1

        # Rental Income
        fixed_transactions.append({
            "id": f"t_{t_id}", "user_id": "00000000-0000-0000-0000-000000000002",
            "date": f"{year}-{month:02d}-05T08:00:00Z", "amount": 1500,
            "merchant": "Rental Property", "source": "Rental Property",
            "category": "Income", "sub_category": "Dividends", # Re-using dividends slot for rental income simplicity if exact subcat doesn't exist
            "budget_month": f"{year}-{month:02d}-01", "budget_year": year,
            "status": "Complete", "type": "Credit"
        })
        t_id += 1

        # Annual Bonus (December Only)
        if month == 12:
            fixed_transactions.append({
                "id": f"t_{t_id}", "user_id": "00000000-0000-0000-0000-000000000002",
                "date": f"{year}-{month:02d}-15T08:00:00Z", "amount": 8000,
                "merchant": "Tech Corp", "source": "Tech Corp",
                "category": "Income", "sub_category": "Bonus", 
                "budget_month": f"{year}-{month:02d}-01", "budget_year": year,
                "status": "Complete", "type": "Credit"
            })
            t_id += 1

        # Mortgage
        fixed_transactions.append({
            "id": f"t_{t_id}", "user_id": "00000000-0000-0000-0000-000000000002",
            "date": f"{year}-{month:02d}-03T09:00:00Z", "amount": -2800,
            "merchant": "Chase Bank", "source": "Chase Bank",
            "category": "Housing", "sub_category": "Mortgage", 
            "budget_month": f"{year}-{month:02d}-01", "budget_year": year,
            "status": "Complete", "type": "Debit"
        })
        t_id += 1

        # Car Payment 1
        fixed_transactions.append({
            "id": f"t_{t_id}", "user_id": "00000000-0000-0000-0000-000000000002",
            "date": f"{year}-{month:02d}-07T09:00:00Z", "amount": -450,
            "merchant": "Toyota Finance", "source": "Toyota Finance",
            "category": "Transport", "sub_category": "Car Payment", 
            "budget_month": f"{year}-{month:02d}-01", "budget_year": year,
            "status": "Complete", "type": "Debit"
        })
        t_id += 1

        # Car Payment 2
        fixed_transactions.append({
            "id": f"t_{t_id}", "user_id": "00000000-0000-0000-0000-000000000002",
            "date": f"{year}-{month:02d}-08T09:00:00Z", "amount": -350,
            "merchant": "Honda Finance", "source": "Honda Finance",
            "category": "Transport", "sub_category": "Car Payment", 
            "budget_month": f"{year}-{month:02d}-01", "budget_year": year,
            "status": "Complete", "type": "Debit"
        })
        t_id += 1

        # Insurance
        fixed_transactions.append({
            "id": f"t_{t_id}", "user_id": "00000000-0000-0000-0000-000000000002",
            "date": f"{year}-{month:02d}-15T09:00:00Z", "amount": -400,
            "merchant": "Geico", "source": "Geico",
            "category": "Insurance", "sub_category": "Home", 
            "budget_month": f"{year}-{month:02d}-01", "budget_year": year,
            "status": "Complete", "type": "Debit"
        })
        t_id += 1

# We need exactly 1900 transactions.
# We have 112 fixed transactions (4 per month * 28 months).
# We need to explicitly generate the special edge cases:
special_cases = []
t_id = len(fixed_transactions) + 1

# 1. Pending Source Mapping (confidence=0, status=Pending, has cat/subcat)
for i in range(15):
    dt = end_date - timedelta(days=random.randint(0, 10))
    cat, subcat, merchant, amount_range, is_inc = random.choices(var_cats, weights=var_weights, k=1)[0]
    special_cases.append({
        "id": f"t_{t_id}", "user_id": "00000000-0000-0000-0000-000000000002",
        "date": dt.strftime("%Y-%m-%dT%H:%M:%SZ"), "amount": round(random.uniform(amount_range[0], amount_range[1]), 2),
        "merchant": merchant, "source": merchant, "clean_source": "",
        "category": cat, "sub_category": subcat, "budget_month": f"{dt.year}-{dt.month:02d}-01", "budget_year": dt.year,
        "status": "Pending", "type": "Credit" if is_inc else "Debit", "confidence": 0
    })
    t_id += 1

# 2. Pending Categorisation (confidence=1, no cat/subcat, status=Pending)
for i in range(15):
    dt = end_date - timedelta(days=random.randint(0, 10))
    _, _, merchant, amount_range, is_inc = random.choices(var_cats, weights=var_weights, k=1)[0]
    special_cases.append({
        "id": f"t_{t_id}", "user_id": "00000000-0000-0000-0000-000000000002",
        "date": dt.strftime("%Y-%m-%dT%H:%M:%SZ"), "amount": round(random.uniform(amount_range[0], amount_range[1]), 2),
        "merchant": merchant, "source": merchant, "clean_source": merchant,
        "category": "", "sub_category": "", "budget_month": f"{dt.year}-{dt.month:02d}-01", "budget_year": dt.year,
        "status": "Pending", "type": "Credit" if is_inc else "Debit", "confidence": 1
    })
    t_id += 1

# 3. Pending Validation (confidence=1, has cat/subcat, status=Pending)
for i in range(15):
    dt = end_date - timedelta(days=random.randint(0, 10))
    cat, subcat, merchant, amount_range, is_inc = random.choices(var_cats, weights=var_weights, k=1)[0]
    special_cases.append({
        "id": f"t_{t_id}", "user_id": "00000000-0000-0000-0000-000000000002",
        "date": dt.strftime("%Y-%m-%dT%H:%M:%SZ"), "amount": round(random.uniform(amount_range[0], amount_range[1]), 2),
        "merchant": merchant, "source": merchant, "clean_source": merchant,
        "category": cat, "sub_category": subcat, "budget_month": f"{dt.year}-{dt.month:02d}-01", "budget_year": dt.year,
        "status": "Pending", "type": "Credit" if is_inc else "Debit", "confidence": 1
    })
    t_id += 1

# 4. Duplicates (identical date, amount, source)
dup_dt = end_date - timedelta(days=5)
dup_amt = -42.50
for i in range(2):
    special_cases.append({
        "id": f"t_{t_id}", "user_id": "00000000-0000-0000-0000-000000000002",
        "date": dup_dt.strftime("%Y-%m-%dT%H:%M:%SZ"), "amount": dup_amt,
        "merchant": "Duplicate Store", "source": "Duplicate Store", "clean_source": "Duplicate Store",
        "category": "Shopping", "sub_category": "Electronics", "budget_month": f"{dup_dt.year}-{dup_dt.month:02d}-01", "budget_year": dup_dt.year,
        "status": "Pending", "type": "Debit", "confidence": 1
    })
    t_id += 1

# 5. Pending Reconciliation (Reduced to 10 total)
# 5a. Two matching ready-to-recon
recon_dt = end_date - timedelta(days=12)
special_cases.append({
    "id": f"t_{t_id}", "user_id": "00000000-0000-0000-0000-000000000002",
    "date": recon_dt.strftime("%Y-%m-%dT%H:%M:%SZ"), "amount": -150.00,
    "merchant": "Recon Match Inc", "source": "Recon Match Inc", "clean_source": "Recon Match Inc",
    "category": "Slush Fund", "sub_category": "Home Repair", "budget_month": f"{recon_dt.year}-{recon_dt.month:02d}-01", "budget_year": recon_dt.year,
    "status": "Pending Reconciliation", "type": "Debit", "confidence": 1
})
t_id += 1
special_cases.append({
    "id": f"t_{t_id}", "user_id": "00000000-0000-0000-0000-000000000002",
    "date": (recon_dt + timedelta(days=1)).strftime("%Y-%m-%dT%H:%M:%SZ"), "amount": 150.00,
    "merchant": "Refund Recon Match Inc", "source": "Refund Recon Match Inc", "clean_source": "Refund Recon Match Inc",
    "category": "Slush Fund", "sub_category": "Home Repair", "budget_month": f"{recon_dt.year}-{recon_dt.month:02d}-01", "budget_year": recon_dt.year,
    "status": "Pending Reconciliation", "type": "Credit", "confidence": 1
})
t_id += 1

# 5b. Eight normal recon items
for i in range(8):
    dt = end_date - timedelta(days=random.randint(10, 20))
    cat, subcat, merchant, amount_range, is_inc = random.choices(var_cats, weights=var_weights, k=1)[0]
    special_cases.append({
        "id": f"t_{t_id}", "user_id": "00000000-0000-0000-0000-000000000002",
        "date": dt.strftime("%Y-%m-%dT%H:%M:%SZ"), "amount": round(random.uniform(amount_range[0], amount_range[1]), 2),
        "merchant": merchant, "source": merchant, "clean_source": merchant,
        "category": cat, "sub_category": subcat, "budget_month": f"{dt.year}-{dt.month:02d}-01", "budget_year": dt.year,
        "status": "Pending Reconciliation", "type": "Credit" if is_inc else "Debit", "confidence": 1
    })
    t_id += 1

# 6. Excluded Items (50 items)
for i in range(50):
    dt = get_random_date(start_date, end_date)
    cat, subcat, merchant, amount_range, is_inc = random.choices(var_cats, weights=var_weights, k=1)[0]
    special_cases.append({
        "id": f"t_{t_id}", "user_id": "00000000-0000-0000-0000-000000000002",
        "date": dt.strftime("%Y-%m-%dT%H:%M:%SZ"), "amount": round(random.uniform(amount_range[0], amount_range[1]), 2),
        "merchant": merchant, "source": merchant, "clean_source": merchant,
        "category": cat, "sub_category": subcat, "budget_month": f"{dt.year}-{dt.month:02d}-01", "budget_year": dt.year,
        "status": "Excluded", "type": "Credit" if is_inc else "Debit", "confidence": 1
    })
    t_id += 1

transactions.extend(fixed_transactions)
transactions.extend(special_cases)

# Generate the remainder as Complete
num_remaining = 1900 - len(transactions)
for i in range(num_remaining):
    dt = get_random_date(start_date, end_date)
    year = dt.year
    month_str = f"{year}-{dt.month:02d}-01"
    
    cat_choice = random.choices(var_cats, weights=var_weights, k=1)[0]
    cat, subcat, merchant, amount_range, is_income = cat_choice
    
    amt = random.uniform(amount_range[0], amount_range[1])
    amt = round(amt, 2)

    transactions.append({
        "id": f"t_{t_id}", "user_id": "00000000-0000-0000-0000-000000000002",
        "date": dt.strftime("%Y-%m-%dT%H:%M:%SZ"), "amount": amt,
        "merchant": merchant, "source": merchant, "clean_source": merchant,
        "category": cat, "sub_category": subcat, 
        "budget_month": month_str, "budget_year": year,
        "status": "Complete", "type": "Credit" if is_income else "Debit", "confidence": 1
    })
    t_id += 1

# Sort by date descending
transactions.sort(key=lambda x: x["date"], reverse=True)

with open("public/demo_data.json", "w") as f:
    json.dump(transactions, f, indent=2)

print(f"Generated {len(transactions)} transactions.")
