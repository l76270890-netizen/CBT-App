import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

conn = psycopg2.connect(os.environ.get("DATABASE_URL"))
cur = conn.cursor()
cur.execute("UPDATE questions SET image_path = NULL WHERE subject = 'Biology'")
conn.commit()
print(f"Cleared {cur.rowcount} Biology question images.")
cur.close()
conn.close()
print("Done! Refresh your student exam page.")