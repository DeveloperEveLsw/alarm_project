# Location 브랜치 문제 정리 (2025-02-15)

## 1. 지도/위치 UI 진입 경로 부재
- `MapLocationPicker`/`AlarmEditorModal` 등 완성된 컴포넌트가 코드에는 있지만, Home 화면 UI가 임시로 교체되면서 더 이상 호출되지 않음.
- 사용자는 지도 기반 위치 선택을 한 번도 열 수 없었고, 권한/지도 연동 로직이 검증되지 않은 상태로 방치됨.

## 2. 지오펜싱 네이티브 코드 불완성
- `GeofenceReceiver`가 `GeofencingEvent.fromIntent`를 null-safe로 처리하지 않아 NPE 위험이 있었고, `triggeringGeofences`가 nullable인데 그대로 List로 사용.
- `AlarmService`, `AlarmActivity` 등 지오펜스 알람을 실제로 실행할 엔트리가 Manifest에서 제거되어, 지오펜싱 이벤트를 받아도 아무 행동을 하지 않음.
- Foreground service 권한(`FOREGROUND_SERVICE_LOCATION`)은 선언돼 있었지만 실제로 서비스를 기동하는 코드가 없었음.

## 3. AndroidManifest/Gradle 충돌 및 권한 손실
- `android/app/src/main/AndroidManifest.xml`에 남아 있던 merge conflict 블록 때문에 위치·알람 관련 권한/receiver/service 선언이 대거 누락됨.
- 구글 지도 API 키 메타데이터가 플레이스홀더(`YOUR_GOOGLE_MAPS_API_KEY`) 상태로 커밋돼 있고, 플랫폼별 제한이나 실제 키 입력 방법에 대한 안내가 전혀 없음.
- Gradle 스크립트도 충돌 마커가 남아 경고/빌드 실패를 유발했고, Room 버전이 Kotlin 2.1 메타데이터를 지원하지 않아 `kapt` 단계가 항상 실패함.

## 4. Room/SQLite 레이어 붕괴
- `AlarmDao`, `AlarmSetDao`, `TodoDao`, `DDayDao` 등 필수 DAO 파일이 location 브랜치에서 삭제돼 `kapt`가 스텁을 생성하지 못하고 종료됨.
- `schemas/` 폴더가 없어서 Room의 `exportSchema = true` 설정이 작동하지 않았고, 빌드 시 schema 파일을 기록하지 못해 실패함.

## 5. RN 네이티브 모듈/서비스 연결 누락
- `LocationBasedServiceModule`이 표준 RN 모듈 패턴을 따르지 않고 `reactContext`를 지역 변수로만 사용해 React Native와의 연결 안정성이 떨어짐.
- `BackgroundLocationService`에서 `MainActivity`를 import하지 않아 Intent 생성 자체가 컴파일되지 않음. (브랜치 상태에서는 `MainActivity` 패키지도 잘못 기입됨)

## 6. 테스트 UI와 실제 기능 분리 실패
- HomeScreen이 DB/연결 테스트 버튼만 잔뜩 있는 실험용 UI로 바뀌었는데, 정작 기존 알람 편집/리스트 기능과의 연결이 모두 끊김.
- 지도 위치 선택처럼 중요한 기능은 “코드에는 있는데 UI에서 못 쓰는” 상태가 되어 QA가 불가능했음.

## 7. 문서/주석/가이드 전무
- Google Maps API 발급/권한/쿼터 제한 방법, 위치 권한 플로우 등에 관한 MD 문서나 README 변경 사항이 없음.
- 팀 내 공유 없이 브랜치 상태가 격리돼 있어, 다른 팀원이 브랜치를 run-android 하면 완전히 다른 앱이 뜬다는 사실조차 전달되지 않음.

---

이상 7개의 주요 문제를 확인했습니다. 특히 지오펜싱·지도 관련 코드를 “반쯤 구현한 상태”로 병합해 두고, UI에서는 진입점도 제공하지 않은 점이 가장 큰 이슈입니다. api-key/Room 의존성 같은 기본 세팅조차 맞춰두지 않아 빌드 자체가 되지 않았습니다.
