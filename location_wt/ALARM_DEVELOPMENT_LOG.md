# 알람 프로젝트 개발 로그

## 📋 프로젝트 개요
- **목표**: OS 알람 매니저를 활용한 React Native 알람 앱 개발
- **기간**: 2024년
- **기술 스택**: React Native, TypeScript, SQLite, Android Kotlin

---

## 🎯 초기 목표 설정

### **사용자 요구사항**
- OS 알람 매니저를 사용한 알람 기능
- 친구의 Kotlin 코드와 연동하지 않고 독립적으로 구현
- 알람 추가, 토글, 삭제 기능
- 테스트 가능한 상태로 구현

---

## 🏗️ 프로젝트 구조 변경 과정

### **1단계: 기존 코드 정리**
- **삭제된 파일들**:
  - `screens/DebugScreen.tsx` (디버깅 화면)
  - `services/db/geofenceService.ts` (지오펜싱 서비스)
  - `services/db/locationAlarmService.ts` (위치 알람 서비스)
  - `services/bus/BusApiService.js` (버스 API 서비스)
  - `services/bus/DemoBusApiService.js` (데모 버스 API)

### **2단계: DB 관리 구조 개선**
- **기존**: 정적 싱글톤 패턴 (`db.ts`)
- **변경**: 인스턴스 기반 의존성 주입 패턴
- **새로운 구조**:
  ```
  services/
  ├── db/
  │   └── databaseService.ts (DB 연결 관리)
  ├── alarm/
  │   └── alarmService.ts (알람 비즈니스 로직)
  ├── schedule/
  │   ├── scheduleService.ts
  │   └── ddayService.ts
  └── index.ts (서비스 인스턴스 관리)
  ```

---

## 🐛 버그 및 해결 과정

### **버그 #1: DB 스키마 마이그레이션 문제**

#### **문제 상황**
```
❌ 알람 생성 실패: table Alarm has no column named title (code 1 SQLITE_ERROR)
```

#### **원인 분석**
- 기존 `Alarm` 테이블에 `title`, `is_system_alarm`, `system_alarm_id` 컬럼이 없음
- 새로운 스키마와 기존 DB 구조 불일치

#### **해결 방법**
```typescript
// databaseService.ts에 마이그레이션 로직 추가
private async migrateAlarmTable(db: SQLiteDatabase): Promise<void> {
  try {
    // title 컬럼 추가
    await db.executeSql(`
      ALTER TABLE Alarm ADD COLUMN title TEXT NOT NULL DEFAULT '알람';
    `);
    
    // is_system_alarm 컬럼 추가
    await db.executeSql(`
      ALTER TABLE Alarm ADD COLUMN is_system_alarm INTEGER DEFAULT 1;
    `);
    
    // system_alarm_id 컬럼 추가
    await db.executeSql(`
      ALTER TABLE Alarm ADD COLUMN system_alarm_id INTEGER;
    `);
  } catch (error) {
    console.error('❌ Alarm 테이블 마이그레이션 실패:', error);
  }
}
```

#### **교훈**
- DB 스키마 변경 시 기존 데이터 호환성 고려
- 마이그레이션 로직을 통한 점진적 스키마 업데이트

---

### **버그 #2: 서비스 초기화 실패**

#### **문제 상황**
```
❌ TypeError: Cannot read property 'getDB' of undefined
```

#### **원인 분석**
- `AlarmService`의 `databaseService`가 `undefined`
- 의존성 주입 과정에서 초기화 실패

#### **해결 방법**
```typescript
// alarmService.ts 모든 메서드에 null 체크 추가
async createAlarm(alarmData: CreateAlarmData): Promise<number> {
  try {
    if (!this.databaseService) {
      throw new Error('DatabaseService가 초기화되지 않았습니다');
    }
    
    const db = await this.databaseService.getDB();
    if (!db) {
      throw new Error('DB 연결이 실패했습니다');
    }
    // ... 나머지 로직
  } catch (error) {
    console.error('❌ 알람 생성 실패:', error);
    throw new Error(`알람 생성 실패: ${error.message}`);
  }
}
```

#### **교훈**
- TypeScript의 타입 안전성을 활용한 방어적 프로그래밍
- 런타임 오류 방지를 위한 null 체크

---

### **버그 #3: 네이티브 모듈 JNI 호환성 문제**

#### **문제 상황**
```
❌ Exception in HostObject::get for prop 'AlarmModule'
❌ Unable to parse @ReactMethod annotation from native module method: AlarmModule.setAlarm()
❌ Detected unsupported parameter class: long
```

#### **원인 분석**
- React Native가 `Long` 타입을 지원하지 않음
- JNI 파싱 과정에서 `long` 파라미터 처리 실패

#### **해결 방법**
```kotlin
// Before
@ReactMethod
fun setAlarm(alarmTime: Long, alarmId: Int, title: String, promise: Promise)

// After
@ReactMethod
fun setAlarm(alarmTime: Double, alarmId: Int, title: String, promise: Promise) {
  // ...
  alarmManager.setExact(
    AlarmManager.RTC_WAKEUP,
    alarmTime.toLong(), // Double을 Long으로 변환
    pendingIntent
  )
}
```

#### **교훈**
- React Native 네이티브 모듈 개발 시 지원되는 타입만 사용
- JavaScript와 네이티브 간 데이터 타입 호환성 고려

