import importlib.util
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import tempfile
import time
import unittest
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location("state", Path(__file__).with_name("observability-state.py"))
state = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(state)


class StateTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.now = 1793145600  # 09:00 KST
        state.atomic_write(self.root / "expectations.json", {"schema_version": 1, "autopublish": {"enabled": True, "enabled_at": self.now - 60, "maintenance_from": 0, "maintenance_until": 0}})

    def tearDown(self):
        self.tmp.cleanup()

    def summary(self):
        return state.read_json(self.root / "autopublish.json")

    def evidence(self, invocation, result="succeeded", verified=True, checked=None):
        state.atomic_write(self.root / "evidence" / "autopublish.json", {"schema_version": 1, "invocation_id": invocation, "result": result, "stage": "complete", "verified": verified, "checked_at": checked or self.now + 10})

    def test_proof_preflight_duplicate_and_late_finish(self):
        a, b = "a" * 32, "b" * 32
        state.start(self.root, a, "scheduled", self.now)
        state.finish(self.root, a, "exit-code", self.now + 5)
        self.assertEqual(self.summary()["result"], "failed")
        self.assertEqual(self.summary()["stage"], "preflight")
        state.start(self.root, b, "scheduled", self.now + 6)
        state.finish(self.root, a, "success", self.now + 7)
        self.assertEqual(self.summary()["invocation_id"], b)
        self.evidence(b)
        state.finish(self.root, b, "success", self.now + 12)
        self.assertEqual(self.summary()["last_success_at"], self.now + 10)
        self.assertEqual(self.summary()["last_success_slot"], self.now)
        state.finish(self.root, b, "signal", self.now + 13)
        self.assertEqual(self.summary()["result"], "succeeded")
        state.start(self.root, a, "manual", self.now + 20)
        self.evidence(a, "skipped", False, self.now + 25)
        state.finish(self.root, a, "success", self.now + 26)
        self.assertEqual(self.summary()["last_success_at"], self.now + 10)
        self.assertEqual(self.summary()["last_success_slot"], self.now)

    def test_zero_exit_without_proof_and_manual_success_do_not_fill_slot(self):
        a = "a" * 32
        state.start(self.root, a, "manual", self.now)
        state.finish(self.root, a, "success", self.now + 1)
        self.assertEqual(self.summary()["result"], "unverified")
        self.assertEqual(self.summary()["last_success_at"], 0)
        b = "b" * 32
        state.start(self.root, b, "manual", self.now + 2)
        self.evidence(b)
        state.finish(self.root, b, "success", self.now + 12)
        self.assertEqual(self.summary()["last_success_slot"], 0)

    def test_atomic_failure_and_invalid_files_preserve_previous_state(self):
        state.start(self.root, "a" * 32, "scheduled", self.now)
        original = (self.root / "autopublish.json").read_bytes()
        with patch.object(state.os, "replace", side_effect=OSError("SECRET")):
            with self.assertRaises(OSError):
                state.atomic_write(self.root / "autopublish.json", {"bad": True})
        self.assertEqual((self.root / "autopublish.json").read_bytes(), original)
        self.assertEqual(list(self.root.glob("*.tmp")), [])
        self.assertEqual((self.root / "autopublish.json").stat().st_mode & 0o777, 0o640)
        (self.root / "bad.json").write_bytes(b"x" * 32769)
        with self.assertRaises(ValueError):
            state.read_json(self.root / "bad.json")

    def test_kill_leaves_running_and_observer_failure_keeps_command_exit(self):
        command = [sys.executable, str(Path(__file__).with_name("observability-state.py")), "--directory", str(self.root), "run", "--", sys.executable, "-c"]
        child = subprocess.Popen(command + ["import time; time.sleep(30)"], start_new_session=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        try:
            for _ in range(100):
                if (self.root / "autopublish.json").exists():
                    break
                time.sleep(0.02)
            os.killpg(child.pid, signal.SIGKILL)
            child.wait(timeout=5)
            self.assertEqual(self.summary()["result"], "running")
        finally:
            if child.poll() is None:
                os.killpg(child.pid, signal.SIGKILL)
        self.root.chmod(0o500)
        try:
            result = subprocess.run(command + ["raise SystemExit(17)"], capture_output=True, text=True)
            self.assertEqual(result.returncode, 17)
            self.assertNotIn("SECRET", result.stderr)
        finally:
            self.root.chmod(0o700)

    def test_pipe_is_rejected_without_waiting_for_a_writer(self):
        pipe = self.root / "pipe"
        os.mkfifo(pipe)
        source = f"import runpy; m=runpy.run_path({str(Path(__file__).with_name('observability-state.py'))!r}); m['read_json']({str(pipe)!r})"
        result = subprocess.run([sys.executable, "-c", source], timeout=2, capture_output=True)
        self.assertNotEqual(result.returncode, 0)

    def test_evidence_directory_inherits_shared_group(self):
        state.start(self.root, "a" * 32, "scheduled", self.now)
        self.assertEqual((self.root / "evidence").stat().st_mode & 0o2777, 0o2770)

    def test_missing_expectation_still_records_preflight_attempt(self):
        (self.root / "expectations.json").unlink()
        state.start(self.root, "a" * 32, "scheduled", self.now)
        self.assertEqual(self.summary()["result"], "running")
        self.assertEqual(self.summary()["slot"], 0)

    def test_clock_activation_maintenance_and_budget(self):
        self.assertEqual(state.scheduled_slot(self.root, self.now), self.now)
        state.atomic_write(self.root / "expectations.json", {"schema_version": 1, "autopublish": {"enabled": True, "enabled_at": self.now+600, "maintenance_from": 0, "maintenance_until": 0}})
        self.assertEqual(state.scheduled_slot(self.root, self.now+600), 0)
        self.assertEqual(state.scheduled_slot(self.root, self.now+86400), self.now+86400)
        state.atomic_write(self.root / "expectations.json", {"schema_version": 1, "autopublish": {"enabled": True, "enabled_at": self.now-60, "maintenance_from": self.now-30, "maintenance_until": self.now+30}})
        self.assertEqual(state.scheduled_slot(self.root, self.now+60), 0)
        self.assertEqual(state.scheduled_slot(self.root, self.now+86400), self.now+86400)
        state.start(self.root, "a" * 32, "manual", self.now)
        self.evidence("a" * 32, "budget_blocked", False)
        state.finish(self.root, "a" * 32, "success", self.now+12)
        self.assertEqual(self.summary()["last_budget_block_at"], self.now+10)
        self.assertEqual(self.summary()["last_success_at"], 0)


if __name__ == "__main__":
    unittest.main()
