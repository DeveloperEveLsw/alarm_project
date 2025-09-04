/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { StatusBar, StyleSheet, useColorScheme, View, Text } from 'react-native';
import {
  SafeAreaView,
  SafeAreaProvider
} from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { NavigationContainer } from '@react-navigation/native';
import HomeScreen from './screens/HomeScreen'
import SubScreenOne from './screens/SubScreenOne'
import SubScreenTwo from './screens/SubScreenTwo';
function App() {
  const isDarkMode = useColorScheme() === 'dark';

  const Tab = createBottomTabNavigator()
  
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{flex:1}}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <NavigationContainer>
          <Tab.Navigator
            screenOptions={{
              headerShown: false,
              tabBarStyle: {
                backgroundColor: '#fff',
                borderTopWidth: 1,
                borderTopColor: '#ccc',
                height: 60,
              },
              tabBarActiveTintColor: '#0091EA',
              tabBarInactiveTintColor: 'gray',
            }}
          >
            <Tab.Screen name="알람" component={HomeScreen} />
            <Tab.Screen name="달력" component={SubScreenOne} />
            <Tab.Screen name="공유" component={SubScreenTwo} />
          </Tab.Navigator>
        </NavigationContainer>
      </SafeAreaView >
    </SafeAreaProvider>
  );
}


export default App;
