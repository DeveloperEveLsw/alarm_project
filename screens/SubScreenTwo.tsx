import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, Button, ScrollView, SafeAreaView, ActivityIndicator } from 'react-native';
import { databaseDebug, type DatabaseSnapshot } from '../services/db/localDatabase';

const SubScreenTwo = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [tableData, setTableData] = useState<DatabaseSnapshot | null>(null);
  const [loading, setLoading] = useState(false);

  const TABLE_NAMES: Array<keyof DatabaseSnapshot> = ['Todo', 'Dday', 'AlarmSet', 'Alarm'];

  const addLog = (log: string) => {
    console.log(log);
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${log}`, ...prev]);
  };

  const handleInitialize = useCallback(async () => {
    try {
      addLog('🚀 Opening Room database...');
      await databaseDebug.ensureInitialized();
      addLog('✅ Database ready.');
      await handleFetchAllData();
    } catch (e) {
      addLog(`❌ Table initialization failed: ${e}`);
    }
  }, [handleFetchAllData]);

  const handleDropAllTables = useCallback(async () => {
    setLoading(true);
    addLog('🧹 Clearing all tables (Room clearAllTables)...');
    try {
      await databaseDebug.clearAllTables();
      addLog('✅ All tables cleared.');
      setTableData({
        Todo: [],
        Dday: [],
        AlarmSet: [],
        Alarm: [],
      });
    } catch (e) {
      addLog(`❌ Failed to drop tables: ${e}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFetchAllData = useCallback(async () => {
    setLoading(true);
    addLog('🔄 Fetching data from Room database...');
    try {
      const snapshot = await databaseDebug.fetchSnapshot();
      setTableData(snapshot);
      addLog('✅ Data fetched successfully.');
    } catch (e) {
      addLog(`❌ Failed to fetch data: ${e}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const connectToDb = async () => {
      try {
        await databaseDebug.ensureInitialized();
        addLog('✅ Room database initialized.');
        await handleFetchAllData();
      } catch (e) {
        addLog(`❌ DB initialization failed: ${e}`);
      }
    };
    connectToDb();
  }, [handleFetchAllData]);


  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>SQLite Test Page</Text>
      
      <View style={styles.buttonContainer}>
        <Button title="Initialize DB" onPress={handleInitialize} />
        <Button title="Fetch & Refresh Data" onPress={handleFetchAllData} disabled={loading} />
        <Button title="Clear All Tables" onPress={handleDropAllTables} color="red" disabled={loading} />
      </View>

      {loading && <ActivityIndicator size="large" color="#0000ff" />} 

      <ScrollView style={styles.dataContainer} contentContainerStyle={{ paddingBottom: 20 }}>
        {TABLE_NAMES.map(tableName => {
          const data = tableData?.[tableName] ?? [];
          const headers = data.length > 0 ? Object.keys(data[0]) : [];

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