---

### **버그 #4: UI 상태 관리 문제**

#### **문제 상황**
- 알람 삭제/토글 시 UI 업데이트 실패
- React Query 캐시 무효화 실패

#### **원인 분석**
- `useMutation`의 `onSuccess` 콜백에서 쿼리 무효화 실패
- 디버깅 정보 부족으로 원인 파악 어려움

#### **해결 방법**
```typescript
// HomeScreen.tsx에 상세 디버깅 로그 추가
const deleteAlarmMutation = useMutation({
  mutationFn: async (alarmId: number) => {
    console.log('🔄 알람 삭제 시작:', alarmId);
    console.log('🔧 alarmService 상태:', alarmService);
    
    try {
      await alarmService.deleteAlarm(alarmId);
      console.log('✅ 알람 삭제 성공:', alarmId);
    } catch (error) {
      console.error('❌ 알람 삭제 실패:', error);
      throw error;
    }
  },
  onSuccess: () => {
    console.log('🔄 쿼리 무효화 시작');
    queryClient.invalidateQueries({ queryKey: ['alarms'] });
    Alert.alert('성공', '알람이 삭제되었습니다.');
  }
});
```

#### **교훈**
- 복잡한 상태 관리 시 단계별 디버깅 로그 필수
- React Query의 캐시 무효화 메커니즘 이해

---

## 🧪 테스트 화면 개발 과정

### **1. TestAlarmScreen.tsx**
- **목적**: OS 알람 매니저 직접 테스트
- **기능**: 
  - 알람 설정/취소
  - 반복 알람 테스트
  - 네이티브 모듈 연동 확인

### **2. DBTestScreen.tsx**
- **목적**: 데이터베이스 CRUD 작업 테스트
- **기능**:
  - 알람 생성/조회/수정/삭제
  - 서비스 레이어 테스트

### **3. DBConnectionTest.tsx**
- **목적**: DB 연결 및 테이블 초기화 테스트
- **기능**:
  - DB 연결 상태 확인
  - 테이블 생성/삭제
  - 마이그레이션 테스트

### **4. SimpleAlarmTest.tsx**
- **목적**: 알람 생성 과정 단계별 테스트
- **기능**:
  - 직접 DB 알람 생성
  - 서비스 레이어 알람 생성
  - 단계별 오류 추적

---

## 📱 네이티브 모듈 구현

### **AlarmModule.kt**
```kotlin
class AlarmModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  
  @ReactMethod
  fun setAlarm(alarmTime: Double, alarmId: Int, title: String, promise: Promise) {
    // OS 알람 매니저에 알람 등록
  }
  
  @ReactMethod
  fun setRepeatingAlarm(alarmTime: Double, repeatType: String, alarmId: Int, title: String, promise: Promise) {
    // 반복 알람 설정
  }
  
  @ReactMethod
  fun cancelAlarm(alarmId: Int, promise: Promise) {
    // 알람 취소
  }
}
```

### **AlarmReceiver.kt**
```kotlin
class AlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    // 알람 발생 시 알림 표시
  }
}
```

### **AndroidManifest.xml 권한 추가**
```xml
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
<uses-permission android:name="android.permission.USE_EXACT_ALARM" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

---

## 🔧 주요 개선사항

### **1. 아키텍처 개선**
- **Before**: 정적 싱글톤 패턴
- **After**: 인스턴스 기반 의존성 주입

### **2. 타입 안전성 강화**
- TypeScript null 체크 추가
- 런타임 오류 방지

### **3. 에러 처리 개선**
- 단계별 try-catch 블록
- 상세한 오류 메시지
- 디버깅 로그 추가

### **4. 테스트 환경 구축**
- 4개의 전용 테스트 화면
- 단계별 디버깅 도구
- 실시간 상태 확인

---

## 📊 최종 결과

### **성공적으로 구현된 기능**
✅ OS 알람 매니저 연동  
✅ 알람 생성/조회/수정/삭제  
✅ 알람 토글 (켜기/끄기)  
✅ 반복 알람 설정  
✅ DB 마이그레이션  
✅ 네이티브 모듈 호환성  
✅ UI 상태 관리  

### **해결된 주요 버그**
✅ DB 스키마 마이그레이션 문제  
✅ 서비스 초기화 실패  
✅ 네이티브 모듈 JNI 호환성  
✅ UI 상태 관리 문제  

### **개발 과정에서 얻은 교훈**
1. **DB 마이그레이션**: 스키마 변경 시 기존 데이터 호환성 필수
2. **타입 안전성**: TypeScript의 방어적 프로그래밍 활용
3. **네이티브 모듈**: React Native 지원 타입만 사용
4. **디버깅**: 단계별 로그를 통한 체계적 문제 해결
5. **테스트**: 다양한 테스트 화면을 통한 안정성 확보

---

## 🚀 향후 개선 방향

1. **알람 울림 기능**: 실제 알람 발생 시 UI 업데이트
2. **알람 사운드**: 사용자 정의 알람음 설정
3. **알람 그룹**: 여러 알람을 그룹으로 관리
4. **백업/복원**: 알람 데이터 백업 기능
5. **위젯**: 홈 화면 알람 위젯

---

*이 문서는 알람 프로젝트의 전체 개발 과정을 기록한 것입니다.*
