# Alarm Sync Strategy / 알람 동기화 전략

## EN
- Kotlin can access the shared SQLite DB to reschedule or deactivate alarms.
- After the native update, Kotlin emits a `SYNC` alarm event through `AlarmEngine`.
- JS receives the `SYNC` event and invalidates the React Query cache for `['alarms']`.
- React Query refetches the latest alarm snapshot from SQLite via the alarm storage service, keeping UI consistent.
- Outcome: native-driven edits (dismiss, repeat scheduling, background reschedule) and JS UI stay in sync without manual reconciliation.

## KO
- Kotlin에서 공용 SQLite DB에 직접 접근해 알람을 재예약하거나 비활성화한다.
- 변경이 끝나면 `AlarmEngine`을 통해 `SYNC` 이벤트를 JS로 발송한다.
- JS는 해당 이벤트를 수신하면 `queryClient.invalidateQueries(['alarms'])`로 캐시를 무효화한다.
- React Query가 알람 스냅샷을 다시 불러와 UI를 최신 상태로 유지한다.
- 결과적으로 네이티브에서 발생한 해제/재예약과 JS UI가 별도 동기화 코드 없이 일관성을 유지한다.
