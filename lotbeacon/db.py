from contextlib import contextmanager

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import DATABASE_URL


class Base(DeclarativeBase):
    pass


connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def init_db():
    from . import models  # noqa: F401  (register tables)

    Base.metadata.create_all(engine)
    _migrate()


def _migrate():
    """Additive-only column migrations for existing SQLite files (no Alembic yet)."""
    from sqlalchemy import inspect, text

    insp = inspect(engine)
    if "threads" in insp.get_table_names():
        cols = {c["name"] for c in insp.get_columns("threads")}
        adds = {"voice": "VARCHAR(32) DEFAULT 'dealer'", "voice_locked": "BOOLEAN DEFAULT 0", "voice_reason": "VARCHAR(200) DEFAULT ''"}
        with engine.begin() as c:
            for col, ddl in adds.items():
                if col not in cols:
                    c.execute(text(f"ALTER TABLE threads ADD COLUMN {col} {ddl}"))


@contextmanager
def session_scope():
    s = SessionLocal()
    try:
        yield s
        s.commit()
    except Exception:
        s.rollback()
        raise
    finally:
        s.close()


def get_session():
    s = SessionLocal()
    try:
        yield s
        s.commit()
    except Exception:
        s.rollback()
        raise
    finally:
        s.close()
