import sqlite3

conn = sqlite3.connect("examcore.db")
rows = conn.execute(
    "SELECT id, email, role, school_id, account_status FROM users"
).fetchall()
if rows:
    for r in rows:
        print(r)
else:
    print("NO USERS IN DATABASE")
conn.close()
