"""Kiểm tra tĩnh SQL cho T24: client không được truy cập trực tiếp exam_sessions (không cần DB thật)."""
import re
import unittest
from pathlib import Path

SQL_DIR = Path(__file__).resolve().parent.parent / "sql"


def _read(name: str) -> str:
    return (SQL_DIR / name).read_text(encoding="utf-8")


def _strip_comments(sql: str) -> str:
    return "\n".join(line.split("--", 1)[0] for line in sql.splitlines())


class ExamSessionsRlsMigrationTest(unittest.TestCase):
    def setUp(self):
        self.raw = _read("migration_v13.sql")
        self.sql = _strip_comments(self.raw)

    def test_revokes_client_roles(self):
        self.assertRegex(self.sql, r"REVOKE\s+ALL\s+ON\s+TABLE\s+public\.exam_sessions\s+FROM\s+anon,\s*authenticated")

    def test_rls_stays_enabled(self):
        self.assertIn("ALTER TABLE public.exam_sessions ENABLE ROW LEVEL SECURITY", self.sql)

    def test_drops_owner_policy_idempotently(self):
        self.assertIn('DROP POLICY IF EXISTS "Owner access" ON public.exam_sessions', self.sql)
        self.assertNotIn("CREATE POLICY", self.sql.upper())

    def test_no_client_write_grants(self):
        for stmt in re.findall(r"GRANT\s+[^;]+;", self.sql, flags=re.I):
            if re.match(r"GRANT", stmt, re.I):
                self.assertIn("service_role", stmt)
                self.assertNotRegex(stmt, r"\b(anon|authenticated)\b")

    def test_service_role_keeps_access(self):
        self.assertRegex(self.sql, r"GRANT\s+ALL\s+ON\s+TABLE\s+public\.exam_sessions\s+TO\s+service_role")

    def test_does_not_touch_other_tables(self):
        tables = set(re.findall(r"public\.(\w+)", self.sql))
        self.assertEqual(tables, {"exam_sessions"})


class SetupAllConsistencyTest(unittest.TestCase):
    def test_setup_all_revokes_after_owner_policy(self):
        sql = _strip_comments(_read("setup_all.sql"))
        self.assertRegex(sql, r"REVOKE\s+ALL\s+ON\s+TABLE\s+public\.exam_sessions\s+FROM\s+anon,\s*authenticated")
        # Bản REVOKE phải nằm SAU vòng lặp tạo policy "Owner access" của v4
        self.assertGreater(sql.rfind("REVOKE ALL ON TABLE public.exam_sessions"), sql.find('CREATE POLICY "Owner access" ON public.%I'))


if __name__ == "__main__":
    unittest.main()
