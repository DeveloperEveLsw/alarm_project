import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { alarmService } from '../services';

const TestAlarmScreen = () => {
    const [testAlarmId, setTestAlarmId] = useState<number | null>(null);

    // 1분 후 알람 테스트
    const testAlarmIn1Minute = async () => {
        try {
            const now = new Date();
            const alarmTime = new Date(now.getTime() + 60 * 1000); // 1분 후
            
            const alarmId = await alarmService.createAlarm({
                time: alarmTime.toTimeString().slice(0, 5),
                title: '1분 후 테스트 알람',
                isSystemAlarm: true
            });
            
            setTestAlarmId(alarmId);
            Alert.alert('성공', `1분 후 알람이 설정되었습니다! (ID: ${alarmId})`);
        } catch (error) {
            Alert.alert('오류', `알람 설정 실패: ${error.message}`);
        }
    };

    // 5초 후 알람 테스트 (빠른 테스트용)
    const testAlarmIn5Seconds = async () => {
        try {
            const now = new Date();
            const alarmTime = new Date(now.getTime() + 5 * 1000); // 5초 후
            
            const alarmId = await alarmService.createAlarm({
                time: alarmTime.toTimeString().slice(0, 5),
                title: '5초 후 테스트 알람',
                isSystemAlarm: true
            });
            
            setTestAlarmId(alarmId);
            Alert.alert('성공', `5초 후 알람이 설정되었습니다! (ID: ${alarmId})`);
        } catch (error) {
            Alert.alert('오류', `알람 설정 실패: ${error.message}`);
        }
    };

    // 테스트 알람 취소
    const cancelTestAlarm = async () => {
        if (!testAlarmId) {
            Alert.alert('알림', '취소할 알람이 없습니다.');
            return;
        }

        try {
            await alarmService.deleteAlarm(testAlarmId);
            setTestAlarmId(null);
            Alert.alert('성공', '테스트 알람이 취소되었습니다.');
        } catch (error) {
            Alert.alert('오류', `알람 취소 실패: ${error.message}`);
        }
    };

    // 모든 알람 조회
    const showAllAlarms = async () => {
        try {
            const alarms = await alarmService.getAllAlarms();
            const alarmList = alarms.map(alarm => 
                `ID: ${alarm.id}, 제목: ${alarm.title}, 시간: ${alarm.time}, 활성: ${alarm.isSystemAlarm ? 'ON' : 'OFF'}`
            ).join('\n');
            
            Alert.alert('알람 목록', alarmList || '등록된 알람이 없습니다.');
        } catch (error) {
            Alert.alert('오류', `알람 목록 조회 실패: ${error.message}`);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>🧪 알람 테스트</Text>
            
            <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.testButton} onPress={testAlarmIn5Seconds}>
                    <Text style={styles.buttonText}>5초 후 알람 테스트</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.testButton} onPress={testAlarmIn1Minute}>
                    <Text style={styles.buttonText}>1분 후 알람 테스트</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.testButton, styles.cancelButton]} 
                    onPress={cancelTestAlarm}
                    disabled={!testAlarmId}
                >
                    <Text style={styles.buttonText}>
                        {testAlarmId ? `테스트 알람 취소 (ID: ${testAlarmId})` : '취소할 알람 없음'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.infoButton} onPress={showAllAlarms}>
                    <Text style={styles.buttonText}>모든 알람 조회</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.infoContainer}>
                <Text style={styles.infoTitle}>테스트 방법:</Text>
                <Text style={styles.infoText}>1. "5초 후 알람 테스트" 버튼을 누르세요</Text>
                <Text style={styles.infoText}>2. 앱을 백그라운드로 보내거나 종료하세요</Text>
                <Text style={styles.infoText}>3. 5초 후 알림이 울리는지 확인하세요</Text>
                <Text style={styles.infoText}>4. 알림을 탭하면 앱이 다시 열립니다</Text>
            </View>

            {testAlarmId && (
                <View style={styles.statusContainer}>
                    <Text style={styles.statusText}>
                        ✅ 테스트 알람 활성화됨 (ID: {testAlarmId})
                    </Text>
                </View>
            )}
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
        marginBottom: 30,
        color: '#333',
    },
    buttonContainer: {
        marginBottom: 30,
    },
    testButton: {
        backgroundColor: '#2196f3',
        padding: 15,
        borderRadius: 10,
        marginBottom: 15,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#f44336',
    },
    infoButton: {
        backgroundColor: '#4caf50',
        padding: 15,
        borderRadius: 10,
        marginBottom: 15,
        alignItems: 'center',
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    infoContainer: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 10,
        marginBottom: 20,
    },
    infoTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#333',
    },
    infoText: {
        fontSize: 14,
        marginBottom: 5,
        color: '#666',
    },
    statusContainer: {
        backgroundColor: '#e8f5e8',
        padding: 15,
        borderRadius: 10,
        borderLeftWidth: 4,
        borderLeftColor: '#4caf50',
    },
    statusText: {
        fontSize: 14,
        color: '#2e7d32',
        fontWeight: '600',
    },
});

export default TestAlarmScreen;
