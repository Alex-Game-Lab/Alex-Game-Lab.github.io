"""Small SQLite store. Message bodies and files are never stored locally."""
import secrets
import sqlite3
from contextlib import contextmanager

DRAFT_TTL = 15 * 60
ROUTE_TTL = 30 * 24 * 60 * 60


class Store:
    def __init__(self, path):
        self.path = str(path)
        with self.db() as db:
            db.executescript("""
                PRAGMA journal_mode=WAL;
                CREATE TABLE IF NOT EXISTS offsets(bot TEXT PRIMARY KEY, value INTEGER NOT NULL);
                CREATE TABLE IF NOT EXISTS sessions(
                    bot TEXT, chat INTEGER, category TEXT, expires INTEGER,
                    PRIMARY KEY(bot,chat));
                CREATE TABLE IF NOT EXISTS drafts(
                    bot TEXT, id TEXT, chat INTEGER, source INTEGER, category TEXT,
                    created INTEGER, expires INTEGER, status TEXT NOT NULL,
                    PRIMARY KEY(bot,id));
                CREATE TABLE IF NOT EXISTS routes(
                    bot TEXT, message INTEGER, chat INTEGER, expires INTEGER,
                    PRIMARY KEY(bot,message));
                CREATE TABLE IF NOT EXISTS relayed(
                    bot TEXT, message INTEGER, created INTEGER,
                    PRIMARY KEY(bot,message));
            """)

    @contextmanager
    def db(self):
        db = sqlite3.connect(self.path, timeout=5)
        db.row_factory = sqlite3.Row
        try:
            with db:
                yield db
        finally:
            db.close()

    def offset(self, bot):
        with self.db() as db:
            row = db.execute("SELECT value FROM offsets WHERE bot=?", (bot,)).fetchone()
        return row["value"] if row else 0

    def acknowledge(self, bot, value):
        with self.db() as db:
            db.execute("""INSERT INTO offsets VALUES (?,?)
                       ON CONFLICT(bot) DO UPDATE SET value=MAX(offsets.value,excluded.value)""",
                       (bot, value))

    def topic(self, bot, chat, category, now):
        with self.db() as db:
            db.execute("INSERT OR REPLACE INTO sessions VALUES (?,?,?,?)",
                       (bot, chat, category, now + DRAFT_TTL))

    def selected_topic(self, bot, chat, now):
        with self.db() as db:
            row = db.execute("SELECT category FROM sessions WHERE bot=? AND chat=? AND expires>?",
                             (bot, chat, now)).fetchone()
        return row["category"] if row else None

    def draft(self, bot, chat, source, category, now):
        key = secrets.token_hex(8)
        with self.db() as db:
            db.execute("DELETE FROM drafts WHERE bot=? AND chat=? AND status='draft'", (bot, chat))
            db.execute("INSERT INTO drafts VALUES (?,?,?,?,?,?,?,'draft')",
                       (bot, key, chat, source, category, now, now + DRAFT_TTL))
        return key

    def cancel(self, bot, chat):
        with self.db() as db:
            db.execute("DELETE FROM sessions WHERE bot=? AND chat=?", (bot, chat))
            db.execute("DELETE FROM drafts WHERE bot=? AND chat=? AND status='draft'", (bot, chat))

    def claim(self, bot, key, chat, now, hourly_limit=5, cooldown=15):
        with self.db() as db:
            db.execute("BEGIN IMMEDIATE")
            row = db.execute("SELECT * FROM drafts WHERE bot=? AND id=? AND chat=?",
                             (bot, key, chat)).fetchone()
            if not row or row["expires"] <= now:
                return "expired", None
            if row["status"] != "draft":
                return row["status"], None
            recent = db.execute("""SELECT COUNT(*) AS n,MAX(created) AS last FROM drafts
                                WHERE bot=? AND chat=? AND status IN ('sending','sent','uncertain')
                                AND created>?""", (bot, chat, now - 3600)).fetchone()
            if recent["n"] >= hourly_limit:
                return "limit", None
            if recent["last"] is not None and now - recent["last"] < cooldown:
                return "cooldown", None
            db.execute("UPDATE drafts SET status='sending',created=? WHERE bot=? AND id=?",
                       (now, bot, key))
            return "claimed", dict(row)

    def finish(self, bot, key, status):
        assert status in ("sent", "uncertain")
        with self.db() as db:
            db.execute("UPDATE drafts SET status=? WHERE bot=? AND id=?", (status, bot, key))

    def route(self, bot, message, chat, now):
        with self.db() as db:
            db.execute("INSERT OR REPLACE INTO routes VALUES (?,?,?,?)",
                       (bot, message, chat, now + ROUTE_TTL))

    def recipient(self, bot, message, now):
        with self.db() as db:
            row = db.execute("SELECT chat FROM routes WHERE bot=? AND message=? AND expires>?",
                             (bot, message, now)).fetchone()
        return row["chat"] if row else None

    def claim_reply(self, bot, message, now):
        with self.db() as db:
            return db.execute("INSERT OR IGNORE INTO relayed VALUES (?,?,?)",
                              (bot, message, now)).rowcount == 1

    def cleanup(self, now):
        with self.db() as db:
            db.execute("DELETE FROM sessions WHERE expires<=?", (now,))
            db.execute("DELETE FROM drafts WHERE created<=?", (now - ROUTE_TTL,))
            db.execute("DELETE FROM drafts WHERE status='draft' AND expires<=?", (now,))
            db.execute("DELETE FROM routes WHERE expires<=?", (now,))
            db.execute("DELETE FROM relayed WHERE created<=?", (now - ROUTE_TTL,))

