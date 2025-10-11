# React Alarm Flow Overview / 리액트 알람 흐름 정리

## EN
### Core Components
- `HomeScreen` keeps alarms in a React state array of `AlarmItem` objects.
- `AlarmEditorModal` edits/creates alarms in-memory and passes drafts back to `HomeScreen`.
- `alarmService.scheduleAlarm` and `alarmService.cancelAlarm` bridge JS alarms to the native `AlarmEngine`.

### Data Types
- `AlarmItem` (`types/alarm.types.ts`) mirrors the modal fields: `id`, clock time, repeat days, skip holidays, sound, vibrate, `enabled`, `nextTriggerAt`.
- Drafts omit `enabled`/`nextTriggerAt` and optionally `id` for new alarms.

### Scheduling Flow in HomeScreen
1. Open modal (`editorState`) with either a blank draft or data copied via `toDraft`.
2. On save:
   - Ensure Android permissions through `useAlarmPermissionsStore` + `ensureLocationForegroundServicePermission`.
   - Generate an ID (`alarm-${Date.now()}` currently) and merge form values into an `AlarmItem`.
   - Cancel any existing native alarm when editing an existing entry.
   - If `enabled`, call `scheduleAlarm`, store returned `nextTriggerAt`, and push updated item into local state.
   - On failure, disable the alarm and keep state in sync.
3. Toggling the switch re-runs permission checks, schedules or cancels in native land, and updates the state copy.

### AlarmService Helpers
- `computeNextTrigger` (Dayjs based) calculates the next fire timestamp respecting repeat days.
- `scheduleAlarm` builds an `AlarmSpec` and calls `AlarmEngine.scheduleExact`.
- `cancelAlarm` cancels by ID through the native module.

### Native Bridge (AlarmEngine)
- Wraps React Native module `AlarmEngine`.
- Dispatches events (`FIRED`, `ERROR`, etc.) into JS listeners (e.g., `App.tsx` navigates to mission screens on `FIRED`).

### Permissions Store
- Zustand store `alarmPermissionsStore` hydrates/checks Android permissions (notifications, exact alarm, vibrate, location).
- `HomeScreen` uses selectors for UI warnings and direct method calls (`request*`, `openExactAlarmSettings`).

### Current Limitations
- All alarms live only in React state (no persistence).
- IDs rely on `Date.now()`; migrations will swap to UUID.
- `alarm_id` / `alarm_set_id` columns in the SQLite schema are unused.
- No CRUD for `Alarm`/`AlarmSet` tables yet.

## KO
### 핵심 구성 요소
- `HomeScreen`이 `AlarmItem` 배열을 상태로 보관한다.
- `AlarmEditorModal`에서 알람을 작성/수정하고 `HomeScreen`으로 초안을 전달한다.
- `alarmService.scheduleAlarm` / `cancelAlarm`이 JS 알람을 네이티브 `AlarmEngine`과 이어준다.

### 데이터 타입
- `AlarmItem`(`types/alarm.types.ts`)은 모달 입력값과 동일한 필드를 가지고: `id`, 시·분, 반복 요일, 휴일 스킵, 사운드, 진동, `enabled`, `nextTriggerAt`.
- 새 알람용 드래프트는 `enabled`, `nextTriggerAt`이 없고 `id`는 선택적이다.

### HomeScreen 스케줄링 흐름
1. 모달을 열어(`editorState`) 새 초안 또는 기존 값을 편집한다.
2. 저장 시
   - `useAlarmPermissionsStore`와 `ensureLocationForegroundServicePermission`으로 안드로이드 권한을 확인한다.
   - 현재는 `alarm-${Date.now()}` 형태로 ID를 만들고, 입력값을 `AlarmItem`으로 조합한다.
   - 기존 알람 수정 중이면 네이티브 예약을 먼저 취소한다.
   - `enabled`면 `scheduleAlarm`을 호출해 `nextTriggerAt`을 받고 상태에 반영한다.
   - 실패 시 알람을 비활성화한 상태로 저장한다.
3. 스위치를 토글하면 다시 권한을 점검하고 네이티브 예약/취소 후 상태를 업데이트한다.

### AlarmService 보조 함수
- `computeNextTrigger`가 Dayjs로 다음 울릴 시간을 계산한다.
- `scheduleAlarm`이 `AlarmSpec`을 작성해 `AlarmEngine.scheduleExact`에 넘긴다.
- `cancelAlarm`이 ID 기반으로 네이티브 예약을 취소한다.

### 네이티브 브릿지 (AlarmEngine)
- React Native 모듈 `AlarmEngine`을 래핑한다.
- `FIRED`, `ERROR` 등의 이벤트를 JS로 전달하며 `App.tsx`는 `FIRED`에서 미션 화면으로 이동한다.

### 권한 스토어
- zustand 기반 `alarmPermissionsStore`가 알림/정확한 알람/진동/위치 권한을 확인 및 요청한다.
- `HomeScreen`은 선택자와 직접 메서드를 이용해 경고 배너와 요청 동작을 처리한다.

### 현재 한계
- 알람은 React 상태에만 존재해 영속화가 없다.
- ID가 `Date.now()`에 의존하며 UUID로 교체 예정.
- SQLite의 `alarm_id`, `alarm_set_id`는 아직 사용되지 않는다.
- `Alarm`, `AlarmSet` 테이블을 다루는 CRUD 서비스가 없다.
