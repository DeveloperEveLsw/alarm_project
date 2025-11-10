import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { DatabaseService } from '../services/db/databaseService';

const DBConnectionTest = () => {
    const [testResult, setTestResult] = useState<string>('테스트를 실행해주세요.');

    const testDirectConnection = async () => {
        try {
            setTestResult('🔄 직접 DB 연결 테스트 시작...');
            
            const dbService = new DatabaseService('test_connection.db');
            const db = await dbService.getDB();
            
            if (!db) {
                throw new Error('DB 객체가 null입니다');
            }
            
            setTestResult('✅ DB 연결 성공!');
            
            // 간단한 쿼리 테스트
            const [result] = await db.executeSql('SELECT 1 as test_value');
            const testValue = result.rows.item(0).test_value;
            
            setTestResult(`✅ DB 연결 및 쿼리 성공! 테스트 값: ${testValue}`);
            
        } catch (error) {
            setTestResult(`❌ DB 연결 실패: ${error.message}`);
            console.error('DB 연결 테스트 오류:', error);
        }
    };

    const testTableCreation = async () => {
        try {
            setTestResult('🔄 테이블 생성 테스트 시작...');
            
            const dbService = new DatabaseService('test_table.db');
            const db = await dbService.getDB();
            
            // 테스트 테이블 생성
            await db.executeSql(`
                CREATE TABLE IF NOT EXISTS test_table (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL
                )
            `);
            
            // 데이터 삽입
            await db.executeSql('INSERT INTO test_table (name) VALUES (?)', ['테스트 데이터']);
            
            // 데이터 조회
            const [result] = await db.executeSql('SELECT * FROM test_table');
            const count = result.rows.length;
            
            setTestResult(`✅ 테이블 생성 및 데이터 조작 성공! 레코드 수: ${count}`);
            
        } catch (error) {
            setTestResult(`❌ 테이블 생성 실패: ${error.message}`);
            console.error('테이블 생성 테스트 오류:', error);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>🔧 DB 연결 직접 테스트</Text>
            
            <View style={styles.resultContainer}>
                <Text style={styles.resultText}>{testResult}</Text>
            </View>

            <TouchableOpacity style={styles.testButton} onPress={testDirectConnection}>
                <Text style={styles.buttonText}>DB 연결 테스트</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.testButton} onPress={testTableCreation}>
                <Text style={styles.buttonText}>테이블 생성 테스트</Text>
            </TouchableOpacity>

            <TouchableOpacity 
                style={styles.clearButton} 
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

export default DBConnectionTest;
