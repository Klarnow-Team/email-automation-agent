"""One-off script: delete all campaigns from the database."""
import sys
from pathlib import Path

# Allow importing app when run as script
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.database import SessionLocal
from app.models.campaign import Campaign


def main():
    db = SessionLocal()
    try:
        count = db.query(Campaign).count()
        if count == 0:
            print("No campaigns to delete.")
            return
        db.query(Campaign).delete()
        db.commit()
        print(f"Deleted {count} campaign(s).")
    finally:
        db.close()


if __name__ == "__main__":
    main()
