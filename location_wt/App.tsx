import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { NavigationContainer, RouteProp } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import HomeScreen from './screens/HomeScreen';
import CalendarScreen from './screens/CalendarScreen';
import SubScreenTwo from './screens/SubScreenTwo';
import ScheduleEditorScreen from './screens/ScheduleEditorScreen';
import CustomHeader from './Components/CustomHeader';
import TodoScreen from './screens/TodoScreen';
import AlarmScreen from './screens/AlarmScreen';
import DDayScreen from './screens/DDayScreen';
import TestAlarmScreen from './screens/TestAlarmScreen';
import DBTestScreen from './screens/DBTestScreen';
import DBConnectionTest from './screens/DBConnectionTest';
import SimpleAlarmTest from './screens/SimpleAlarmTest';
import AlarmTestScreen from './screens/AlarmTestScreen';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';

import { RootStackParamList } from './types/navigation.types';

dayjs.locale('ko');

const queryClient = new QueryClient();

function MainTap() {
  const Tab = createBottomTabNavigator();

  return (
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
      <Tab.Screen name="캘린더" component={CalendarScreen} />
      <Tab.Screen name="설정" component={SubScreenTwo} />
    </Tab.Navigator>
  );
}

type ScheduleEditorScreenOptionsProps = {
  route: RouteProp<RootStackParamList, 'ScheduleEditor'>;
  navigation: NativeStackNavigationProp<RootStackParamList, 'ScheduleEditor'>;
};

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  const Stack = createNativeStackNavigator<RootStackParamList>();

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1 }}>
          <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
          <NavigationContainer>
            <Stack.Navigator>
              <Stack.Screen name="Main" component={MainTap} options={{ headerShown: false }} />
              <Stack.Screen
                name="ScheduleEditor"
                component={ScheduleEditorScreen}
                options={({ route, navigation }: ScheduleEditorScreenOptionsProps) => ({
                  header: () => {
                    const title = dayjs(route.params.date).format('M월 D일(ddd)');
                    return <CustomHeader title={title} navigation={navigation} />;
                  },
                })}
              />
              <Stack.Screen name="Todo" component={TodoScreen} options={{ title: '할 일' }} />
              <Stack.Screen name="Alarm" component={AlarmScreen} options={{ title: '알람' }} />
              <Stack.Screen name="DDay" component={DDayScreen} options={{ title: 'D-DAY' }} />
              <Stack.Screen name="TestAlarm" component={TestAlarmScreen} options={{ title: '알람 테스트' }} />
              <Stack.Screen name="DBTest" component={DBTestScreen} options={{ title: 'DB 테스트' }} />
              <Stack.Screen name="DBConnectionTest" component={DBConnectionTest} options={{ title: 'DB 연결 테스트' }} />
              <Stack.Screen name="SimpleAlarmTest" component={SimpleAlarmTest} options={{ title: '알람 생성 테스트' }} />
              <Stack.Screen name="AlarmTest" component={AlarmTestScreen} options={{ title: '알람 울림 테스트' }} />
            </Stack.Navigator>
          </NavigationContainer>
        </SafeAreaView>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

export default App;
