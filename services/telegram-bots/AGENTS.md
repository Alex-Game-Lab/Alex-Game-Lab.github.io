# AGL Telegram services

Separate service for two bots; never put credentials or user state into static website directories. Keep website publishing and domains unchanged. Use the Python standard library. Never send real Telegram messages during tests. Run python3 -m unittest discover -s tests -v. Startup credentials belong in the server environment, not in code or chat. Changes to routing must preserve owner-only replies, explicit confirmation and duplicate suppression.

