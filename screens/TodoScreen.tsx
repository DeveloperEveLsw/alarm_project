import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const TodoScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>할 일 (Todo) 스크린</Text>
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

export default TodoScreen;
