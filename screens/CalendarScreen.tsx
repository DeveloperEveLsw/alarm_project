import React from 'react'
import { useState, useRef} from 'react'
import { StatusBar, StyleSheet, useColorScheme, View, Text, FlatList, TouchableOpacity} from 'react-native';
import { CalendarList, DateData } from 'react-native-calendars'
import { Dimensions } from 'react-native';
import dayjs from "dayjs"
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {RootStackParamList} from '../types/navigation.types'

type CalendarScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Main'>;


const CalendarScreen = () => {
  
  const [currentDate, setCurrentDate] = useState("2025년 9월")
  const SCREEN_WIDTH = Dimensions.get('window').width;
  const SCREEN_HEIGHT = Dimensions.get('window').height;
  
  const navigation = useNavigation<CalendarScreenNavigationProp>();

  const handleDayPress = (dateString: string) => {
    navigation.navigate('ScheduleEditor', { date: dateString });
  };

  return (
    <View>
      <View><Text>{currentDate}</Text></View>
        <CalendarList
          renderHeader={() => <View />}
          horizontal={true} // 가로 스크롤
          pagingEnabled={true} // 한 달씩 넘기기
          calendarWidth={SCREEN_WIDTH} // 달력 너비 (원하는 값으로 조절)
          onVisibleMonthsChange={(date:any)=>{setCurrentDate(date[0].year+'년 '+date[0].month+'월')}}
          hideExtraDays={false}
          style={{
            padding: 0,
            margin: 0,
            borderWidth: 0}}
          theme={{}}
          dayComponent={({ date, state }:{date?:DateData, state?:string})=> {
            const dateStr: string | undefined = date?.dateString; // '2025-03-01'
            const holidayMap: {[key:string]: { label: string; color: string }} = {
              '2025-03-01': { label: '삼일절', color: '#d32f2f' },
              '2025-03-03': { label: '대체공휴', color: '#1976d2' },
              '2025-03-14': { label: '화이트데이', color: '#e91e63' },
              '2025-03-29': { label: '식목일', color: '#388e3c' },
            };

            const holiday = dateStr ? holidayMap[dateStr] : undefined;
            

            const dayOfWeek = dayjs(date?.dateString).day(); // 0: 일요일, 6: 토요일
            let textColor = '#000'; // 기본 검정
            if (dayOfWeek === 0) textColor = '#d32f2f'; // 일요일 빨강
            if (dayOfWeek === 6) textColor = '#1976d2'; // 토요일 파랑

            return (
            <TouchableOpacity disabled={state === 'disabled'} onPress={() => date && handleDayPress(date.dateString)}>
              <View style={{
                width: SCREEN_WIDTH/7,
                height: SCREEN_HEIGHT/6-10,
                justifyContent: 'flex-start',
                alignItems: 'center',
                borderColor: '#bebebeff',
                borderStyle: "solid",
                borderTopWidth : 1
              }}>
                <Text style={{
                  fontSize: 16,
                  color: textColor,
                  opacity: state == "disabled" ? 0.3 : 1,
                  fontWeight: holiday ? 'bold' : 'normal',
                  paddingTop:3
                }}>
                  {date?.day}
                </Text>
                {holiday && (
                  <Text style={{
                    fontSize: 10,
                    color: holiday.color,
                    marginTop: 2,
                  }}>
                    {holiday.label}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          )}}
        >
      </CalendarList>
    </View>
  )
}

export default CalendarScreen