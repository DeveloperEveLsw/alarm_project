좋아, Codex(혹은 “코드 자동 수정” 어시스턴트)에게 그대로 붙여넣어 실행시키기 좋은 “지시문”을 만들어줄게. 아래 블록을 통째로 전달하면 돼.

---

### ⬇️ Codex 지시문 (그대로 붙여넣기)

다음 변경을 Android/Kotlin + React Native 프로젝트에 일괄 적용해줘. 파일 경로는 루트가 `android/app/src/main/java/com/alarm_project/alarm/` 라고 가정한다.

---

#### 1) `BackgroundLocationService.kt` — 130줄 부근 Intent 생성 코드 수정

* 문제: `MainActivity` 심볼 미해결 → Intent 체이닝이 전부 깨짐(`flags`, `action`, `putExtra`).
* 작업:

  1. 상단 import에 아래 두 줄이 없으면 추가

     ```kotlin
     import android.content.Intent
     import com.alarm_project.alarm.MainActivity
     ```
  2. 130줄 부근의 잘못된 Intent 생성/적용 코드를 아래로 교체

     ```kotlin
     val intent = Intent(this, MainActivity::class.java).apply {
         flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
         action = "com.alarm_project.alarm.OPEN_FROM_SERVICE"
         putExtra("source", "BackgroundLocationService")
     }
     startActivity(intent)
     ```
  3. `MainActivity.kt`가 실제로 `package com.alarm_project.alarm` 에 존재하는지 확인. 아니면 패키지/경로를 맞춰줘.

---

#### 2) `GeofenceReceiver.kt` — GeofencingEvent null 안전 및 타입 보정

* 문제: `GeofencingEvent.fromIntent(intent)` 가 nullable인데 non-null처럼 사용, 그리고 `triggeringGeofences` 가 `(Mutable)List<Geofence>?)` 인데 `List<Geofence>` 요구하는 함수에 바로 전달하여 타입 불일치.
* 작업: `onReceive` 를 다음과 같이 수정(핵심은 null 가드와 `?: emptyList()`):

  ```kotlin
  override fun onReceive(context: Context, intent: Intent) {
      val event = GeofencingEvent.fromIntent(intent)
      if (event == null) {
          Log.w(TAG, "GeofencingEvent is null"); return
      }
      if (event.hasError()) {
          Log.e(TAG, "Geofencing error: ${event.errorCode}"); return
      }

      val transition = event.geofenceTransition
      val geofences: List<Geofence> = event.triggeringGeofences ?: emptyList()
      val location: Location? = event.triggeringLocation

      when (transition) {
          Geofence.GEOFENCE_TRANSITION_ENTER -> handleEnter(context, geofences, location)
          Geofence.GEOFENCE_TRANSITION_EXIT  -> handleExit(context, geofences, location)
          Geofence.GEOFENCE_TRANSITION_DWELL -> handleDwell(context, geofences, location)
          else -> Log.d(TAG, "Unknown transition: $transition")
      }
  }
  ```
* `handleEnter/Exit/Dwell` 의 시그니처가 `List<Geofence>` 를 받도록 되어 있다면 그대로 두고, 위처럼 호출 시 `?: emptyList()` 로 non-null 변환해서 넘긴다(함수 시그니처를 바꾸지 말 것).

---

#### 3) `GeofenceReceiver.kt` — AlarmService 인텐트 생성부 수정

* 문제: `AlarmService` unresolved + `action/putExtra` 인식 실패.
* 작업:

  1. 상단 import 보강:

     ```kotlin
     import android.content.Intent
     import androidx.core.content.ContextCompat
     import com.alarm_project.alarm.AlarmService
     ```
  2. 서비스 시작 코드는 아래 예시처럼 Intent에 `action/putExtra` 를 설정하고 **foreground service** 로 시작:

     ```kotlin
     val svc = Intent(context, AlarmService::class.java).apply {
         action = "com.alarm_project.alarm.GEOFENCE_TRIGGER"
         putExtra("transition", transition)
         putExtra("ids", geofences.map { it.requestId }.toTypedArray())
     }
     ContextCompat.startForegroundService(context, svc)
     ```

