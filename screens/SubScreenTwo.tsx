import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, Button, ScrollView, SafeAreaView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { initializeDatabase } from '../services';
import { SQLiteDatabase } from 'react-native-sqlite-storage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation.types';

type SubScreenTwoNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Main'>;

const SubScreenTwo = () => {
  const navigation = useNavigation<SubScreenTwoNavigationProp>();
  const [db, setDb] = useState<SQLiteDatabase | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [tableData, setTableData] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(false);

  const TABLE_NAMES = ['Todo', 'Dday', 'AlarmSet', 'Alarm'];

  const addLog = (log: string) => {
    console.log(log);
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${log}`, ...prev]);
  };

  useEffect(() => {
    const connectToDb = async () => {
      try {
        // DB 인스턴스는 새로운 구조에서는 직접 접근하지 않음
        setDb(dbInstance);
        addLog('✅ DB Connected successfully.');
        await handleFetchAllData(dbInstance);
      } catch (e) {
        addLog(`❌ DB Connection failed: ${e}`);
      }
    };
    connectToDb();
  }, []);

  const handleInitialize = useCallback(async () => {
    if (!db) {
      addLog('⚠️ DB not connected.');
      return;
    }
    try {
      addLog('🚀 Initializing tables...');
      await initializeDatabase();
      addLog('✅ Tables initialized successfully.');
      await handleFetchAllData(db);
    } catch (e) {
      addLog(`❌ Table initialization failed: ${e}`);
    }
  }, [db]);

  const handleDropAllTables = useCallback(async () => {
    if (!db) {
      addLog('⚠️ DB not connected.');
      return;
    }
    setLoading(true);
    addLog('🗑️ Dropping all tables...');
    try {
      for (const tableName of TABLE_NAMES) {
        await db.executeSql(`DROP TABLE IF EXISTS ${tableName};`);
        addLog(`- Table '${tableName}' dropped.`);
      }
      addLog('✅ All tables dropped successfully.');
      setTableData({}); // Clear data from view
    } catch (e) {
      addLog(`❌ Failed to drop tables: ${e}`);
    } finally {
      setLoading(false);
    }
  }, [db]);

  const handleFetchAllData = useCallback(async (dbInstance: SQLiteDatabase) => {
    if (!dbInstance) {
      addLog('⚠️ DB not connected.');
      return;
    }
    setLoading(true);
    addLog('🔄 Fetching data from all tables...');
    const newData: Record<string, any[]> = {};
    try {
      for (const tableName of TABLE_NAMES) {
        const [result] = await dbInstance.executeSql(`SELECT * FROM ${tableName};`);
        const items: any[] = [];
        for (let i = 0; i < result.rows.length; i++) {
          items.push(result.rows.item(i));
        }
        newData[tableName] = items;
      }
      setTableData(newData);
      addLog('✅ Data fetched successfully.');
    } catch (e) {
      addLog(`❌ Failed to fetch data: ${e}`);
      // If a table doesn't exist, it will throw an error. Show empty data for it.
      setTableData(prev => ({ ...prev, ...newData }));
    } finally {
      setLoading(false);
    }
  }, []);


  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>SQLite Test Page</Text>
      
      <View style={styles.buttonContainer}>
        <Button title="Initialize DB" onPress={handleInitialize} />
        <Button title="Fetch & Refresh Data" onPress={() => handleFetchAllData(db!)} disabled={!db || loading} />
        <Button title="Drop All Tables" onPress={handleDropAllTables} color="red" disabled={!db || loading} />
      </View>


      {loading && <ActivityIndicator size="large" color="#0000ff" />} 

      <ScrollView style={styles.dataContainer} contentContainerStyle={{ paddingBottom: 20 }}>
        {TABLE_NAMES.map(tableName => {
          const data = tableData[tableName];
          const headers = data && data.length > 0 ? Object.keys(data[0]) : [];

          return (
            <View key={tableName} style={styles.tableContainer}>
              <Text style={styles.tableTitle}>{tableName} ({data?.length || 0})</Text>
              {data && data.length > 0 ? (
                <ScrollView horizontal>
                  <View>
                    {/* Header Row */}
                    <View style={styles.tableHeader}>
                      {headers.map(header => (
                        <Text key={header} style={styles.tableHeaderCell}>{header}</Text>
                      ))}
                    </View>
                    {/* Data Rows */}
                    {data.map((item, index) => (
                      <View key={index} style={styles.tableRow}>
                        {headers.map(header => (
                          <Text key={header} style={styles.tableCell}>
                            {String(item[header])}
                          </Text>
                        ))}
                      </View>
                    ))}
                  </View>
                </ScrollView>
              ) : (
                <Text style={styles.noDataText}>No data</Text>
              )}
            </View>
          )
        })}
      </ScrollView>

      <View style={styles.logContainer}>
        <Text style={styles.logHeader}>Logs</Text>
        <ScrollView style={styles.logScrollView}>
          {logs.map((log, index) => (
            <Text key={index} style={styles.logText}>{log}</Text>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 10,
        backgroundColor: '#f5f5f5',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 10,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 10,
    },
    dataContainer: {
        flex: 3,
        marginBottom: 10,
    },
    tableContainer: {
        marginBottom: 15,
        backgroundColor: 'white',
        padding: 10,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    tableTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#f0f0f0',
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
    },
    tableHeaderCell: {
        width: 120, // Fixed width for each column
        padding: 8,
        fontWeight: 'bold',
        fontSize: 12,
        textAlign: 'center',
        borderRightWidth: 1,
        borderRightColor: '#ddd',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    tableCell: {
        width: 120, // Fixed width for each column
        padding: 8,
        fontSize: 11,
        borderRightWidth: 1,
        borderRightColor: '#ddd',
    },
    noDataText: {
        textAlign: 'center',
        color: '#888',
        padding: 10,
    },
    logContainer: {
        flex: 1,
        borderTopWidth: 1,
        borderColor: '#ccc',
        paddingTop: 10,
    },
    logHeader: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    logScrollView: {
        flex: 1,
        backgroundColor: '#333',
        padding: 5,
        borderRadius: 5,
    },
    logText: {
        color: '#0f0',
        fontFamily: 'monospace',
        fontSize: 10,
    },
});


export default SubScreenTwo;