import SQLite, { SQLiteDatabase } from 'react-native-sqlite-storage';

SQLite.enablePromise(true);

export class DatabaseService {
  private database: SQLiteDatabase | null = null;
  private dbName: string;

  constructor(dbName: string) {
    this.dbName = dbName;
  }

  async getDB(): Promise<SQLiteDatabase> {
    try {
      if (this.database) {
        console.log('✅ 기존 DB 연결 사용');
        return this.database;
      }

      console.log(`🔄 DB 연결 시작: ${this.dbName}`);
      this.database = await SQLite.openDatabase({
        name: this.dbName,
        location: 'default',
      });

      console.log('✅ DB 연결 성공');
      await this.database.executeSql('PRAGMA foreign_keys = ON;');
      console.log('✅ Foreign keys 활성화');

      return this.database;
    } catch (error) {
      console.error('❌ DB 연결 실패:', error);
      throw new Error(`DB 연결 실패: ${error.message}`);
    }
  }

  async closeDB(): Promise<void> {
    if (this.database) {
      await this.database.close();
      this.database = null;
    }
  }

  async initializeTables(): Promise<void> {
    try {
      console.log('🔄 테이블 초기화 시작');
      const db = await this.getDB();
      
      if (!db) {
        throw new Error('DB 연결이 null입니다');
      }
      
      const [result] = await db.executeSql(`
        SELECT name FROM sqlite_master WHERE type='table' AND name='Todo';
      `);

      if (result.rows.length === 0) {
        console.log('📦 최초 실행: 테이블 생성 시작');

      await db.executeSql(`
        CREATE TABLE Todo (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT,
          
          due_date TEXT,               -- 'YYYY-MM-DD'
          due_time TEXT,               -- 'HH:mm'

          -- 반복 일정일 경우
          is_repeating INTEGER DEFAULT 0,         -- 0: 단일, 1: 반복
          repeat_type TEXT,                       -- 'weekly' or 'monthly'
          repeat_weekday TEXT,                    -- JSON-encoded weekday indices (e.g. '[1,2,3]')
          repeat_day_of_month INTEGER,            -- 1 ~ 31 ← 월 반복용
          
          -- 연결 관계
          dday_id INTEGER,                        -- Dday 연결 (nullable)
          alarm_id INTEGER,                       -- Alarm 연결 (nullable)
          alarm_set_id INTEGER,                   -- AlarmSet 연결 (nullable)

          created_at TEXT DEFAULT CURRENT_TIMESTAMP,

          FOREIGN KEY (dday_id) REFERENCES Dday(id) ON DELETE SET NULL,
          FOREIGN KEY (alarm_id) REFERENCES Alarm(id) ON DELETE SET NULL,
          FOREIGN KEY (alarm_set_id) REFERENCES AlarmSet(id) ON DELETE SET NULL
        );
      `);

      await db.executeSql(`
        CREATE TABLE IF NOT EXISTS Dday ( 
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          todo_id INTEGER,
          target_date TEXT NOT NULL,
          FOREIGN KEY (todo_id) REFERENCES Todo(id) ON DELETE CASCADE
        );
      `);

      await db.executeSql(`
        CREATE TABLE IF NOT EXISTS AlarmSet (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT,
          representative_alarm_id INTEGER,
          FOREIGN KEY (representative_alarm_id) REFERENCES Alarm(id) ON DELETE SET NULL
        );
      `);

      await db.executeSql(`
        CREATE TABLE IF NOT EXISTS Alarm (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          time TEXT NOT NULL,
          title TEXT NOT NULL,
          is_system_alarm INTEGER DEFAULT 1,      -- OS 알람 매니저 사용 여부
          system_alarm_id INTEGER,                -- OS 알람 매니저의 알람 ID
          dday_id INTEGER,
          alarm_set_id INTEGER,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (dday_id) REFERENCES Dday(id) ON DELETE CASCADE,
          FOREIGN KEY (alarm_set_id) REFERENCES AlarmSet(id) ON DELETE SET NULL
        );
      `);
      } else {
        console.log('✅ 테이블 이미 존재함');
        // 기존 테이블에 title 컬럼이 있는지 확인
        await this.migrateAlarmTable(db);
      }
    } catch (error) {
      console.error('❌ 테이블 초기화 실패:', error);
      throw new Error(`테이블 초기화 실패: ${error.message}`);
    }
  }

  // Alarm 테이블 마이그레이션
  private async migrateAlarmTable(db: SQLiteDatabase): Promise<void> {
    try {
      console.log('🔄 Alarm 테이블 마이그레이션 확인 중...');
      
      // title 컬럼이 있는지 확인
      const [result] = await db.executeSql(`
        PRAGMA table_info(Alarm);
      `);
      
      let hasTitleColumn = false;
      for (let i = 0; i < result.rows.length; i++) {
        const column = result.rows.item(i);
        if (column.name === 'title') {
          hasTitleColumn = true;
          break;
        }
      }
      
      if (!hasTitleColumn) {
        console.log('🔄 title 컬럼 추가 중...');
        await db.executeSql(`
          ALTER TABLE Alarm ADD COLUMN title TEXT NOT NULL DEFAULT '알람';
        `);
        console.log('✅ title 컬럼 추가 완료');
      } else {
        console.log('✅ title 컬럼 이미 존재함');
      }
      
      // is_system_alarm 컬럼이 있는지 확인
      let hasSystemAlarmColumn = false;
      for (let i = 0; i < result.rows.length; i++) {
        const column = result.rows.item(i);
        if (column.name === 'is_system_alarm') {
          hasSystemAlarmColumn = true;
          break;
        }
      }
      
      if (!hasSystemAlarmColumn) {
        console.log('🔄 is_system_alarm 컬럼 추가 중...');
        await db.executeSql(`
          ALTER TABLE Alarm ADD COLUMN is_system_alarm INTEGER DEFAULT 1;
        `);
        console.log('✅ is_system_alarm 컬럼 추가 완료');
      } else {
        console.log('✅ is_system_alarm 컬럼 이미 존재함');
      }
      
      // system_alarm_id 컬럼이 있는지 확인
      let hasSystemAlarmIdColumn = false;
      for (let i = 0; i < result.rows.length; i++) {
        const column = result.rows.item(i);
        if (column.name === 'system_alarm_id') {
          hasSystemAlarmIdColumn = true;
          break;
        }
      }
      
      if (!hasSystemAlarmIdColumn) {
        console.log('🔄 system_alarm_id 컬럼 추가 중...');
        await db.executeSql(`
          ALTER TABLE Alarm ADD COLUMN system_alarm_id INTEGER;
        `);
        console.log('✅ system_alarm_id 컬럼 추가 완료');
      } else {
        console.log('✅ system_alarm_id 컬럼 이미 존재함');
      }
      
    } catch (error) {
      console.error('❌ Alarm 테이블 마이그레이션 실패:', error);
      throw new Error(`Alarm 테이블 마이그레이션 실패: ${error.message}`);
    }
  }
}
