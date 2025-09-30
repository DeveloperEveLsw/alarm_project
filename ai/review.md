# 2025-03-12 작업 노트
- Android 네이티브에 `PermissionModule`을 추가해 RN에서 알림·위치·정확 알람 권한을 통합적으로 확인하고 요청할 수 있게 했습니다.
- `PermissionAwareActivity`를 통해 런타임 권한을 처리하고, Android 12(API 31)+에서는 정확 알람 설정 화면으로 이동하는 인텐트도 노출합니다.
- `AlarmEnginePackage`에 모듈을 등록해 `NativeModules.PermissionModule`로 접근하도록 연결했습니다.
- `stores/alarmPermissionsStore.ts`에서 RN 전용 권한 체크/요청 로직을 모두 `PermissionModule` 호출로 이관해, 실제 권한 상태를 네이티브에서 판별하도록 정리했습니다.
- 권한 요청 Promise가 실패할 때 콘솔 로그로 예외를 남기고 상태를 보수적으로 false로 되돌리도록 JS 스토어 측 예외 처리를 추가했습니다.

## 권한 추가/변경 시 유지보수 가이드
1. `PermissionModule.kt`에 새로운 권한의 `check*` / `request*` 메서드를 구현하고, 필요하다면 설정 진입 인텐트 메서드를 함께 추가합니다. (이 메서드들이 실제 Android API를 호출해 권한을 확인하거나 요청하는 단계입니다.)
2. 네이티브 메서드 안에서는 항상 `promise.resolve(...)` 또는 `promise.reject(...)`를 호출해야 합니다. 이렇게 해야 JS 쪽에서 `await PermissionModule.xxx()`를 사용할 때 정상적으로 값이 돌아오거나 오류를 감지할 수 있습니다.
3. JS의 `PermissionBridge` 타입 정의에 새 메서드를 추가하고, `useAlarmPermissionsStore` 안에서도 해당 메서드를 호출하도록 액션을 확장합니다. 즉, 네이티브에서 만든 함수를 JS에서 import하고, Zustand 스토어가 그 반환값을 받아 상태(`hasSomething`)를 업데이트하게 만들어야 합니다.
4. UI 레이어에서 새 권한 상태/요청 버튼을 사용한다면 실패 로그를 참고해 UX 처리(재시도, 완화 권한 안내 등)를 업데이트합니다.
