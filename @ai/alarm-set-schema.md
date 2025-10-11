# Alarm Set Schema Decision / 알람셋 스키마 결정

## EN
- Each alarm set stores exactly four fields:
  - `id` (UUID v4)
  - `label` (display name)
  - `default_sound`
  - `default_mode` (default dismissal trigger / policy mode)
- No owner, sharing flags, or timestamps are needed for now.
- The set simply groups alarms in an N:1 relation (multiple alarms reference a single set by ID).

## KO
- 알람셋은 다음 네 가지 필드만 가진다.
  - `id` (UUID v4)
  - `label` (UI용 이름)
  - `default_sound`
  - `default_mode` (기본 해제 트리거/정책 모드)
- 현재는 소유자, 공유 플래그, 생성/수정 시각은 두지 않는다.
- 여러 알람이 하나의 셋을 ID로 참조하는 N:1 구조를 따른다.
