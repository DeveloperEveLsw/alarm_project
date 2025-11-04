# 일정-알람 관계 테이블 도입 정리

## 결정 사항
- `Todo`와 `Alarm` 사이에 다대다 성격의 관계를 표현하기 위해 `TodoAlarmRelation` 테이블을 신규로 추가했다.
- 관계 레코드는 일정 기준 몇 분 전에 울릴지(`offset_minutes`)와 순서(`order_index`)를 저장한다.
- Room 데이터베이스 버전을 3으로 올리고, 새 엔터티/DAO를 추가했다.

## 구현 메모
- Android Room
  - 엔터티: `TodoAlarmRelationEntity` (외래 키 및 인덱스 포함)
  - DAO: `TodoAlarmRelationDao` (조회/관찰/일괄 교체)
  - `AlarmLocalDataSource`와 `LocalDatabaseModule`에서 새로운 DAO를 노출하고, React Native 브릿지 메서드(`fetchTodoAlarmRelations`, `replaceTodoAlarmRelations`)를 제공한다.
  - 스키마 JSON(`android/app/schemas/.../3.json`)은 임시 식별자 값으로 만들어 두었으므로, 실제 앱 빌드 시 Gradle로 재생성해야 한다.
- TypeScript
  - `types/generated/roomEntities.ts`, `services/db/localDatabase.ts`, `services/todoService.ts`에 관계 타입과 유틸을 추가했다.
  - `SubScreenTwo` 디버그 화면에서 새로운 테이블을 함께 보여 준다.
- 새 서비스 API:
  - `todoService.getTodoAlarmRelations(todoId)`
  - `todoService.replaceTodoAlarmRelations(todoId, relations)`

## 알람 워크플로우 연동
- 일정 편집 카드에서 알람을 활성화하고 오프셋(분 단위)을 여러 개 지정할 수 있도록 UI와 폼 데이터를 확장했다.
- 저장 시 `todoService.update/create`가 `ScheduleTodo`를 반환하도록 변경하고, `syncTodoAlarms`에서 실제 알람을 생성/갱신/삭제하면서 관계 테이블을 동기화한다.
- 알람 생성·갱신 시 예약 시각을 덮어쓸 수 있도록 `createAlarmFromDraft`/`updateAlarmFromDraft`에 `nextTriggerAtOverride` 옵션을 추가했고, `PersistableAlarm`이 명시적인 `nextTriggerAt` 값을 보존하도록 조정했다.
- 일정이 알람을 비활성화하면 기존 알람을 해제하고 관계 레코드를 정리한다.

## 여러 알람을 세트로 저장
- 알람 목록에서 다중 선택 후 "세트 저장"을 눌러 템플릿을 생성한다.
- `AlarmSetTemplate` / `AlarmTemplate` 테이블로 구성된 재사용 가능한 알람 세트 저장소를 추가했다.
- 새 모달 `AlarmSetCreateModal`에서 이름을 입력하고, `alarmSetService.createAlarmTemplateFromAlarms`가 기준 시각(가장 이른 알람)을 0으로 두고 이후 알람을 상대 분(offset)으로 저장한다.
- 네이티브 브릿지에 `createAlarmSetTemplate` / `fetchAlarmSetTemplates` / `fetchAlarmTemplates` API를 노출하고, TypeScript 래퍼가 이를 호출한다.
- 템플릿은 실제 OS 알람과 분리되어 보관되며, 일정 알람 동기화(`syncTodoAlarms`)는 필요 시 템플릿 오프셋·사운드·정책을 적용한다.
- `ScheduleTodoFormData`는 `alarmTemplateId`를 전달할 수 있으며, 수동 오프셋이 없을 때 템플릿 엔트리를 읽어 일정 알람을 생성한다.
- 알람 추가 FAB가 확장되어 “새 알람”과 “템플릿 적용”을 고를 수 있으며, 템플릿을 선택하면 기준 시각을 지정해 즉시 실제 알람들을 생성한다.
- 템플릿 목록 항목에 삭제(휴지통) 액션을 추가했고, 세트 템플릿을 삭제하면 연관 `AlarmTemplate` 엔트리도 함께 제거된다.


## 후속 작업 아이디어
- 일정 저장/삭제 로직에서 `TodoAlarmRelation`을 실제로 생성·동기화하도록 구현.
- 알람 세트 UI/스토리지 설계에 맞춰 `order_index` 활용 규칙을 정의.
- Room 스키마를 Gradle 빌드로 다시 덤프해서 `identityHash`를 실제 값으로 갱신.
