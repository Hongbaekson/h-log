"""Linux host-only, best-effort one-shot state. No DB, Docker API, or pip dependency."""
import argparse
from contextlib import contextmanager
import fcntl
import json
import math
import os
from pathlib import Path
import re
import stat
import subprocess
import sys
import tempfile
import time
import uuid

RESULTS = {"running", "succeeded", "failed", "skipped", "budget_blocked", "interrupted", "unverified"}
STAGES = {"preflight", "generation", "worker", "verification", "complete", "interrupted", "unknown"}
TASKS = ("autopublish", "backup", "restore")


def read_json(path):
    descriptor = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    with os.fdopen(descriptor, "rb") as stream:
        if not stat.S_ISREG(os.fstat(stream.fileno()).st_mode):
            raise ValueError("not a regular state file")
        data = stream.read(32769)
    if len(data) > 32768:
        raise ValueError("oversized state")
    value = json.loads(data)
    if not isinstance(value, dict) or value.get("schema_version") != 1:
        raise ValueError("invalid state")
    return value


def atomic_write(path, value):
    data = json.dumps(value, allow_nan=False, separators=(",", ":")).encode()
    if len(data) > 32768:
        raise ValueError("oversized state")
    descriptor, temporary = tempfile.mkstemp(dir=path.parent, suffix=".tmp")
    try:
        with os.fdopen(descriptor, "wb") as stream:
            os.fchmod(stream.fileno(), 0o640)
            stream.write(data)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
        directory = os.open(path.parent, os.O_RDONLY | os.O_DIRECTORY)
        try:
            os.fsync(directory)
        finally:
            os.close(directory)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


@contextmanager
def locked(root, task="autopublish"):
    if task not in TASKS:
        raise ValueError("invalid task")
    root.mkdir(mode=0o750, exist_ok=True)
    descriptor = os.open(root / f"{task}.lock", os.O_CREAT | os.O_RDWR | os.O_NOFOLLOW, 0o640)
    try:
        fcntl.flock(descriptor, fcntl.LOCK_EX | fcntl.LOCK_NB)
        yield
    finally:
        os.close(descriptor)


def valid_number(value):
    return type(value) in (int, float) and math.isfinite(value) and value >= 0


def scheduled_slot(root, now):
    value = read_json(root / "expectations.json")["autopublish"]
    enabled, start, until = value["enabled_at"], value["maintenance_from"], value["maintenance_until"]
    if type(value["enabled"]) is not bool or not all(valid_number(n) for n in (enabled, start, until)) or enabled > now + 60 or until < start or until - start > 86400 or (start == 0 and until != 0):
        raise ValueError("invalid expectation")
    if not value["enabled"]:
        return 0
    if enabled == 0:
        raise ValueError("invalid activation")
    slot = max(math.ceil(enabled / 86400) * 86400, math.floor(now / 86400) * 86400)
    if now >= start > 0 and start <= slot <= until:
        slot = (math.floor(until / 86400) + 1) * 86400
    return slot if slot <= now else 0


def start(root, invocation, mode, now, task="autopublish"):
    if not re.fullmatch("[a-f0-9]{32}", invocation) or mode not in ("scheduled", "manual"):
        raise ValueError("invalid invocation")
    keys = ("last_success_at", "last_success_slot", "last_budget_block_at") if task == "autopublish" else ("last_success_at",)
    with locked(root, task):
        try:
            previous = read_json(root / f"{task}.json")
            if previous["invocation_id"] == invocation:
                return
            if previous["started_at"] >= now or previous["result"] not in RESULTS or not all(valid_number(previous[k]) and previous[k] <= now for k in keys):
                raise ValueError("invalid previous state")
        except FileNotFoundError:
            previous = {k: 0 for k in keys}
        evidence = root / "evidence"
        if not evidence.exists():
            evidence.mkdir(mode=0o2770)
            evidence.chmod(0o2770)
        slot = 0
        if mode == "scheduled" and task == "autopublish":
            try:
                slot = scheduled_slot(root, now)
            except (OSError, ValueError, KeyError, TypeError):
                # The independently collected expectation remains missing/invalid.
                # Even without it, record that preflight was attempted.
                pass
        atomic_write(root / f"{task}.json", {"schema_version": 1, "task": task, "invocation_id": invocation, "mode": mode,
                     "started_at": now, "completed_at": 0, "result": "running", "stage": "preflight",
                     "slot": slot,
                     **{k: previous[k] for k in keys}})


