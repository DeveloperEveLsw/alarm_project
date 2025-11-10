import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const DDayScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>D-DAY 스크린</Text>
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

export default DDayScreen;
