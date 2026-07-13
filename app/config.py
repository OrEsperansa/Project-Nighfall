from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    student_id: str
    username: str
    password: str
    token_secret: str
    token_ttl_seconds: int
    dataset_seed: str
    computer_generation_interval_seconds: int
    generated_computer_count: int
    root_path: str


def load_settings() -> Settings:
    return Settings(
        student_id=os.getenv("STUDENT_ID", "local-student"),
        username=os.getenv("NIGHTFALL_USERNAME", "sigitattacker"),
        password=os.getenv("NIGHTFALL_PASSWORD", "LamaLoKapara"),
        token_secret=os.getenv("TOKEN_SECRET", "local-development-secret-change-me"),
        token_ttl_seconds=int(os.getenv("TOKEN_TTL_SECONDS", "3600")),
        dataset_seed=os.getenv("DATASET_SEED", "nightfall-classroom-seed-v1"),
        computer_generation_interval_seconds=int(
            os.getenv("COMPUTER_GENERATION_INTERVAL_SECONDS", "600")
        ),
        generated_computer_count=int(os.getenv("GENERATED_COMPUTER_COUNT", "6")),
        root_path=os.getenv("ROOT_PATH", ""),
    )
