# Alarm Module Refactor Report / 알람 모듈 리팩터링 보고

## EN
- **SQLite schema**: `AlarmSet` and `Alarm` tables now use UUID primary keys with default sound/mode fields; `Todo.alarm_id`/`alarm_set_id` columns switched to TEXT and foreign keys updated.
- **Storage layer**: Added `services/alarm/alarmStorage.ts` for DB mapping and `alarmWorkflow.ts` to orchestrate insert/update/toggle with `AlarmEngine`. IDs are generated via `services/alarm/id.ts` (UUID first, fallback random string).
- **React Query integration**: `HomeScreen` now reads alarms through `useQuery(['alarms'])` and uses mutations (`create/update/toggle`) that persist to SQLite and re-schedule via the workflow helpers. Local React state for alarms was removed.
- **Event bridge**: Introduced `AlarmQueryInvalidationListener` in `App.tsx` so native `AlarmEngine` events trigger React Query cache invalidation, keeping UI and Kotlin edits in sync.
- **SYNC event & DB write-back**: Kotlin now emits a `SYNC` alarm event (`AlarmSyncBridge`) after scheduling, cancelling, snoozing, or boot-time reschedules and updates the shared SQLite `Alarm` table via `AlarmDatabase` so JS reads stay authoritative.
- **Auto reschedule**: When an alarm is dismissed, Kotlin retries scheduling the next occurrence using `AlarmDatabase.computeNextFireAt`, so weekly/반복 알람이 네이티브만으로도 계속 이어집니다.
- **Policy metadata**: Alarm models carry `policyMode`/`policyPayload` to align with native contracts; scheduling passes the mode straight to the engine.
- **Follow-up**: None pending for this batch; TypeScript build now passes (`npx tsc --noEmit`).

## KO
- **SQLite 스키마**: `AlarmSet`, `Alarm` 테이블을 UUID 기본키와 기본 사운드/모드 필드로 재정의했고, `Todo.alarm_id`/`alarm_set_id` 컬럼을 TEXT로 변경하면서 외래키를 갱신했습니다.
- **스토리지 계층**: `services/alarm/alarmStorage.ts`로 DB 매핑을, `alarmWorkflow.ts`로 생성/수정/토글 흐름과 `AlarmEngine` 연계를 담당하게 했습니다. ID 생성은 `services/alarm/id.ts`에서 UUID 우선, 실패 시 임의 문자열을 사용합니다.
- **React Query 통합**: `HomeScreen`이 `useQuery(['alarms'])`로 알람을 로딩하고, 생성/수정/토글 시 SQLite에 반영하면서 워크플로 헬퍼로 네이티브 스케줄을 갱신하게 변경했습니다. 기존 로컬 상태는 제거되었습니다.
- **이벤트 브릿지**: `App.tsx`에 `AlarmQueryInvalidationListener`를 추가해 네이티브 `AlarmEngine` 이벤트가 발생하면 React Query 캐시를 무효화하여 Kotlin측 변경과 UI를 동기화합니다.
- **SYNC 이벤트**: Kotlin `AlarmSyncBridge`가 스케줄/취소/스누즈/부팅 재예약 이후 `SYNC` 이벤트를 발행해 JS가 알람 쿼리를 안정적으로 갱신합니다.
- **자동 재예약**: 알람 해제 시 `AlarmDatabase.computeNextFireAt`로 다음 울릴 시간을 계산해 네이티브에서 바로 재예약하므로 주간/반복 알람이 끊기지 않습니다.
- **정책 메타데이터**: 알람 모델에 `policyMode`/`policyPayload`를 포함하여 네이티브 계약과 일치시키고, 스케줄링 시 해당 모드를 그대로 전달합니다.
- **추가 과제**: 이번 작업과 관련된 보완 항목은 없습니다. `npx tsc --noEmit`가 정상 통과합니다.
