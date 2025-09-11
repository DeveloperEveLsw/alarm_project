import React, { useState, useRef } from 'react';
import { View, Text, TextInput, Button, StyleSheet, TouchableOpacity, Animated, Pressable } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Define the type for the route params
type ScheduleEditorScreenRouteProp = RouteProp<{ params: { date: string } }, 'params'>;

const ScheduleEditorScreen = () => {
  const route = useRoute<ScheduleEditorScreenRouteProp>();
  const { date } = route.params;

  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;


  
  const navigation = useNavigation();
  const toggleMenu = () => {
    const toValue = isExpanded ? 0 : 1;
    Animated.timing(animation, {
      toValue,
      duration: 200, // A bit faster animation
      useNativeDriver: false,
    }).start();
    setIsExpanded(!isExpanded);
  };

  const rotation = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  const menuStyle = {
    opacity: animation
  };

  return (
    <View style={styles.container}>
      {isExpanded && (
        <Pressable style={StyleSheet.absoluteFill} onPress={toggleMenu} />
      )}
      

      <View style={styles.fabContainer}>
        <Animated.View style={[styles.menuContainer, menuStyle]}>
          <TouchableOpacity style={[styles.menuItem, {marginLeft:20}]}>
            <Text style={styles.menuText} onPress={() =>{}}>할 일</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuText}>알람</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuText}>D-DAY</Text>
          </TouchableOpacity>
        </Animated.View>
        <TouchableOpacity style={styles.fab} onPress={toggleMenu} activeOpacity={0.8}>
          <Animated.Text style={[styles.fabIcon, { transform: [{ rotate: rotation }] }]}>+</Animated.Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
    position: 'relative'
  },
  fabContainer: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    alignItems: 'center',
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabIcon: {
    fontSize: 30,
    color: 'white',
  },
  menuContainer: {
    width: Dimensions.get("window").width -60,
    height:60,
    position: 'absolute',
    backgroundColor: 'white',
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    right: 0
  },
  menuItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  menuText: {
    fontSize: 16,
    color: '#333',
  },
});

export default ScheduleEditorScreen;