---

#### 4) `AlarmService.kt` — 서비스 최소 구현 및 Manifest 등록

* 없거나 미완성이라면 아래 최소 구현 추가(패키지 `com.alarm_project.alarm` 유지):

  ```kotlin
  package com.alarm_project.alarm

  import android.app.Notification
  import android.app.NotificationChannel
  import android.app.NotificationManager
  import android.app.Service
  import android.content.Intent
  import android.os.Build
  import android.os.IBinder

  class AlarmService : Service() {
      override fun onBind(intent: Intent?): IBinder? = null

      override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
          ensureChannel()
          val n: Notification = Notification.Builder(this, "geo_channel")
              .setContentTitle("Geofence Triggered")
              .setContentText(intent?.action ?: "no action")
              .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
              .build()
          startForeground(1001, n)
          // TODO: extras 처리 로직
          return START_NOT_STICKY
      }

      private fun ensureChannel() {
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
              val nm = getSystemService(NotificationManager::class.java)
              if (nm?.getNotificationChannel("geo_channel") == null) {
                  nm?.createNotificationChannel(
                      NotificationChannel("geo_channel", "Geofence", NotificationManager.IMPORTANCE_LOW)
                  )
              }
          }
      }
  }
  ```
* `AndroidManifest.xml` 에 서비스 등록(앱 모듈의 `src/main/AndroidManifest.xml`):

  ```xml
  <application ...>
      <service
          android:name=".AlarmService"
          android:exported="false"
          android:foregroundServiceType="location"/>
  </application>
  ```

---

#### 5) `LocationBasedServiceModule.kt` — `reactContext` 미해결 수정

* 문제: `reactContext` 식별자 없음.
* 작업: RN 모듈을 표준 형태로 정리.

  ```kotlin
  package com.alarm_project.alarm

  import com.facebook.react.bridge.Promise
  import com.facebook.react.bridge.ReactApplicationContext
  import com.facebook.react.bridge.ReactContextBaseJavaModule
  import com.facebook.react.bridge.ReactMethod

  class LocationBasedServiceModule(
      private val reactContext: ReactApplicationContext
  ) : ReactContextBaseJavaModule(reactContext) {

      override fun getName() = "LocationBasedServiceModule"

      @ReactMethod
      fun ping(promise: Promise) {
          // 예시: reactContext 사용
          promise.resolve("ok")
      }
  }
  ```
* 다른 메서드들에서 `reactContext` 를 그대로 사용하도록 수정.

---

#### 6) Gradle 스크립트 정리 (경고 제거)

* Groovy DSL 속성 대입을 **`prop = value`** 로 통일:

  * 잘못된 예: `minSdkVersion 24`, `applicationId("com.xxx")`
  * 올바른 예: `minSdkVersion = 24`, `applicationId = "com.xxx"`
* `repositories { ... }` 에서 `jcenter()` 제거, `google()`, `mavenCentral()` 만 남김.
* (선택) Java 컴파일 경고 상세:

  ```groovy
  tasks.withType(JavaCompile).configureEach {
      options.compilerArgs += ['-Xlint:deprecation', '-Xlint:unchecked']
  }
  ```

---

#### 7) 빌드 커맨드

수정 후 아래 순서로 실행:

```bash
gradlew clean
gradlew :app:compileDebugKotlin --stacktrace
gradlew :app:installDebug --stacktrace -PreactNativeDevServerPort=8081
```

---

이상 변경을 적용한 뒤에도 같은 위치에서 실패하면, 각 파일의 해당 라인(특히 `BackgroundLocationService.kt` 130줄 전후, `GeofenceReceiver.kt` 의 `fromIntent` 사용부, `LocationBasedServiceModule` 클래스 헤더)을 다시 점검해줘. 패키지명/임포트 불일치가 있으면 맞춰서 재시도.
