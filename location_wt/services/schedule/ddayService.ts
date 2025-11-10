import { DatabaseService } from '../db/databaseService';
import { DDay, CreateDDayData } from '../types/database.types';

export class DDayService {
  private databaseService: DatabaseService;

  constructor(databaseService: DatabaseService) {
    this.databaseService = databaseService;
  }

  // D-Day 생성
  async createDDay(ddayData: CreateDDayData): Promise<number> {
    const db = await this.databaseService.getDB();
    
    const [result] = await db.executeSql(
      'INSERT INTO Dday (todo_id, target_date) VALUES (?, ?)',
      [ddayData.todoId, ddayData.targetDate]
    );

    return result.insertId;
  }

  // D-Day 조회
  async getDDay(ddayId: number): Promise<DDay | null> {
    const db = await this.databaseService.getDB();
    const [result] = await db.executeSql(
      'SELECT * FROM Dday WHERE id = ?',
      [ddayId]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows.item(0);
    return {
      id: row.id,
      todoId: row.todo_id,
      targetDate: row.target_date
    };
  }

  // 모든 D-Day 조회
  async getAllDDays(): Promise<DDay[]> {
    const db = await this.databaseService.getDB();
    const [result] = await db.executeSql('SELECT * FROM Dday ORDER BY target_date');

    const ddays: DDay[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows.item(i);
      ddays.push({
        id: row.id,
        todoId: row.todo_id,
        targetDate: row.target_date
      });
    }

    return ddays;
  }

  // D-Day 수정
  async updateDDay(ddayId: number, targetDate: string): Promise<void> {
    const db = await this.databaseService.getDB();
    
    await db.executeSql(
      'UPDATE Dday SET target_date = ? WHERE id = ?',
      [targetDate, ddayId]
    );
  }

  // D-Day 삭제
  async deleteDDay(ddayId: number): Promise<void> {
    const db = await this.databaseService.getDB();
    
    await db.executeSql('DELETE FROM Dday WHERE id = ?', [ddayId]);
  }

  // D-Day 계산
  calculateDDay(targetDate: string): number {
    const today = new Date();
    const target = new Date(targetDate);
    
    // 시간을 00:00:00으로 설정하여 날짜만 비교
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    
    const timeDiff = target.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    return daysDiff;
  }

  // D-Day 상태 확인
  getDDayStatus(daysLeft: number): { status: string; color: string; message: string } {
    if (daysLeft < 0) {
      return {
        status: 'overdue',
        color: '#f44336',
        message: `${Math.abs(daysLeft)}일 지났습니다`
      };
    } else if (daysLeft === 0) {
      return {
        status: 'today',
        color: '#ff9800',
        message: '오늘입니다!'
      };
    } else if (daysLeft <= 7) {
      return {
        status: 'urgent',
        color: '#ff5722',
        message: `${daysLeft}일 남았습니다`
      };
    } else {
      return {
        status: 'normal',
        color: '#2196f3',
        message: `${daysLeft}일 남았습니다`
      };
    }
  }

  // D-Day 알람 설정 (당일 오전 9시)
  async setDDayAlarm(targetDate: string, todoId: number, title: string): Promise<void> {
    const { AlarmService } = await import('../alarm/alarmService');
    const alarmService = new AlarmService(this.databaseService);
    
    const alarmTime = new Date(`${targetDate} 09:00`);
    const alarmId = await alarmService.createAlarm({
      time: '09:00',
      title: `D-Day: ${title}`,
      isSystemAlarm: true
    });

    // Todo에 알람 ID 연결
    const db = await this.databaseService.getDB();
    await db.executeSql(
      'UPDATE Todo SET alarm_id = ? WHERE id = ?',
      [alarmId, todoId]
    );
  }
}

