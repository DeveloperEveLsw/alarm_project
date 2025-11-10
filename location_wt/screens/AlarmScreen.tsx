import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const AlarmScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>알람 (Alarm) 스크린</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});

export default AlarmScreen;
