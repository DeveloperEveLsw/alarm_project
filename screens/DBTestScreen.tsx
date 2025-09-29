import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, ScrollView } from 'react-native';
import { initializeDatabase, alarmService, scheduleService } from '../services';
import { DatabaseService } from '../services/db/databaseService';

const DBTestScreen = () => {
    const [dbStatus, setDbStatus] = useState<string>('초기화 중...');
    const [testResults, setTestResults] = useState<string[]>([]);
    const [isConnected, setIsConnected] = useState<boolean>(false);

    const addResult = (message: string) => {
        setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    };

    // DB 연결 테스트
    const testDBConnection = async () => {
        try {
            addResult('🔄 DB 연결 테스트 시작...');
            
            const dbService = new DatabaseService('test.db');
            const db = await dbService.getDB();
            
            addResult('✅ DB 연결 성공');
            setIsConnected(true);
            setDbStatus('연결됨');
            
            // 간단한 쿼리 테스트
            const [result] = await db.executeSql('SELECT 1 as test');
            addResult(`✅ 쿼리 테스트 성공: ${result.rows.item(0).test}`);
            
        } catch (error) {
            addResult(`❌ DB 연결 실패: ${error.message}`);
            setIsConnected(false);
            setDbStatus('연결 실패');
        }
    };

    // 테이블 생성 테스트
    const testTableCreation = async () => {
        try {
            addResult('🔄 테이블 생성 테스트 시작...');
            
            await initializeDatabase();
            addResult('✅ 테이블 초기화 성공');
            
        } catch (error) {
            addResult(`❌ 테이블 생성 실패: ${error.message}`);
        }
    };

    // 알람 서비스 테스트
    const testAlarmService = async () => {
        try {
            addResult('🔄 알람 서비스 테스트 시작...');
            
            // 알람 생성 테스트
            const alarmId = await alarmService.createAlarm({
                time: '12:00',
                title: 'DB 테스트 알람',
                isSystemAlarm: false // OS 알람은 테스트하지 않음
            });
            
            addResult(`✅ 알람 생성 성공 (ID: ${alarmId})`);
            
            // 알람 조회 테스트
            const alarms = await alarmService.getAllAlarms();
            addResult(`✅ 알람 조회 성공 (${alarms.length}개)`);
            
            // 알람 삭제 테스트
            await alarmService.deleteAlarm(alarmId);
            addResult('✅ 알람 삭제 성공');
            
        } catch (error) {
            addResult(`❌ 알람 서비스 테스트 실패: ${error.message}`);
        }
    };

    // 일정 서비스 테스트
    const testScheduleService = async () => {
        try {
            addResult('🔄 일정 서비스 테스트 시작...');
            
            // 일정 조회 테스트
            const todos = await scheduleService.getAllTodos();
            addResult(`✅ 일정 조회 성공 (${todos.length}개)`);
            
        } catch (error) {
            addResult(`❌ 일정 서비스 테스트 실패: ${error.message}`);
        }
    };

    // 전체 테스트 실행
    const runAllTests = async () => {
        setTestResults([]);
        addResult('🚀 전체 DB 테스트 시작');
        
        await testDBConnection();
        await testTableCreation();
        await testAlarmService();
        await testScheduleService();
        
        addResult('🏁 전체 테스트 완료');
    };

    // 결과 초기화
    const clearResults = () => {
        setTestResults([]);
        setDbStatus('초기화 중...');
        setIsConnected(false);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>🔧 DB 연결 테스트</Text>
            
            <View style={styles.statusContainer}>
                <Text style={styles.statusTitle}>DB 상태:</Text>
                <Text style={[styles.statusText, { color: isConnected ? '#4caf50' : '#f44336' }]}>
                    {dbStatus}
                </Text>
            </View>

            <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.testButton} onPress={testDBConnection}>
                    <Text style={styles.buttonText}>DB 연결 테스트</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.testButton} onPress={testTableCreation}>
                    <Text style={styles.buttonText}>테이블 생성 테스트</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.testButton} onPress={testAlarmService}>
                    <Text style={styles.buttonText}>알람 서비스 테스트</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.testButton} onPress={testScheduleService}>
                    <Text style={styles.buttonText}>일정 서비스 테스트</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.runAllButton} onPress={runAllTests}>
                    <Text style={styles.buttonText}>전체 테스트 실행</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.clearButton} onPress={clearResults}>
                    <Text style={styles.buttonText}>결과 초기화</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.resultsContainer}>
                <Text style={styles.resultsTitle}>테스트 결과:</Text>
                {testResults.length === 0 ? (
                    <Text style={styles.noResults}>테스트를 실행해주세요.</Text>
                ) : (
                    testResults.map((result, index) => (
                        <Text key={index} style={styles.resultText}>
                            {result}
                        </Text>
                    ))
                )}
            </ScrollView>
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
    statusContainer: {
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 10,
        marginBottom: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statusTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    statusText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    buttonContainer: {
        marginBottom: 20,
    },
    testButton: {
        backgroundColor: '#2196f3',
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
        alignItems: 'center',
    },
    runAllButton: {
        backgroundColor: '#4caf50',
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
        alignItems: 'center',
    },
    clearButton: {
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
    resultsContainer: {
        flex: 1,
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 15,
    },
    resultsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#333',
    },
    noResults: {
        fontSize: 14,
        color: '#666',
        fontStyle: 'italic',
    },
    resultText: {
        fontSize: 12,
        marginBottom: 5,
        color: '#333',
        fontFamily: 'monospace',
    },
});

export default DBTestScreen;

