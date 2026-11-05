import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import urllib.error

from bot import Bot, Telegram, TelegramError, accepted_message, configuration, worker
from storage import DRAFT_TTL, ROUTE_TTL, Store

OWNER, VISITOR = 9000, 2000


class FakeTelegram:
    def __init__(self):
        self.calls = []
        self.next_id = 100
        self.fail_copy = False

    def call(self, method, **data):
        self.calls.append((method, data))
        if method == "answerCallbackQuery":
            return True
        if method == "copyMessage" and self.fail_copy:
            raise TelegramError(method)
        self.next_id += 1
        return {"message_id": self.next_id}

    def target_calls(self, method, chat):
        return [data for name, data in self.calls if name == method and data.get("chat_id") == chat]


class BotTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.store = Store(Path(self.temp.name) / "state.sqlite3")
        self.api = FakeTelegram()
        self.now = 10000
        self.bot = Bot("personal", self.api, self.store, OWNER, lambda: self.now)
        self.message_id = 10

    def tearDown(self):
        self.temp.cleanup()

    def message(self, text=None, chat=VISITOR, **extra):
        self.message_id += 1
        message = {"message_id": self.message_id, "chat": {"id": chat, "type": "private"},
                   "from": {"id": chat, "first_name": "Посетитель", "username": "visitor_name"}}
        if text is not None:
            message["text"] = text
        message.update(extra)
        self.bot.handle({"message": message})
        return message

    def callback(self, data, chat=VISITOR):
        self.bot.handle({"callback_query": {"id": "callback", "data": data,
                                           "from": {"id": chat, "first_name": "Посетитель"},
                                           "message": {"message_id": 50, "chat": {"id": chat, "type": "private"}}}})

    def draft(self):
        self.callback("topic:work")
        self.message("Хочу обсудить проект")
        return self.api.calls[-1][1]["reply_markup"]["inline_keyboard"][0][0]["callback_data"]

    def test_message_requires_confirmation_and_duplicate_confirmation_is_safe(self):
        send = self.draft()
        self.assertEqual([], self.api.target_calls("copyMessage", OWNER))
        self.callback(send)
        self.callback(send)
        self.assertEqual(1, len(self.api.target_calls("copyMessage", OWNER)))
        self.assertEqual(1, len(self.api.target_calls("sendMessage", OWNER)))

    def test_foreign_user_cannot_send_someone_elses_draft(self):
        send = self.draft()
        self.callback(send, chat=3000)
        self.assertEqual([], self.api.target_calls("copyMessage", OWNER))
        self.callback(send)
        self.assertEqual(1, len(self.api.target_calls("copyMessage", OWNER)))

    def test_expired_draft_is_not_forwarded(self):
        send = self.draft()
        self.now += DRAFT_TTL + 1
        self.callback(send)
        self.assertEqual([], self.api.target_calls("copyMessage", OWNER))

    def test_cancelled_draft_is_not_forwarded(self):
        send = self.draft()
        self.message("/cancel")
        self.callback(send)
        self.assertEqual([], self.api.target_calls("copyMessage", OWNER))

    def test_owner_reply_routes_only_to_the_original_visitor_and_is_deduplicated(self):
        self.callback(self.draft())
        header_id = next(message for message in range(100, self.api.next_id + 1)
                         if self.store.recipient("personal", message, self.now) == VISITOR)
        original = self.message("Спасибо за предложение", chat=OWNER,
                                reply_to_message={"message_id": header_id})
        self.bot.handle({"message": original})
        replies = self.api.target_calls("copyMessage", VISITOR)
        self.assertEqual(1, len(replies))
        self.assertEqual(OWNER, replies[0]["from_chat_id"])
        self.message("Это не ответ на обращение", chat=OWNER)
        self.assertEqual(1, len(self.api.target_calls("copyMessage", VISITOR)))

    def test_unknown_delivery_is_not_retried_automatically(self):
        send = self.draft()
        self.api.fail_copy = True
        self.callback(send)
        self.callback(send)
        self.assertEqual(1, len(self.api.target_calls("copyMessage", OWNER)))
        self.assertIn("не подтверждён", self.api.calls[-1][1]["text"])

    def test_hourly_limit_is_enforced(self):
        for _ in range(5):
            self.callback(self.draft())
            self.now += 20
        self.callback(self.draft())
        self.assertEqual(5, len(self.api.target_calls("copyMessage", OWNER)))
        self.assertIn("лимит", self.api.calls[-1][1]["text"])

    def test_private_chat_only_and_unknown_topics_are_ignored(self):
        self.bot.handle({"message": {"message_id": 1, "chat": {"id": -4, "type": "group"},
                                     "from": {"id": VISITOR}, "text": "/start"}})
        self.assertEqual([], self.api.calls)
        self.callback("topic:not-a-real-topic")
        self.assertIsNone(self.store.selected_topic("personal", VISITOR, self.now))

    def test_setup_mode_does_not_collect_or_forward_messages(self):
        self.bot.owner_id = 0
        self.message("Пока нет настроенного получателя")
        self.assertIsNone(self.store.selected_topic("personal", VISITOR, self.now))
        self.assertEqual([], self.api.target_calls("copyMessage", OWNER))
        self.message("/id")
        self.assertIn(str(VISITOR), self.api.calls[-1][1]["text"])

    def test_metadata_is_isolated_by_bot_and_expires(self):
        self.store.topic("personal", VISITOR, "work", self.now)
        self.store.route("personal", 101, VISITOR, self.now)
        self.assertIsNone(self.store.selected_topic("agl", VISITOR, self.now))
        self.assertIsNone(self.store.recipient("agl", 101, self.now))
        self.store.acknowledge("personal", 22)
        self.store.acknowledge("personal", 10)
        self.store.cleanup(self.now + ROUTE_TTL + 1)
        self.assertIsNone(self.store.recipient("personal", 101, self.now + ROUTE_TTL + 1))
        self.assertEqual(22, self.store.offset("personal"))
        with self.store.db() as db:
            columns = {row[1] for row in db.execute("PRAGMA table_info(drafts)")}
        self.assertNotIn("text", columns)
        self.assertNotIn("content", columns)

    def test_unsupported_or_oversized_files_are_rejected(self):
        self.assertFalse(accepted_message({"document": {"file_name": "install.exe", "file_size": 100}}))
        self.assertFalse(accepted_message({"document": {"file_name": "large.pdf", "file_size": 11 * 1024 * 1024}}))
        self.assertTrue(accepted_message({"document": {"file_name": "brief.pdf", "file_size": 100}}))


