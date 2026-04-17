import os
from sqlalchemy import create_engine, text

# This helps find the file even if you are in the 'backend' folder
db_path = os.path.join(os.getcwd(), "..", "lostfound.sqlite3")
print(f"Looking for database at: {db_path}")

engine = create_engine(f"sqlite:///{db_path}")

email_to_promote = "chickennugget@gmail.com"

try:
    with engine.connect() as conn:
        result = conn.execute(
            text("UPDATE users SET role = 'admin' WHERE email = :email"),
            {"email": email_to_promote}
        )
        conn.commit()
        
        if result.rowcount == 0:
            print(f"❌ Could not find a user with email: {email_to_promote}")
            print("Hint: Make sure you have actually registered this email in the browser first!")
        else:
            print(f"✅ Success! {email_to_promote} is now an admin.")
except Exception as e:
    print(f"⚠️ Error: {e}")