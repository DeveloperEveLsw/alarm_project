# FireAt Responsibility / fireAt 책임 분담

## EN
- React layer computes `fireAt` via `computeNextTrigger` whenever an alarm is created, updated, or rescheduled. The value is stored alongside the alarm record and passed to Kotlin.
- Kotlin trusts the provided `fireAt` timestamp and schedules/cancels alarms in `AlarmManager` without re-deriving the time.
- Native logic still updates the SQLite DB as needed (e.g., on dismiss/repeat) and emits a bridge event so React Query can invalidate alarm caches and reload fresh data.
- Kotlin may add safety checks (e.g., if `fireAt` is already in the past) but does not recalculate the next trigger itself.

## KO
- 알람을 생성·수정·재예약할 때 React 레이어가 `computeNextTrigger`로 `fireAt` 값을 계산하고, 알람 레코드와 함께 Kotlin에 전달한다.
- Kotlin은 전달받은 `fireAt`을 신뢰해 `AlarmManager`에서 예약/취소를 수행하며, 별도로 시간을 재계산하지 않는다.
- 네이티브 로직은 해제/재예약 등 DB 변경이 있을 때 SQLite를 갱신하고 브릿지 이벤트를 쏴서 React Query가 캐시를 무효화하고 최신 데이터를 다시 가져오도록 한다.
- Kotlin은 `fireAt`이 과거 시각인지 같은 예외만 확인할 수 있지만, 다음 울림 시각 자체는 재계산하지 않는다.
