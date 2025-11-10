# Location 브랜치 지도/지오펜싱 보강 (2025-02-15)

## 작업 개요
- 지도 선택 모달이 권한 없이 빈 화면만 뜨는 문제를 해결하고, 네이티브 위치/지오펜싱 모듈이 실제로 동작하도록 안드로이드 설정을 복구했습니다.

## 주요 변경 사항
- `MapLocationPicker.tsx`에 권한 요청·현재 위치 이동 버튼·`LocationBasedService` 연동을 추가해 지도 UI 단독으로 위치를 고를 수 있도록 개선.
- `LocationProvider`/`LocationSnapshot` 네이티브 클래스를 신규 작성해 코루틴으로 최신 위치를 안전하게 조회하도록 구현하고, `BackgroundLocationService`는 일관된 타임스탬프를 저장하도록 수정.
- Android 빌드 스크립트 전반(Gradle, Manifest, 패키지 등록)을 정리해 `react-native-maps`, 지오펜싱, 위치 서비스가 필요한 권한·의존성을 모두 선언하도록 복원. `MAPS_API_KEY`는 `gradle.properties`의 placeholder를 로컬 값으로 반드시 덮어써야 합니다.
- 불필요한 충돌/백업 파일 제거 및 `AlarmEnginePackage`를 `LocationBasedServiceModule`만 노출하도록 정리, `MainApplication`에 패키지를 다시 등록해 JS ↔️ 네이티브 브릿지가 살아나도록 함.

## 확인/남은 TODO
- Google Maps API Key는 로컬 `gradle.properties`(혹은 환경 변수)에서 `MAPS_API_KEY`로 지정해야 실제 지도 로딩이 가능합니다.
- 위치 기반 알람을 실제로 트리거하는 AlarmService/UI는 여전히 다른 브랜치와 병합이 필요하므로 여기서는 건드리지 않았습니다.

## 2/15 추가 정리
- 빌드 실패 원인은 Room DAO/Repository 파일들이 위치 브랜치에서 빠져 있었던 탓에 `kapt`가 필요한 인터페이스를 찾지 못했기 때문입니다.
- 누락돼 있던 Room DAO(`AlarmDao`, `AlarmSetDao`, `TodoDao`, `DDayDao`)와 관련 엔티티/레포지토리 파일들을 `com.alarm_project.alarm.data.local` 패키지 위치로 복원했습니다. (원본은 OS 브랜치와 동일한 정의)
- 이제 `./gradlew :app:kaptDebugKotlin`이 필요한 클래스를 모두 찾을 수 있으므로 다시 빌드하면 됩니다. 윈도우 환경에서 한 번 더 실행해 주세요.
- `kapt`가 schema 폴더가 없어서 죽는 로그로 보입니다. Room에 `exportSchema = true`가 켜져 있는데 location 브랜치에는 `android/app/schemas` 디렉터리가 아예 없어서 KAPT가 스키마 JSON을 쓸 수 없습니다. 폴더를 생성해 두었으니 다시 빌드해 보세요 (`D:\workspace\alarm\alarm_project\location_wt\android\app\schemas`).
- `kapt` 로그의 `Provided Metadata instance has version 2.1.0, while maximum supported version is 2.0.0` 는 Room 2.6.1이 Kotlin 2.1에서 나온 메타데이터를 읽지 못해 난 오류였습니다. `android/app/build.gradle` 의 `roomVersion` 을 `2.7.0-alpha03` 으로 올려두었으니 다시 `gradlew :app:kaptDebugKotlin` 을 실행해 주세요.
