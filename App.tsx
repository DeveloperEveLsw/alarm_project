import { StatusBar, useColorScheme } from 'react-native';
import {
  SafeAreaView,
  SafeAreaProvider
} from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { NavigationContainer, RouteProp } from '@react-navigation/native';
import HomeScreen from './screens/HomeScreen';
import CalendarScreen from './screens/CalendarScreen';
import SubScreenTwo from './screens/SubScreenTwo';
import ScheduleEditorScreen from './screens/ScheduleEditorScreen';
import CustomHeader from './Components/CustomHeader';
import TodoScreen from './screens/TodoScreen';
import AlarmScreen from './screens/AlarmScreen';
import DDayScreen from './screens/DDayScreen';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';

dayjs.locale('ko');

type RootStackParamList = {
  Main: undefined;
  ScheduleEditor: { date: string };
  Todo: undefined;
  Alarm: undefined;
  DDay: undefined;
};

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
      }}>
      <Tab.Screen name="알람" component={HomeScreen} />
      <Tab.Screen name="달력" component={CalendarScreen} />
      <Tab.Screen name="공유" component={SubScreenTwo} />
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
    <SafeAreaProvider>
      <SafeAreaView style={{flex:1}}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <NavigationContainer>
          <Stack.Navigator>
            <Stack.Screen name="Main" component={MainTap} options={{ headerShown: false }}/>
            <Stack.Screen 
              name="ScheduleEditor" 
              component={ScheduleEditorScreen} 
              options={({ route, navigation }: ScheduleEditorScreenOptionsProps) => ({
                header: () => {
                  const title = dayjs(route.params.date).format('M월 D일 (ddd)');
                  return <CustomHeader title={title} navigation={navigation} />;
                },
              })}
            />
            <Stack.Screen name="Todo" component={TodoScreen} options={{ title: '할 일' }} />
            <Stack.Screen name="Alarm" component={AlarmScreen} options={{ title: '알람' }} />
            <Stack.Screen name="DDay" component={DDayScreen} options={{ title: 'D-DAY' }} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaView >
    </SafeAreaProvider>
  );
}
export default App;