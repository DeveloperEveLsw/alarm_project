import SQLite, { SQLiteDatabase } from 'react-native-sqlite-storage';

SQLite.enablePromise(true);   // sqlite를 비동기로 사용

class DBManager {
  private static instance: SQLiteDatabase | null = null;  // sqlite 객체 담을 멤버변수

  static async getDB(): Promise<SQLiteDatabase> {         // sqlite 객체 리턴시키는 함수
    if (DBManager.instance) return DBManager.instance;    // sqlite 객체 생성되어있으면 걔를 리턴

    DBManager.instance = await SQLite.openDatabase({      // 안되어 있으면 생성함
      name: 'schedule.db',
      location: 'default',
    });

    return DBManager.instance;                            // 그리고 리턴
  }                                                       // 즉 언제나 하나의 객체만 가지고 걔만 리턴함(리턴 받은 애는 레퍼런스, 원본이 같음 포인터 같은 개념)

  static async closeDB() {
    if (DBManager.instance) {
      await DBManager.instance.close();
      DBManager.instance = null;
    }
  }
}