def finish(root, invocation, service_result, now, task="autopublish"):
    with locked(root, task):
        value = read_json(root / f"{task}.json")
        # A delayed or duplicate stop must not overwrite a newer invocation/result.
        if value["invocation_id"] != invocation or value["completed_at"] > 0:
            return
        if now < value["started_at"]:
            raise ValueError("clock moved backwards")
        evidence = None
        try:
            candidate = read_json(root / "evidence" / f"{task}.json")
            if candidate.get("invocation_id") == invocation and candidate.get("result") in RESULTS and candidate.get("stage") in STAGES and valid_number(candidate.get("checked_at")) and value["started_at"] <= candidate["checked_at"] <= now:
                evidence = candidate
        except (OSError, ValueError, KeyError):
            pass
        stage = evidence["stage"] if evidence else "preflight"
        if service_result in ("signal", "timeout", "core-dump", "watchdog", "oom-kill"):
            result, stage = "interrupted", "interrupted"
        elif service_result != "success":
            result = "failed"
        elif not evidence or evidence["result"] == "running":
            result, stage = "unverified", "verification"
        else:
            result = evidence["result"]
            if result == "succeeded":
                if evidence.get("verified") is not True:
                    result, stage = "unverified", "verification"
                else:
                    value["last_success_at"] = evidence["checked_at"]
                    if task == "autopublish" and value["mode"] == "scheduled" and value["slot"] > 0:
                        value["last_success_slot"] = value["slot"]
            if task == "autopublish" and result == "budget_blocked":
                value["last_budget_block_at"] = evidence["checked_at"]
        value.update(completed_at=now, result=result, stage=stage)
        atomic_write(root / f"{task}.json", value)


def best_effort(operation, *args):
    try:
        operation(*args)
    except Exception:
        print("monitoring state write failed", file=sys.stderr)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--directory", type=Path, default=Path("/var/lib/hlog-observability"))
    parser.add_argument("--task", choices=TASKS, default="autopublish")
    parser.add_argument("action", choices=("start", "finish", "run"))
    parser.add_argument("command", nargs=argparse.REMAINDER)
    args = parser.parse_args()
    invocation = os.environ.get("INVOCATION_ID", "")
    if args.action == "start":
        best_effort(start, args.directory, invocation, "scheduled", time.time(), args.task)
    elif args.action == "finish":
        result = os.environ.get("SERVICE_RESULT", "unknown")
        if result == "success" and (os.environ.get("EXIT_CODE") != "exited" or os.environ.get("EXIT_STATUS") != "0"):
            result = "unknown"
        best_effort(finish, args.directory, invocation, result, time.time(), args.task)
    else:
        command = args.command[1:] if args.command[:1] == ["--"] else args.command
        if not command:
            parser.error("run requires a command after --")
        invocation = uuid.uuid4().hex
        best_effort(start, args.directory, invocation, "manual", time.time(), args.task)
        environment = {**os.environ, "HLOG_OBSERVABILITY_INVOCATION_ID": invocation, "HLOG_OBSERVABILITY_TASK": args.task,
                       "HLOG_OBSERVABILITY_EVIDENCE_DIR": str(args.directory / "evidence")}
        try:
            result = subprocess.run(command, env=environment, check=False).returncode
        except OSError:
            result = 127
        best_effort(finish, args.directory, invocation, "success" if result == 0 else "signal" if result < 0 else "exit-code", time.time(), args.task)
        return result if result >= 0 else 128 - result
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
