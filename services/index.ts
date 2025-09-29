// 서비스 인스턴스들을 생성하고 관리하는 파일
import { DatabaseService } from './db/databaseService';
import { ScheduleService } from './schedule/scheduleService';
import { AlarmService } from './alarm/alarmService';
import { DDayService } from './schedule/ddayService';

// DB 서비스 인스턴스 생성
const scheduleDB = new DatabaseService('schedule.db');

// 비즈니스 로직 서비스 인스턴스 생성
export const scheduleService = new ScheduleService(scheduleDB);
export const alarmService = new AlarmService(scheduleDB);
export const ddayService = new DDayService(scheduleDB);

// 디버깅용 로그
console.log('🔧 서비스 인스턴스 생성 완료:');
console.log('- scheduleDB:', scheduleDB);
console.log('- alarmService:', alarmService);
console.log('- alarmService.databaseService:', (alarmService as any).databaseService);

// DB 초기화
export const initializeDatabase = async () => {
  try {
    console.log('🔄 서비스 레벨 DB 초기화 시작');
    await scheduleDB.initializeTables();
    console.log('✅ 서비스 레벨 데이터베이스 초기화 완료');
  } catch (error) {
    console.error('❌ 서비스 레벨 데이터베이스 초기화 실패:', error);
    throw error;
  }
};

// DB 연결 종료
export const closeDatabase = async () => {
  try {
    await scheduleDB.closeDB();
    console.log('✅ 데이터베이스 연결 종료');
  } catch (error) {
    console.error('❌ 데이터베이스 연결 종료 실패:', error);
  }
};
