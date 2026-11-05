#!/usr/bin/env python3
"""Two independent Telegram inboxes. Standard library only; no public HTTP port."""
import argparse
import fcntl
import json
import logging
import os
from pathlib import Path
import re
import signal
import threading
import time
import unicodedata
import urllib.error
import urllib.request

from storage import Store

LOG = logging.getLogger("agl_bots")
CONTACT = "https://t.me/akaAlexey"
TOPICS = {
    "personal": {"work": "Работа и сотрудничество", "idea": "Идея", "feedback": "Обратная связь"},
    "agl": {"idea": "Идея для «Рублемёта»", "bug": "Ошибка в игре", "feedback": "Отзыв"},
}
MAX_ATTACHMENT = 10 * 1024 * 1024


class TelegramError(Exception):
    def __init__(self, method, code=0, retry_after=0):
        self.method, self.code, self.retry_after = method, code, retry_after
        super().__init__(f"Telegram operation {method} failed (code={code})")


class Telegram:
    def __init__(self, token):
        self._base = "https://api.telegram.org/bot" + token + "/"

    def call(self, method, **params):
        request = urllib.request.Request(
            self._base + method,
            data=json.dumps(params).encode(),
            headers={"Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(request, timeout=int(params.get("timeout", 0)) + 12) as response:
                result = json.loads(response.read(4_000_000))
        except urllib.error.HTTPError as error:
            # Do not expose the URL or exception text: the token is in the URL.
            retry = 0
            try:
                result = json.loads(error.read(8192))
                retry = min(60, max(0, int(result.get("parameters", {}).get("retry_after", 0))))
            except (ValueError, TypeError, AttributeError):
                pass
            raise TelegramError(method, error.code, retry) from None
        except (urllib.error.URLError, TimeoutError, OSError, ValueError):
            raise TelegramError(method) from None
        if not result.get("ok"):
            raise TelegramError(method, int(result.get("error_code", 0)))
        return result["result"]


def clean_name(value):
    return "".join(c for c in str(value) if unicodedata.category(c) not in ("Cc", "Cf"))[:80]


def accepted_message(message):
    if isinstance(message.get("text"), str):
        return True
    if message.get("photo"):
        return max(int(p.get("file_size", 0)) for p in message["photo"]) <= MAX_ATTACHMENT
    document = message.get("document")
    if document:
        suffix = Path(str(document.get("file_name", ""))).suffix.lower()
        return suffix in (".png", ".jpg", ".jpeg", ".webp", ".pdf", ".txt") and int(document.get("file_size", 0)) <= MAX_ATTACHMENT
    return False


class Bot:
    def __init__(self, key, api, store, owner_id, clock=time.time):
        self.key, self.api, self.store = key, api, store
        self.owner_id, self.clock = owner_id, clock

    def send(self, chat, text, keyboard=None):
        data = {"chat_id": chat, "text": text, "link_preview_options": {"is_disabled": True}}
        if keyboard:
            data["reply_markup"] = {"inline_keyboard": keyboard}
        return self.api.call("sendMessage", **data)

    def menu(self, chat):
        title = "Личный бот Алексея · akaalexey" if self.key == "personal" else "Обратная связь AGL"
        buttons = [[{"text": text, "callback_data": "topic:" + code}] for code, text in TOPICS[self.key].items()]
        self.send(chat, title + "\n\nВыберите тему обращения. Сообщение получит Алексей, ответ придёт через этого бота.\n\nО данных: /privacy\nОтменить черновик: /cancel", buttons)

    def privacy(self, chat):
        self.send(chat, "Получатель обращений — Алексей (@akaAlexey).\n\nПосле кнопки «Отправить» ему передаются выбранная тема, ваше имя и публичный ник Telegram (если есть), текст или вложение. До подтверждения обращение не передаётся получателю.\n\nФайлы не скачиваются на сервер. Текст сообщения там не записывается: сохраняются технические идентификаторы для передачи и ответа. Черновик действует 15 минут; связи для ответов хранятся до 30 дней. Telegram хранит сообщения по своим правилам.\n\n/cancel удаляет локальный черновик. По вопросам об уже отправленных сообщениях: " + CONTACT)

    def handle(self, update):
        callback = update.get("callback_query")
        message = callback.get("message", {}) if callback else update.get("message", {})
        chat = message.get("chat", {})
        sender = callback.get("from", {}) if callback else message.get("from", {})
        if chat.get("type") != "private" or sender.get("is_bot") or sender.get("id") != chat.get("id"):
            return
        chat_id = chat["id"]
        now = int(self.clock())
        if callback:
            self.api.call("answerCallbackQuery", callback_query_id=callback["id"])
            if not self.owner_id:
                self.send(chat_id, "Бот пока настраивается. Связаться с Алексеем: " + CONTACT)
                return
            self.callback(chat_id, sender, callback.get("data", ""), now)
            return
        text = message.get("text", "")
        command = text.split()[0].split("@")[0] if isinstance(text, str) and text.startswith("/") else ""
        if command == "/id":
            self.send(chat_id, f"Ваш Telegram ID: {chat_id}")
            return
        if command == "/privacy":
            self.privacy(chat_id)
            return
        if command == "/cancel":
            self.store.cancel(self.key, chat_id)
            self.send(chat_id, "Черновик удалён. Для нового обращения: /start")
            return
        if not self.owner_id:
            self.send(chat_id, "Бот пока настраивается. Для настройки владельцем: /id\nСвязь с Алексеем: " + CONTACT)
            return
        if chat_id == self.owner_id:
            self.owner_message(message, now, command)
            return
        if command in ("/start", "/help") or command:
            self.menu(chat_id)
            return
        category = self.store.selected_topic(self.key, chat_id, now)
        if not category:
            self.menu(chat_id)
            return
        if not accepted_message(message):
            self.send(chat_id, "Пришлите одно текстовое сообщение, фото или файл PNG, JPG, WebP, PDF, TXT до 10 МБ. Для отмены: /cancel")
            return
        key = self.store.draft(self.key, chat_id, message["message_id"], category, now)
        self.send(chat_id, "Готово к отправке.\nТема: " + TOPICS[self.key][category] + "\nПолучатель: Алексей (@akaAlexey).\n\nОтправится ваше последнее сообщение с именем и публичным ником Telegram. Можно отправить, написать новое вместо него или отменить.",
                  [[{"text": "Отправить", "callback_data": "send:" + key},
                    {"text": "Отменить", "callback_data": "cancel:" + key}]])

    def callback(self, chat, sender, data, now):
        if data.startswith("topic:"):
            topic = data[6:]
            if topic not in TOPICS[self.key]:
                return
            self.store.topic(self.key, chat, topic, now)
            hint = "\nДля ошибки укажите действия, ожидаемый результат и что произошло." if topic == "bug" else ""
            self.send(chat, "Тема: " + TOPICS[self.key][topic] + "\n\nНапишите обращение одним сообщением. Можно приложить одно фото или документ." + hint)
            return
        match = re.fullmatch(r"(send|cancel):([a-f0-9]{16})", data)
        if not match:
            return
        action, key = match.groups()
        if action == "cancel":
            # A cancel button must belong to the sender, just like a send button.
            with self.store.db() as db:
                owned = db.execute("SELECT id FROM drafts WHERE bot=? AND id=? AND chat=? AND status='draft'",
                                   (self.key, key, chat)).fetchone()
            if owned:
                self.store.cancel(self.key, chat)
                self.send(chat, "Черновик удалён. /start — новое обращение.")
            return
        status, draft = self.store.claim(self.key, key, chat, now)
        if status != "claimed":
            messages = {
                "sent": "Это обращение уже отправлено.",
                "sending": "Отправка уже начата. Повторно обращение не отправляется.",
                "uncertain": "Результат прошлой отправки не подтверждён. Свяжитесь напрямую: " + CONTACT,
                "expired": "Черновик больше недоступен. Создайте новое обращение: /start",
                "limit": "Сейчас достигнут лимит: пять обращений в час. Позже можно отправить снова или написать напрямую: " + CONTACT,
                "cooldown": "Между обращениями нужно подождать 15 секунд.",
            }
            self.send(chat, messages.get(status, messages["expired"]))
            return
        name = clean_name(sender.get("first_name", "Посетитель"))
        username = sender.get("username", "")
        username = " @" + username if re.fullmatch(r"[A-Za-z0-9_]{1,32}", username) else ""
        heading = f"Обращение #{key}\n{TOPICS[self.key][draft['category']]}\nОт: {name}{username}\n\nОтветьте на это сообщение или вложение, чтобы ответ пришёл посетителю."
        try:
            header = self.send(self.owner_id, heading)
            self.store.route(self.key, header["message_id"], chat, now)
            copied = self.api.call("copyMessage", chat_id=self.owner_id, from_chat_id=chat, message_id=draft["source"])
            self.store.route(self.key, copied["message_id"], chat, now)
        except TelegramError:
            self.store.finish(self.key, key, "uncertain")
            self.send(chat, "Не удалось подтвердить доставку. Повторно автоматически не отправляем. Связаться напрямую: " + CONTACT)
            return
        self.store.finish(self.key, key, "sent")
        self.send(chat, f"Обращение #{key} отправлено Алексею. Ответ придёт сюда.")

    def owner_message(self, message, now, command):
        if command in ("/start", "/help"):
            self.send(self.owner_id, "Это входящие обращения. Для ответа используйте «Ответить» на уведомление или скопированное сообщение посетителя.\n/id — ваш ID. /privacy — сведения о данных.")
            return
        reply_id = message.get("reply_to_message", {}).get("message_id")
        recipient = self.store.recipient(self.key, reply_id, now) if reply_id else None
        if not recipient:
            self.send(self.owner_id, "Для ответа выберите конкретное обращение и нажмите «Ответить». Адресат не выбран.")
            return
        if not accepted_message(message):
            self.send(self.owner_id, "Поддерживаются текст, фото и документы PNG, JPG, WebP, PDF, TXT до 10 МБ.")
            return
        if not self.store.claim_reply(self.key, message["message_id"], now):
            return
        try:
            self.api.call("copyMessage", chat_id=recipient, from_chat_id=self.owner_id, message_id=message["message_id"])
        except TelegramError:
            self.send(self.owner_id, "Доставка ответа не подтверждена. Автоматически повторно ответ не отправляется.")
            return
        self.send(self.owner_id, "Ответ отправлен.")


def configuration(env):
    tokens = {key: env.get(name, "").strip() for key, name in
              (("personal", "PERSONAL_BOT_TOKEN"), ("agl", "AGL_BOT_TOKEN"))}
    for key, token in tokens.items():
        if not re.fullmatch(r"[0-9]{5,20}:[A-Za-z0-9_-]{20,160}", token):
            raise ValueError(f"Set a valid token for {key}; values are never printed.")
    if tokens["personal"] == tokens["agl"]:
        raise ValueError("The two bots must use different tokens.")
    try:
        owner = int(env.get("OWNER_CHAT_ID", "0"))
    except ValueError:
        raise ValueError("OWNER_CHAT_ID must be a positive private-chat ID, or 0 for setup.") from None
    if owner < 0 or owner >= 2**52:
        raise ValueError("OWNER_CHAT_ID must be a positive private-chat ID, or 0 for setup.")
    return tokens, owner, Path(env.get("BOT_DATA_DIR", "./data"))


def read_environment(path):
    values = dict(os.environ)
    if path:
        allowed = {"PERSONAL_BOT_TOKEN", "AGL_BOT_TOKEN", "OWNER_CHAT_ID", "BOT_DATA_DIR"}
        for number, raw in enumerate(Path(path).read_text().splitlines(), 1):
            line = raw.strip()
            if not line or line.startswith("#"):
                continue
            key, separator, value = line.partition("=")
            key, value = key.strip(), value.strip()
            if not separator or key not in allowed:
                raise ValueError(f"Invalid environment file entry on line {number}.")
            if len(value) >= 2 and value[0] == value[-1] and value[0] in ("'", '"'):
                value = value[1:-1]
            values[key] = value
    return values


def worker(key, api, store, owner, stop):
    bot = Bot(key, api, store, owner)
    delay = 1
    while not stop.is_set():
        store.cleanup(int(time.time()))
        try:
            for update in api.call("getUpdates", offset=store.offset(key), timeout=25,
                                   limit=20, allowed_updates=["message", "callback_query"]):
                if stop.is_set():
                    break
                update_id = update.get("update_id")
                if not isinstance(update_id, int) or update_id < store.offset(key):
                    continue
                try:
                    bot.handle(update)
                except TelegramError as error:
                    LOG.warning("%s operation=%s code=%s", key, error.method, error.code)
                except (ValueError, TypeError, KeyError):
                    LOG.warning("%s invalid update ignored", key)
                store.acknowledge(key, update_id + 1)
            delay = 1
        except TelegramError as error:
            LOG.warning("%s polling code=%s", key, error.code)
            stop.wait(max(delay, error.retry_after))
            delay = min(delay * 2, 30)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Validate environment offline; do not contact Telegram.")
    parser.add_argument("--env-file", help="Optional environment file path; values are read without shell evaluation.")
    args = parser.parse_args()
    try:
        tokens, owner, data = configuration(read_environment(args.env_file))
    except (ValueError, OSError) as error:
        if isinstance(error, OSError):
            parser.exit(2, "Unable to read the environment file.\n")
        parser.exit(2, str(error) + "\n")
    if args.check:
        print(json.dumps({"bots": list(tokens), "mode": "ready" if owner else "setup", "data_directory": str(data)}))
        return
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    os.umask(0o077)
    data.mkdir(parents=True, exist_ok=True)
    with (data / "service.lock").open("a") as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            parser.exit(2, "A service is already using this data directory.\n")
        apis = {key: Telegram(token) for key, token in tokens.items()}
        identities = []
        try:
            for api in apis.values():
                identities.append(api.call("getMe")["id"])
                if api.call("getWebhookInfo").get("url"):
                    parser.exit(2, "A webhook is active. Review it before switching this bot to polling.\n")
        except TelegramError as error:
            parser.exit(2, str(error) + "\n")
        if len(set(identities)) != 2:
            parser.exit(2, "Configure two distinct bots.\n")
        store = Store(data / "state.sqlite3")
        stop = threading.Event()
        for sig in (signal.SIGINT, signal.SIGTERM):
            signal.signal(sig, lambda *_: stop.set())
        threads = [threading.Thread(target=worker, args=(key, api, store, owner, stop),
                                    name=key, daemon=True) for key, api in apis.items()]
        for thread in threads:
            thread.start()
        LOG.info("Service started: bots=2 mode=%s", "ready" if owner else "setup")
        failed = False
        while not stop.wait(1):
            if not all(thread.is_alive() for thread in threads):
                LOG.error("A worker stopped; restarting the service is required.")
                failed = True
                stop.set()
                break
        for thread in threads:
            thread.join(40)
        if failed or any(thread.is_alive() for thread in threads):
            raise SystemExit(1)


if __name__ == "__main__":
    main()

