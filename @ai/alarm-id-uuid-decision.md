# Alarm ID Policy / 알람 ID 정책

## EN
- Alarm identifiers must be generated as UUID v4 strings.
- The same UUID is stored in the database and passed to the native `AlarmEngine` for scheduling/cancellation.
- Rationale: ensures stable cross-session identity and supports future backup/restore workflows.

## KO
- 모든 알람 ID는 UUID v4 문자열로 생성한다.
- 생성된 UUID를 DB에 저장하고 네이티브 `AlarmEngine`에 전달하여 예약/취소 때 동일하게 사용한다.
- 이유: 세션 간 일관성을 확보하고 차후 백업/복원 흐름을 지원하기 위함이다.