class ConfigurationTests(unittest.TestCase):
    def environment(self):
        return {"PERSONAL_BOT_TOKEN": "111111:" + "A" * 32,
                "AGL_BOT_TOKEN": "222222:" + "B" * 32,
                "OWNER_CHAT_ID": "9000"}

    def test_configuration_rejects_duplicate_tokens_and_group_owner(self):
        env = self.environment()
        env["OWNER_CHAT_ID"] = "-123"
        with self.assertRaises(ValueError):
            configuration(env)
        env = self.environment()
        env["AGL_BOT_TOKEN"] = env["PERSONAL_BOT_TOKEN"]
        with self.assertRaises(ValueError):
            configuration(env)

    def test_error_messages_never_include_the_token(self):
        token = "111111:" + "A" * 32
        api = Telegram(token)
        with patch("urllib.request.urlopen", side_effect=urllib.error.URLError(token)):
            with self.assertRaises(TelegramError) as ctx:
                api.call("getMe")
        self.assertNotIn(token, str(ctx.exception))
        env = self.environment()
        env["PERSONAL_BOT_TOKEN"] = "private-invalid-value"
        with self.assertRaises(ValueError) as ctx:
            configuration(env)
        self.assertNotIn("private-invalid-value", str(ctx.exception))


class RuntimeTests(unittest.TestCase):
    def test_environment_file_is_data_not_shell_code(self):
        from bot import read_environment
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "service.env"
            path.write_text("PERSONAL_BOT_TOKEN=$(do-not-execute)\nOWNER_CHAT_ID=123\n")
            values = read_environment(path)
            self.assertEqual("$(do-not-execute)", values["PERSONAL_BOT_TOKEN"])
            self.assertEqual("123", values["OWNER_CHAT_ID"])
            path.write_text("UNEXPECTED_SETTING=value\n")
            with self.assertRaises(ValueError):
                read_environment(path)

    def test_worker_failure_causes_nonzero_service_exit(self):
        from bot import main
        class StoppedThread:
            def __init__(self, **kwargs): pass
            def start(self): pass
            def is_alive(self): return False
            def join(self, timeout): pass
        class Stop:
            def __init__(self): self.stopped = False
            def wait(self, timeout): return self.stopped
            def set(self): self.stopped = True
        class Probe:
            def __init__(self, identity): self.identity = identity
            def call(self, method, **params):
                return {"id": self.identity} if method == "getMe" else {"url": ""}
        with tempfile.TemporaryDirectory() as folder:
            env = ConfigurationTests().environment()
            env["BOT_DATA_DIR"] = folder
            with patch.dict("os.environ", env, clear=True), \
                 patch("sys.argv", ["bot.py"]), \
                 patch("bot.Telegram", side_effect=[Probe(1), Probe(2)]), \
                 patch("bot.threading.Thread", StoppedThread), \
                 patch("bot.threading.Event", Stop), \
                 patch("bot.signal.signal"):
                with self.assertRaises(SystemExit) as error:
                    main()
            self.assertEqual(1, error.exception.code)

if __name__ == "__main__":
    unittest.main()

