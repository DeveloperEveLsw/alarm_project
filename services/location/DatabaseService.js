import SQLite from 'react-native-sqlite-storage';

// SQLite 디버그 모드 활성화
SQLite.DEBUG(true);
SQLite.enablePromise(true);

class DatabaseService {
  constructor() {
    this.database = null;
    this.databaseName = 'alarm_app.db';
    this.databaseVersion = '1.0';
    this.databaseDisplayName = 'Alarm App Database';
    this.databaseSize = 200000;
  }

  /**
   * 데이터베이스 초기화 및 연결
   */
  async initializeDatabase() {
    try {
      console.log('🔧 SQLite 데이터베이스 초기화 시작...');
      
      this.database = await SQLite.openDatabase(
        this.databaseName,
        this.databaseVersion,
        this.databaseDisplayName,
        this.databaseSize
      );
      
      console.log('✅ 데이터베이스 연결 성공');
      
      // 테이블 생성
      await this.createTables();
      await this.insertDefaultSettings();
      
      console.log('✅ 데이터베이스 초기화 완료');
      return true;
    } catch (error) {
      console.error('❌ 데이터베이스 초기화 실패:', error);
      throw error;
    }
  }

  /**
   * 테이블 생성
   */
  async createTables() {
    const tables = [
      // 1. 알람 테이블
      `CREATE TABLE IF NOT EXISTS alarms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        time TEXT NOT NULL,
        is_enabled BOOLEAN DEFAULT 1,
        days_of_week TEXT DEFAULT '1234567',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // 2. 여행 테이블
      `CREATE TABLE IF NOT EXISTS trips (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        start_location_name TEXT NOT NULL,
        start_lat REAL NOT NULL,
        start_lng REAL NOT NULL,
        end_location_name TEXT NOT NULL,
        end_lat REAL NOT NULL,
        end_lng REAL NOT NULL,
        estimated_time INTEGER,
        status TEXT DEFAULT 'planned',
        start_time DATETIME,
        end_time DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // 3. 지오펜스 테이블
      `CREATE TABLE IF NOT EXISTS geofences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trip_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        radius INTEGER DEFAULT 100,
        action TEXT NOT NULL,
        message TEXT,
        is_triggered BOOLEAN DEFAULT 0,
        triggered_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE
      )`,
      
      // 4. 정류장 테이블
      `CREATE TABLE IF NOT EXISTS stations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        station_id TEXT UNIQUE NOT NULL,
        station_name TEXT NOT NULL,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        district TEXT,
        usage_count INTEGER DEFAULT 0,
        last_used DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // 5. 사용자 설정 테이블
      `CREATE TABLE IF NOT EXISTS user_settings (
        id INTEGER PRIMARY KEY,
        key TEXT UNIQUE NOT NULL,
        value TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status)',
      'CREATE INDEX IF NOT EXISTS idx_geofences_trip ON geofences(trip_id)',
      'CREATE INDEX IF NOT EXISTS idx_stations_usage ON stations(usage_count DESC)'
    ];

    try {
      // 테이블 생성
      for (const sql of tables) {
        await this.database.executeSql(sql);
      }
      
      // 인덱스 생성
      for (const sql of indexes) {
        await this.database.executeSql(sql);
      }
      
      console.log('✅ 모든 테이블 생성 완료');
    } catch (error) {
      console.error('❌ 테이블 생성 실패:', error);
      throw error;
    }
  }

  /**
   * 기본 설정 삽입
   */
  async insertDefaultSettings() {
    const defaultSettings = [
      ['notification_enabled', 'true'],
      ['vibration_enabled', 'true'],
      ['sound_enabled', 'true'],
      ['default_geofence_radius', '100'],
      ['location_update_interval', '5000'],
      ['demo_mode', 'true']
    ];

    try {
      for (const [key, value] of defaultSettings) {
        await this.database.executeSql(
          'INSERT OR IGNORE INTO user_settings (key, value) VALUES (?, ?)',
          [key, value]
        );
      }
      console.log('✅ 기본 설정 삽입 완료');
    } catch (error) {
      console.error('❌ 기본 설정 삽입 실패:', error);
    }
  }

  // ========== 여행 관련 메서드 ==========

  /**
   * 새 여행 생성
   */
  async createTrip(tripData) {
    try {
      const {
        startLocationName, startLat, startLng,
        endLocationName, endLat, endLng,
        estimatedTime
      } = tripData;

      const result = await this.database.executeSql(
        `INSERT INTO trips (
          start_location_name, start_lat, start_lng,
          end_location_name, end_lat, end_lng,
          estimated_time, status, start_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', datetime('now'))`,
        [startLocationName, startLat, startLng, endLocationName, endLat, endLng, estimatedTime]
      );

      const tripId = result[0].insertId;
      console.log(`✅ 새 여행 생성 완료 (ID: ${tripId})`);
      return tripId;
    } catch (error) {
      console.error('❌ 여행 생성 실패:', error);
      throw error;
    }
  }

  /**
   * 활성 여행 조회
   */
  async getActiveTrip() {
    try {
      const result = await this.database.executeSql(
        "SELECT * FROM trips WHERE status = 'active' ORDER BY start_time DESC LIMIT 1"
      );

      if (result[0].rows.length > 0) {
        return result[0].rows.item(0);
      }
      return null;
    } catch (error) {
      console.error('❌ 활성 여행 조회 실패:', error);
      return null;
    }
  }

  /**
   * 여행 상태 업데이트
   */
  async updateTripStatus(tripId, status) {
    try {
      await this.database.executeSql(
        'UPDATE trips SET status = ?, updated_at = datetime("now") WHERE id = ?',
        [status, tripId]
      );
      
      if (status === 'completed') {
        await this.database.executeSql(
          'UPDATE trips SET end_time = datetime("now") WHERE id = ?',
          [tripId]
        );
      }
      
      console.log(`✅ 여행 상태 업데이트: ${status}`);
    } catch (error) {
      console.error('❌ 여행 상태 업데이트 실패:', error);
      throw error;
    }
  }

  // ========== 지오펜스 관련 메서드 ==========

  /**
   * 지오펜스 생성
   */
  async createGeofence(geofenceData) {
    try {
      const {
        tripId, name, lat, lng, radius = 100,
        action, message
      } = geofenceData;

      const result = await this.database.executeSql(
        `INSERT INTO geofences (
          trip_id, name, lat, lng, radius, action, message
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [tripId, name, lat, lng, radius, action, message]
      );

      const geofenceId = result[0].insertId;
      console.log(`✅ 지오펜스 생성 완료 (ID: ${geofenceId})`);
      return geofenceId;
    } catch (error) {
      console.error('❌ 지오펜스 생성 실패:', error);
      throw error;
    }
  }

  /**
   * 여행의 지오펜스 목록 조회
   */
  async getGeofencesByTrip(tripId) {
    try {
      const result = await this.database.executeSql(
        'SELECT * FROM geofences WHERE trip_id = ? ORDER BY created_at',
        [tripId]
      );

      const geofences = [];
      for (let i = 0; i < result[0].rows.length; i++) {
        geofences.push(result[0].rows.item(i));
      }

      return geofences;
    } catch (error) {
      console.error('❌ 지오펜스 조회 실패:', error);
      return [];
    }
  }

  /**
   * 지오펜스 발생 처리
   */
  async triggerGeofence(geofenceId) {
    try {
      await this.database.executeSql(
        'UPDATE geofences SET is_triggered = 1, triggered_at = datetime("now") WHERE id = ?',
        [geofenceId]
      );
      console.log(`✅ 지오펜스 발생 처리 완료 (ID: ${geofenceId})`);
    } catch (error) {
      console.error('❌ 지오펜스 발생 처리 실패:', error);
      throw error;
    }
  }

  // ========== 정류장 관련 메서드 ==========

  /**
   * 정류장 정보 저장/업데이트
   */
  async saveStation(stationData) {
    try {
      const { stationId, stationName, lat, lng, district } = stationData;

      await this.database.executeSql(
        `INSERT OR REPLACE INTO stations (
          station_id, station_name, lat, lng, district, usage_count, last_used
        ) VALUES (
          ?, ?, ?, ?, ?, 
          COALESCE((SELECT usage_count FROM stations WHERE station_id = ?), 0) + 1,
          datetime('now')
        )`,
        [stationId, stationName, lat, lng, district, stationId]
      );

      console.log(`✅ 정류장 정보 저장 완료: ${stationName}`);
    } catch (error) {
      console.error('❌ 정류장 정보 저장 실패:', error);
      throw error;
    }
  }

  /**
   * 자주 이용하는 정류장 조회
   */
  async getFavoriteStations(limit = 10) {
    try {
      const result = await this.database.executeSql(
        'SELECT * FROM stations WHERE usage_count > 0 ORDER BY usage_count DESC, last_used DESC LIMIT ?',
        [limit]
      );

      const stations = [];
      for (let i = 0; i < result[0].rows.length; i++) {
        stations.push(result[0].rows.item(i));
      }

      return stations;
    } catch (error) {
      console.error('❌ 자주 이용하는 정류장 조회 실패:', error);
      return [];
    }
  }

  // ========== 설정 관련 메서드 ==========

  /**
   * 설정 값 조회
   */
  async getSetting(key) {
    try {
      const result = await this.database.executeSql(
        'SELECT value FROM user_settings WHERE key = ?',
        [key]
      );

      if (result[0].rows.length > 0) {
        return result[0].rows.item(0).value;
      }
      return null;
    } catch (error) {
      console.error('❌ 설정 조회 실패:', error);
      return null;
    }
  }

  /**
   * 설정 값 저장
   */
  async setSetting(key, value) {
    try {
      await this.database.executeSql(
        'INSERT OR REPLACE INTO user_settings (key, value, updated_at) VALUES (?, ?, datetime("now"))',
        [key, value]
      );
      console.log(`✅ 설정 저장 완료: ${key} = ${value}`);
    } catch (error) {
      console.error('❌ 설정 저장 실패:', error);
      throw error;
    }
  }

  // ========== 유틸리티 메서드 ==========

  /**
   * 데이터베이스 상태 조회
   */
  async getDatabaseStats() {
    try {
      const queries = [
        { name: 'trips', sql: 'SELECT COUNT(*) as count FROM trips' },
        { name: 'geofences', sql: 'SELECT COUNT(*) as count FROM geofences' },
        { name: 'stations', sql: 'SELECT COUNT(*) as count FROM stations' },
        { name: 'active_trips', sql: "SELECT COUNT(*) as count FROM trips WHERE status = 'active'" }
      ];

      const stats = {};
      for (const query of queries) {
        const result = await this.database.executeSql(query.sql);
        stats[query.name] = result[0].rows.item(0).count;
      }

      return stats;
    } catch (error) {
      console.error('❌ 데이터베이스 상태 조회 실패:', error);
      return {};
    }
  }

  /**
   * 데이터베이스 정리 (오래된 데이터 삭제)
   */
  async cleanupDatabase() {
    try {
      // 30일 이전의 완료된 여행 삭제
      await this.database.executeSql(
        "DELETE FROM trips WHERE status = 'completed' AND created_at < datetime('now', '-30 days')"
      );

      // 발생한 지오펜스 중 30일 이전 데이터 삭제
      await this.database.executeSql(
        "DELETE FROM geofences WHERE is_triggered = 1 AND triggered_at < datetime('now', '-30 days')"
      );

      console.log('✅ 데이터베이스 정리 완료');
    } catch (error) {
      console.error('❌ 데이터베이스 정리 실패:', error);
    }
  }

  /**
   * 데이터베이스 연결 종료
   */
  async closeDatabase() {
    try {
      if (this.database) {
        await this.database.close();
        this.database = null;
        console.log('✅ 데이터베이스 연결 종료');
      }
    } catch (error) {
      console.error('❌ 데이터베이스 연결 종료 실패:', error);
    }
  }
}

// 싱글톤 패턴 적용
export default new DatabaseService();
