import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, TextInput } from 'react-native';
import { NativeModules } from 'react-native';

const AlarmTestScreen = () => {
  const [testTime, setTestTime] = useState('1'); // 1분 후
  const [testTitle, setTestTitle] = useState('테스트 알람');

  const testImmediateAlarm = async () => {
    try {
      const now = new Date();
      const alarmTime = new Date(now.getTime() + 10000); // 10초 후
      
      console.log('🕐 즉시 테스트 알람 설정:', {
        현재시간: now.toLocaleString(),
        알람시간: alarmTime.toLocaleString(),
        차이: alarmTime.getTime() - now.getTime() + 'ms'
      });

      if (NativeModules.AlarmModule) {
        await NativeModules.AlarmModule.setAlarm(
          alarmTime.getTime(),
          999, // 테스트용 ID
          '즉시 테스트 알람'
        );
        Alert.alert('성공', '10초 후 알람이 울립니다!');
      } else {
        Alert.alert('오류', 'AlarmModule을 찾을 수 없습니다.');
      }
    } catch (error) {
      console.error('❌ 즉시 알람 테스트 실패:', error);
      Alert.alert('오류', `알람 설정 실패: ${error.message}`);
    }
  };

  const testCustomAlarm = async () => {
    try {
      const minutes = parseInt(testTime) || 1;
      const now = new Date();
      const alarmTime = new Date(now.getTime() + minutes * 60 * 1000);
      
      console.log('🕐 사용자 정의 알람 설정:', {
        현재시간: now.toLocaleString(),
        알람시간: alarmTime.toLocaleString(),
        설정분: minutes + '분'
      });

      if (NativeModules.AlarmModule) {
        await NativeModules.AlarmModule.setAlarm(
          alarmTime.getTime(),
          998, // 테스트용 ID
          testTitle
        );
        Alert.alert('성공', `${minutes}분 후 "${testTitle}" 알람이 울립니다!`);
      } else {
        Alert.alert('오류', 'AlarmModule을 찾을 수 없습니다.');
      }
    } catch (error) {
      console.error('❌ 사용자 정의 알람 테스트 실패:', error);
      Alert.alert('오류', `알람 설정 실패: ${error.message}`);
    }
  };

  const testRepeatingAlarm = async () => {
    try {
      const now = new Date();
      const alarmTime = new Date(now.getTime() + 30000); // 30초 후
      
      console.log('🕐 반복 알람 테스트 설정:', {
        현재시간: now.toLocaleString(),
        알람시간: alarmTime.toLocaleString()
      });

      if (NativeModules.AlarmModule) {
        await NativeModules.AlarmModule.setRepeatingAlarm(
          alarmTime.getTime(),
          'daily',
          997, // 테스트용 ID
          '반복 테스트 알람'
        );
        Alert.alert('성공', '30초 후부터 매일 반복되는 알람이 설정되었습니다!');
      } else {
        Alert.alert('오류', 'AlarmModule을 찾을 수 없습니다.');
      }
    } catch (error) {
      console.error('❌ 반복 알람 테스트 실패:', error);
      Alert.alert('오류', `반복 알람 설정 실패: ${error.message}`);
    }
  };

  const cancelTestAlarms = async () => {
    try {
      if (NativeModules.AlarmModule) {
        await NativeModules.AlarmModule.cancelAlarm(999);
        await NativeModules.AlarmModule.cancelAlarm(998);
        await NativeModules.AlarmModule.cancelAlarm(997);
        Alert.alert('성공', '모든 테스트 알람이 취소되었습니다.');
      } else {
        Alert.alert('오류', 'AlarmModule을 찾을 수 없습니다.');
      }
    } catch (error) {
      console.error('❌ 알람 취소 실패:', error);
      Alert.alert('오류', `알람 취소 실패: ${error.message}`);
    }
  };

  const checkAlarmModule = () => {
    if (NativeModules.AlarmModule) {
      Alert.alert('확인', 'AlarmModule이 정상적으로 등록되어 있습니다.');
      console.log('✅ AlarmModule 상태:', NativeModules.AlarmModule);
    } else {
      Alert.alert('오류', 'AlarmModule을 찾을 수 없습니다.');
      console.log('❌ NativeModules:', NativeModules);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🚨 알람 테스트</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>즉시 테스트</Text>
        <TouchableOpacity style={styles.button} onPress={testImmediateAlarm}>
          <Text style={styles.buttonText}>10초 후 알람 (즉시 테스트)</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>사용자 정의 테스트</Text>
        <TextInput
          style={styles.input}
          placeholder="분 (예: 5)"
          value={testTime}
          onChangeText={setTestTime}
          keyboardType="numeric"
        />
        <TextInput
          style={styles.input}
          placeholder="알람 제목"
          value={testTitle}
          onChangeText={setTestTitle}
        />
        <TouchableOpacity style={styles.button} onPress={testCustomAlarm}>
          <Text style={styles.buttonText}>사용자 정의 알람 설정</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>반복 알람 테스트</Text>
        <TouchableOpacity style={styles.button} onPress={testRepeatingAlarm}>
          <Text style={styles.buttonText}>반복 알람 설정 (30초 후부터 매일)</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>관리</Text>
        <TouchableOpacity style={styles.cancelButton} onPress={cancelTestAlarms}>
          <Text style={styles.buttonText}>모든 테스트 알람 취소</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.checkButton} onPress={checkAlarmModule}>
          <Text style={styles.buttonText}>AlarmModule 상태 확인</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>📋 테스트 가이드</Text>
        <Text style={styles.infoText}>1. "10초 후 알람" 버튼으로 즉시 테스트</Text>
        <Text style={styles.infoText}>2. 사용자 정의로 원하는 시간 설정</Text>
        <Text style={styles.infoText}>3. 반복 알람으로 매일 울리는 알람 테스트</Text>
        <Text style={styles.infoText}>4. 알람이 울리면 알림이 표시됩니다</Text>
      </View>
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
  section: {
    marginBottom: 25,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333',
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
  button: {
    backgroundColor: '#2196f3',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  cancelButton: {
    backgroundColor: '#f44336',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  checkButton: {
    backgroundColor: '#4caf50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  infoSection: {
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#1976d2',
  },
  infoText: {
    fontSize: 14,
    color: '#1976d2',
    marginBottom: 5,
  },
});

export default AlarmTestScreen;

