import argparse

from app.core.config import settings
from app.db.base_class import Base
from app.db.session import engine
from seed_data import seed_data


CONFIRM_TOKEN = "RESET"


def reset_db(confirm: str) -> None:
    if confirm != CONFIRM_TOKEN:
        raise SystemExit(
            "Refusing to reset database without explicit confirmation. "
            f"Re-run with --confirm {CONFIRM_TOKEN}"
        )

    target = f"{settings.MYSQL_SERVER}:{settings.MYSQL_PORT}/{settings.MYSQL_DB}"
    print(f"Resetting database schema on {target} ...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    print("Database schema recreated.")

    seed_data()
    print("Database reset and seed completed.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Drop all managed tables, recreate schema and reseed demo data.",
    )
    parser.add_argument(
        "--confirm",
        default="",
        help=f"Type {CONFIRM_TOKEN} to execute the destructive reset.",
    )
    args = parser.parse_args()
    reset_db(args.confirm)
