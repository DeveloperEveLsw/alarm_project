# Alarm Table Schema Decision / 알람 테이블 스키마 결정

## EN
The SQLite `Alarm` table will use the following columns:
- `id` TEXT PRIMARY KEY — UUID v4 shared with the native engine.
- `alarm_set_id` TEXT NULL — optional FK referencing `AlarmSet(id)`; `ON DELETE SET NULL`.
- `label` TEXT NOT NULL DEFAULT '' — display name.
- `hour` INTEGER NOT NULL — 0–23.
- `minute` INTEGER NOT NULL — 0–59.
- `repeat_days` TEXT NOT NULL DEFAULT '[]' — JSON-encoded weekday indices.
- `skip_holidays` INTEGER NOT NULL DEFAULT 0 — treated as boolean.
- `sound` TEXT NOT NULL DEFAULT '' — ringtone identifier.
- `vibrate` INTEGER NOT NULL DEFAULT 1 — treated as boolean.
- `enabled` INTEGER NOT NULL DEFAULT 1 — whether the alarm should be scheduled.
- `policy_mode` TEXT NOT NULL DEFAULT 'normal' — matches `policy.mode` in the native contract.
- `policy_payload` TEXT NULL — JSON for optional policy properties (snooze minutes, location requirements, etc.).

We will recompute future fire times on demand using `computeNextTrigger`, so `next_trigger_at` is omitted for now; it can be added later if persistence of the next fire timestamp becomes necessary.

## KO
SQLite `Alarm` 테이블은 아래와 같은 컬럼을 사용한다.
- `id` TEXT PRIMARY KEY — 네이티브 엔진과 공유하는 UUID v4.
- `alarm_set_id` TEXT NULL — `AlarmSet(id)`를 참조하는 선택적 FK (`ON DELETE SET NULL`).
- `label` TEXT NOT NULL DEFAULT '' — UI용 이름.
- `hour` INTEGER NOT NULL — 0~23.
- `minute` INTEGER NOT NULL — 0~59.
- `repeat_days` TEXT NOT NULL DEFAULT '[]' — 요일 인덱스를 JSON으로 저장.
- `skip_holidays` INTEGER NOT NULL DEFAULT 0 — 불리언 값으로 사용.
- `sound` TEXT NOT NULL DEFAULT '' — 알람음 식별자.
- `vibrate` INTEGER NOT NULL DEFAULT 1 — 진동 여부.
- `enabled` INTEGER NOT NULL DEFAULT 1 — 예약 활성화 여부.
- `policy_mode` TEXT NOT NULL DEFAULT 'normal' — 네이티브 계약의 `policy.mode`와 동일.
- `policy_payload` TEXT NULL — 스누즈 분, 위치 요구사항 등 선택적 정책 값을 JSON으로 보관.

향후 울릴 시각은 필요할 때 `computeNextTrigger`로 재계산할 예정이므로, 현재는 `next_trigger_at` 컬럼을 두지 않는다. 필요해지면 추후 마이그레이션으로 추가한다.
