import SQLite, { SQLiteDatabase } from 'react-native-sqlite-storage';

SQLite.enablePromise(true);   // sqlite를 비동기로 사용

export class DBManager {
  private static instance: SQLiteDatabase | null = null;  // sqlite 객체 담을 멤버변수

  static async getDB(): Promise<SQLiteDatabase> {         // sqlite 객체 리턴시키는 함수
    if (DBManager.instance) return DBManager.instance;    // sqlite 객체 생성되어있으면 걔를 리턴

    DBManager.instance = await SQLite.openDatabase({      // 안되어 있으면 생성함
      name: 'schedule.db',
      location: 'default',
    });

    await DBManager.instance.executeSql('PRAGMA foreign_keys = ON;');

    return DBManager.instance;                            // 그리고 리턴
  }                                                       // 즉 언제나 하나의 객체만 가지고 걔만 리턴함(리턴 받은 애는 레퍼런스, 원본이 같음 포인터 같은 개념)

  static async closeDB() {
    if (DBManager.instance) {
      await DBManager.instance.close();
      DBManager.instance = null;
    }
  }

  static async initializeTables() {
    const db = await DBManager.getDB()
    const [result] = await db.executeSql(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='Todo';
      `)
    
    if (result.rows.length === 0 ) {
      console.log('📦 최초 실행: 테이블 생성 시작');

      await db.executeSql(`
        CREATE TABLE Todo (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT,

          due_date TEXT,
          due_time TEXT,

          is_repeating INTEGER DEFAULT 0,
          repeat_type TEXT,
          repeat_weekday TEXT,
          repeat_day_of_month INTEGER,

          dday_id INTEGER,
          alarm_id TEXT,
          alarm_set_id TEXT,

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
          id TEXT PRIMARY KEY,
          label TEXT NOT NULL DEFAULT '',
          default_sound TEXT NOT NULL DEFAULT '',
          default_mode TEXT NOT NULL DEFAULT 'normal'
        );
      `);

      await db.executeSql(`
        CREATE TABLE IF NOT EXISTS Alarm (
          id TEXT PRIMARY KEY,
          alarm_set_id TEXT,
          dday_id INTEGER,
          label TEXT NOT NULL DEFAULT '',
          hour INTEGER NOT NULL,
          minute INTEGER NOT NULL,
          repeat_days TEXT NOT NULL DEFAULT '[]',
          skip_holidays INTEGER NOT NULL DEFAULT 0,
          sound TEXT NOT NULL DEFAULT '',
          vibrate INTEGER NOT NULL DEFAULT 1,
          enabled INTEGER NOT NULL DEFAULT 1,
          next_trigger_at INTEGER,
          policy_mode TEXT NOT NULL DEFAULT 'normal',
          policy_payload TEXT,
          FOREIGN KEY (alarm_set_id) REFERENCES AlarmSet(id) ON DELETE SET NULL,
          FOREIGN KEY (dday_id) REFERENCES Dday(id) ON DELETE SET NULL
        );
      `);
    }
    else {
      console.log('✅ 테이블 이미 존재함');
      await ensureColumn(db, 'Alarm', 'next_trigger_at', 'INTEGER');
    }

  }
}

const ensureColumn = async (
  db: SQLiteDatabase,
  table: string,
  column: string,
  definition: string,
) => {
  const [info] = await db.executeSql(`PRAGMA table_info(${table});`);
  for (let index = 0; index < info.rows.length; index += 1) {
    const row = info.rows.item(index);
    if (row.name === column) {
      return;
    }
  }

  await db.executeSql(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition};`);
  console.log(`🔧 ${table}.${column} 컬럼을 추가했습니다.`);
};
