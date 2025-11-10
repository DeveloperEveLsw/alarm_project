import { DatabaseService } from '../db/databaseService';
import { Alarm, CreateAlarmData } from '../types/database.types';

export class AlarmService {
  private databaseService: DatabaseService;

  constructor(databaseService: DatabaseService) {
    this.databaseService = databaseService;
  }

  // OS 알람 매니저에 알람 등록
  async setSystemAlarm(alarmTime: Date, alarmId: number, title: string): Promise<void> {
    try {
      // React Native에서 네이티브 모듈을 통해 OS 알람 매니저 호출
      const { NativeModules } = require('react-native');
      
      if (NativeModules.AlarmModule) {
        await NativeModules.AlarmModule.setAlarm(
          alarmTime.getTime(),
          alarmId,
          title
        );
        console.log(`✅ OS 알람 등록 완료: ${title} (${alarmTime.toLocaleString()})`);
      } else {
        console.warn('⚠️ AlarmModule이 없습니다. 네이티브 모듈을 구현해야 합니다.');
        throw new Error('AlarmModule이 등록되지 않았습니다.');
      }
    } catch (error) {
      console.error('❌ OS 알람 등록 실패:', error);
      throw error;
    }
  }

  // 반복 알람 설정
  async setRepeatingAlarm(
    alarmTime: Date, 
    repeatType: 'daily' | 'weekly' | 'monthly', 
    alarmId: number, 
    title: string
  ): Promise<void> {
    try {
      const { NativeModules } = require('react-native');
      
      if (NativeModules.AlarmModule) {
        await NativeModules.AlarmModule.setRepeatingAlarm(
          alarmTime.getTime(),
          repeatType,
          alarmId,
          title
        );
        console.log(`✅ 반복 알람 등록 완료: ${title} (${repeatType})`);
      } else {
        console.warn('⚠️ AlarmModule이 없습니다. 네이티브 모듈을 구현해야 합니다.');
        throw new Error('AlarmModule이 등록되지 않았습니다.');
      }
    } catch (error) {
      console.error('❌ 반복 알람 등록 실패:', error);
      throw error;
    }
  }

  // OS 알람 취소
  async cancelSystemAlarm(alarmId: number): Promise<void> {
    try {
      const { NativeModules } = require('react-native');
      
      if (NativeModules.AlarmModule) {
        await NativeModules.AlarmModule.cancelAlarm(alarmId);
        console.log(`✅ OS 알람 취소 완료: ${alarmId}`);
      } else {
        console.warn('⚠️ AlarmModule이 없습니다. 네이티브 모듈을 구현해야 합니다.');
        throw new Error('AlarmModule이 등록되지 않았습니다.');
      }
    } catch (error) {
      console.error('❌ OS 알람 취소 실패:', error);
      throw error;
    }
  }

