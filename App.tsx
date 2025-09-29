import React, { useEffect, useRef } from 'react';
import { Platform, StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { NavigationContainer, RouteProp, createNavigationContainerRef } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';

import HomeScreen from './screens/HomeScreen';
import CalendarScreen from './screens/CalendarScreen';
import SubScreenTwo from './screens/SubScreenTwo';
import ScheduleEditorScreen from './screens/ScheduleEditorScreen';
import CustomHeader from './Components/CustomHeader';
import TodoScreen from './screens/TodoScreen';
import AlarmScreen from './screens/AlarmScreen';
import DDayScreen from './screens/DDayScreen';
import AlarmPermissionsScreen from './screens/AlarmPermissionsScreen';
import AlarmMathScreen from './screens/AlarmMathScreen';
import AlarmShakeScreen from './screens/AlarmShakeScreen';
import { AlarmEngine } from './alarm/engine';
import { useAlarmPermissionsStore } from './stores/alarmPermissionsStore';
import { RootStackParamList } from './types/navigation.types';

dayjs.locale('ko');

const queryClient = new QueryClient();
const navigationRef = createNavigationContainerRef<RootStackParamList>();

function MainTab() {
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
      <Tab.Screen name="일정" component={SubScreenTwo} />
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
  const hydratePermissions = useAlarmPermissionsStore(state => state.hydratePermissions);
  const hasHydratedPermissions = useRef(false);

  useEffect(() => {
    if (hasHydratedPermissions.current) return;
    hasHydratedPermissions.current = true;
    hydratePermissions().catch(error => {
      console.warn('[Permissions] hydrate failed', error);
    });
  }, [hydratePermissions]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const unsubscribe = AlarmEngine.addListener(async event => {
      if (!navigationRef.isReady()) {
        return;
      }

      switch (event.type) {
        case 'FIRED': {
          await AlarmEngine.send({ type: 'RING_NATIVE', id: event.id, fullScreen: true }).catch(console.error);
          const mode = event.ctx.policy.mode;
          if (mode === 'math') {
            navigationRef.navigate('AlarmMath', { alarmId: event.id, seed: Date.now() });
          } else if (mode === 'shake') {
            navigationRef.navigate('AlarmShake', { alarmId: event.id, targetShakes: 20 });
          } else {
            navigationRef.navigate('Alarm', { alarmId: event.id });
          }
          break;
        }
        case 'ERROR':
          console.warn(`[AlarmEngine] ${event.code}: ${event.message}`);
          break;
        default:
          break;
      }
    });

    return unsubscribe;
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1 }}>
          <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
          <NavigationContainer ref={navigationRef}>
            <Stack.Navigator>
              <Stack.Screen name="Main" component={MainTab} options={{ headerShown: false }} />
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
              <Stack.Screen name="AlarmPermissions" component={AlarmPermissionsScreen} options={{ title: '알람 권한 안내' }} />
              <Stack.Screen
                name="AlarmMath"
                component={AlarmMathScreen}
                options={{ headerShown: false, presentation: 'fullScreenModal' }}
              />
              <Stack.Screen
                name="AlarmShake"
                component={AlarmShakeScreen}
                options={{ headerShown: false, presentation: 'fullScreenModal' }}
              />
            </Stack.Navigator>
          </NavigationContainer>
        </SafeAreaView>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

export default App;
