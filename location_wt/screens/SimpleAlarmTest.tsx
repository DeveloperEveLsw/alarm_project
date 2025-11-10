import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, TextInput } from 'react-native';
import { DatabaseService } from '../services/db/databaseService';

const SimpleAlarmTest = () => {
    const [testResult, setTestResult] = useState<string>('테스트를 실행해주세요.');
    const [alarmTitle, setAlarmTitle] = useState('테스트 알람');
    const [alarmTime, setAlarmTime] = useState('07:00');

    const testDirectAlarmCreation = async () => {
        try {
            setTestResult('🔄 직접 알람 생성 테스트 시작...');
            
            // 1. DB 연결
            const dbService = new DatabaseService('test_alarm.db');
            const db = await dbService.getDB();
            setTestResult('✅ DB 연결 성공');
            
            // 2. 테이블 생성
            await db.executeSql(`
                CREATE TABLE IF NOT EXISTS Alarm (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    time TEXT NOT NULL,
                    title TEXT NOT NULL,
                    is_system_alarm INTEGER DEFAULT 1,
                    system_alarm_id INTEGER,
                    dday_id INTEGER,
                    alarm_set_id INTEGER,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            `);
            setTestResult('✅ 테이블 생성 성공');
            
            // 3. 알람 데이터 삽입
            const [result] = await db.executeSql(
                `INSERT INTO Alarm (time, title, is_system_alarm, dday_id, alarm_set_id) 
                 VALUES (?, ?, ?, ?, ?)`,
                [alarmTime, alarmTitle, 1, null, null]
            );
            
            const alarmId = result.insertId;
            setTestResult(`✅ 알람 생성 성공! ID: ${alarmId}`);
            
            // 4. 생성된 알람 조회
            const [selectResult] = await db.executeSql('SELECT * FROM Alarm WHERE id = ?', [alarmId]);
            const alarm = selectResult.rows.item(0);
            
            setTestResult(`✅ 알람 조회 성공! 제목: ${alarm.title}, 시간: ${alarm.time}`);
            
        } catch (error) {
            setTestResult(`❌ 알람 생성 실패: ${error.message}`);
            console.error('알람 생성 테스트 오류:', error);
        }
    };

    const testServiceAlarmCreation = async () => {
        try {
            setTestResult('🔄 서비스 알람 생성 테스트 시작...');
            
            // 서비스 import
            const { alarmService, initializeDatabase } = await import('../services');
            
            // DB 초기화
            await initializeDatabase();
            setTestResult('✅ DB 초기화 성공');
            
            // 알람 생성
            const alarmId = await alarmService.createAlarm({
                time: alarmTime,
                title: alarmTitle,
                isSystemAlarm: false // OS 알람은 테스트하지 않음
            });
            
            setTestResult(`✅ 서비스 알람 생성 성공! ID: ${alarmId}`);
            
            // 알람 조회
            const alarms = await alarmService.getAllAlarms();
            setTestResult(`✅ 서비스 알람 조회 성공! 총 ${alarms.length}개`);
            
        } catch (error) {
            setTestResult(`❌ 서비스 알람 생성 실패: ${error.message}`);
            console.error('서비스 알람 생성 테스트 오류:', error);
        }
    };

    const clearTestData = async () => {
        try {
            setTestResult('🔄 테스트 데이터 삭제 중...');
            
            const dbService = new DatabaseService('test_alarm.db');
            const db = await dbService.getDB();
            
            await db.executeSql('DELETE FROM Alarm');
            setTestResult('✅ 테스트 데이터 삭제 완료');
            
        } catch (error) {
            setTestResult(`❌ 데이터 삭제 실패: ${error.message}`);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>🔧 알람 생성 테스트</Text>
            
            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="알람 제목"
                    value={alarmTitle}
                    onChangeText={setAlarmTitle}
                />
                <TextInput
                    style={styles.input}
                    placeholder="시간 (예: 07:00)"
                    value={alarmTime}
                    onChangeText={setAlarmTime}
                />
            </View>
            
            <View style={styles.resultContainer}>
                <Text style={styles.resultText}>{testResult}</Text>
            </View>

            <TouchableOpacity style={styles.testButton} onPress={testDirectAlarmCreation}>
                <Text style={styles.buttonText}>직접 DB 알람 생성</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.testButton} onPress={testServiceAlarmCreation}>
                <Text style={styles.buttonText}>서비스 알람 생성</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.clearButton} onPress={clearTestData}>
                <Text style={styles.buttonText}>테스트 데이터 삭제</Text>
            </TouchableOpacity>

            <TouchableOpacity 
                style={styles.resetButton} 
                onPress={() => setTestResult('테스트를 실행해주세요.')}
            >
                <Text style={styles.buttonText}>결과 초기화</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f5f5f5',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
        color: '#333',
    },
    inputContainer: {
        marginBottom: 20,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        marginBottom: 10,
        fontSize: 16,
        backgroundColor: 'white',
    },
    resultContainer: {
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 10,
        marginBottom: 20,
        minHeight: 100,
        justifyContent: 'center',
    },
    resultText: {
        fontSize: 14,
        color: '#333',
        textAlign: 'center',
    },
    testButton: {
        backgroundColor: '#2196f3',
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
        alignItems: 'center',
    },
    clearButton: {
        backgroundColor: '#ff9800',
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
        alignItems: 'center',
    },
    resetButton: {
        backgroundColor: '#f44336',
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
        alignItems: 'center',
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default SimpleAlarmTest;