  // DB에 알람 생성
  async createAlarm(alarmData: CreateAlarmData): Promise<number> {
    try {
      if (!this.databaseService) {
        throw new Error('DatabaseService가 초기화되지 않았습니다');
      }
      
      const db = await this.databaseService.getDB();
      if (!db) {
        throw new Error('DB 연결이 실패했습니다');
      }
      
      const [result] = await db.executeSql(
        `INSERT INTO Alarm (time, title, is_system_alarm, dday_id, alarm_set_id) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          alarmData.time,
          alarmData.title,
          alarmData.isSystemAlarm ? 1 : 0,
          alarmData.ddayId || null,
          alarmData.alarmSetId || null
        ]
      );

      const alarmId = result.insertId;
      
      // OS 알람 매니저에 등록
      if (alarmData.isSystemAlarm) {
        const now = new Date();
        const [hours, minutes] = alarmData.time.split(':').map(Number);
        const alarmTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
        
        // 과거 시간이면 다음 날로 설정
        if (alarmTime <= now) {
          alarmTime.setDate(alarmTime.getDate() + 1);
        }
        
        console.log('🕐 알람 시간 계산:', {
          입력시간: alarmData.time,
          계산된시간: alarmTime.toLocaleString(),
          현재시간: now.toLocaleString()
        });
        
        await this.setSystemAlarm(alarmTime, alarmId, alarmData.title);
      }

      return alarmId;
    } catch (error) {
      console.error('❌ 알람 생성 실패:', error);
      throw new Error(`알람 생성 실패: ${error.message}`);
    }
  }

  // 알람 조회
  async getAlarm(alarmId: number): Promise<Alarm | null> {
    if (!this.databaseService) {
      throw new Error('DatabaseService가 초기화되지 않았습니다');
    }
    
    const db = await this.databaseService.getDB();
    if (!db) {
      throw new Error('DB 연결이 실패했습니다');
    }
    const [result] = await db.executeSql(
      'SELECT * FROM Alarm WHERE id = ?',
      [alarmId]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows.item(0);
    return {
      id: row.id,
      time: row.time,
      title: row.title,
      isSystemAlarm: row.is_system_alarm === 1,
      systemAlarmId: row.system_alarm_id,
      ddayId: row.dday_id,
      alarmSetId: row.alarm_set_id,
      createdAt: row.created_at
    };
  }

  // 모든 알람 조회
  async getAllAlarms(): Promise<Alarm[]> {
    try {
      if (!this.databaseService) {
        throw new Error('DatabaseService가 초기화되지 않았습니다');
      }
      
      const db = await this.databaseService.getDB();
      if (!db) {
        throw new Error('DB 연결이 실패했습니다');
      }
      
      const [result] = await db.executeSql('SELECT * FROM Alarm ORDER BY time');

      const alarms: Alarm[] = [];
      for (let i = 0; i < result.rows.length; i++) {
        const row = result.rows.item(i);
        alarms.push({
          id: row.id,
          time: row.time,
          title: row.title,
          isSystemAlarm: row.is_system_alarm === 1,
          systemAlarmId: row.system_alarm_id,
          ddayId: row.dday_id,
          alarmSetId: row.alarm_set_id,
          createdAt: row.created_at
        });
      }

      return alarms;
    } catch (error) {
      console.error('❌ 알람 조회 실패:', error);
      throw new Error(`알람 조회 실패: ${error.message}`);
    }
  }

  // 알람 수정
  async updateAlarm(alarmId: number, alarmData: Partial<CreateAlarmData>): Promise<void> {
    if (!this.databaseService) {
      throw new Error('DatabaseService가 초기화되지 않았습니다');
    }
    
    const db = await this.databaseService.getDB();
    if (!db) {
      throw new Error('DB 연결이 실패했습니다');
    }
    
    // 기존 알람 정보 가져오기
    const existingAlarm = await this.getAlarm(alarmId);
    if (!existingAlarm) {
      throw new Error('알람을 찾을 수 없습니다.');
    }

    // OS 알람 취소 (기존)
    if (existingAlarm.isSystemAlarm) {
      await this.cancelSystemAlarm(alarmId);
    }

    // DB 업데이트
    await db.executeSql(
      `UPDATE Alarm SET 
       time = ?, title = ?, is_system_alarm = ?, dday_id = ?, alarm_set_id = ?
       WHERE id = ?`,
      [
        alarmData.time || existingAlarm.time,
        alarmData.title || existingAlarm.title,
        alarmData.isSystemAlarm ? 1 : 0,
        alarmData.ddayId || existingAlarm.ddayId,
        alarmData.alarmSetId || existingAlarm.alarmSetId,
        alarmId
      ]
    );

    // OS 알람 재등록
    if (alarmData.isSystemAlarm) {
      const alarmTime = new Date(`${new Date().toDateString()} ${alarmData.time || existingAlarm.time}`);
      await this.setSystemAlarm(alarmTime, alarmId, alarmData.title || existingAlarm.title);
    }
  }

  // 알람 삭제
  async deleteAlarm(alarmId: number): Promise<void> {
    try {
      if (!this.databaseService) {
        throw new Error('DatabaseService가 초기화되지 않았습니다');
      }
      
      const db = await this.databaseService.getDB();
      if (!db) {
        throw new Error('DB 연결이 실패했습니다');
      }
      
      // OS 알람 취소
      const alarm = await this.getAlarm(alarmId);
      if (alarm?.isSystemAlarm) {
        await this.cancelSystemAlarm(alarmId);
      }

      // DB에서 삭제
      await db.executeSql('DELETE FROM Alarm WHERE id = ?', [alarmId]);
    } catch (error) {
      console.error('❌ 알람 삭제 실패:', error);
      throw new Error(`알람 삭제 실패: ${error.message}`);
    }
  }
}
