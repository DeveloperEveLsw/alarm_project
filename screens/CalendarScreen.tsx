import React, { useCallback, useState } from 'react';

import { Dimensions, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { CalendarList, DateData } from 'react-native-calendars';
import dayjs from 'dayjs';

import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';

import { RootStackParamList } from '../types/navigation.types';
import { todoService } from '../services/todoService';
import type { ScheduleTodo } from '../types/todo.types';

type CalendarScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Main'>;

const CalendarScreen: React.FC = () => {
  const [currentDateLabel, setCurrentDateLabel] = useState('2025년 9월');
  const { data: todos = [] } = useQuery<ScheduleTodo[]>({
    queryKey: ['todos', 'all'],
    queryFn: todoService.getAllTodos,
  });

  const SCREEN_WIDTH = Dimensions.get('window').width;
  const SCREEN_HEIGHT = Dimensions.get('window').height;

  const navigation = useNavigation<CalendarScreenNavigationProp>();

  const handleDayPress = useCallback(
    (dateString: string) => {
      navigation.navigate('ScheduleEditor', { date: dateString });
    },
    [navigation],
  );

  const getTodosForDate = useCallback(
    (targetDate: string) => todoService.filterTodosByDate(todos, targetDate),
    [todos],
  );

  return (
    <View>
      <View>
        <Text>{currentDateLabel}</Text>
      </View>
      <CalendarList
        renderHeader={() => <View />}
        horizontal
        pagingEnabled
        calendarWidth={SCREEN_WIDTH}
        onVisibleMonthsChange={(date: DateData[]) => {
          if (date[0]) {
            setCurrentDateLabel(`${date[0].year}년 ${date[0].month}월`);
          }
        }}
        hideExtraDays={false}
        style={{
          padding: 0,
          margin: 0,
          borderWidth: 0,
        }}
        theme={{}}
        dayComponent={({ date, state }) => {
          const dateStr = date?.dateString;

          const holidayMap: Record<
            string,
            {
              label: string;
              color: string;
            }
          > = {
            '2025-03-01': { label: '삼일절', color: '#d32f2f' },
            '2025-03-03': { label: '쉬는날', color: '#1976d2' },
            '2025-03-14': { label: '화이트데이', color: '#e91e63' },
            '2025-03-29': { label: '가상의날', color: '#388e3c' },
          };

          const holiday = dateStr ? holidayMap[dateStr] : undefined;

          const dayOfWeek = dateStr ? dayjs(dateStr).day() : 0;

          let textColor = '#000';
          if (dayOfWeek === 0) textColor = '#d32f2f';
          if (dayOfWeek === 6) textColor = '#1976d2';

          const todosForDate = dateStr ? getTodosForDate(dateStr) : [];

          return (
            <TouchableOpacity
              disabled={state === 'disabled'}
              onPress={() => date && handleDayPress(date.dateString)}
            >
              <View
                style={{
                  width: SCREEN_WIDTH / 7,
                  height: SCREEN_HEIGHT / 6 - 10,
                  justifyContent: 'flex-start',
                  alignItems: 'center',
                  borderColor: '#bebebe',
                  borderStyle: 'solid',
                  borderTopWidth: 1,
                  paddingHorizontal: 2,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    color: textColor,
                    opacity: state === 'disabled' ? 0.3 : 1,
                    fontWeight: holiday ? 'bold' : 'normal',
                    paddingTop: 3,
                  }}
                >
                  {date?.day}
                </Text>
                {holiday && (
                  <Text
                    style={{
                      fontSize: 10,
                      color: holiday.color,
                      marginTop: 2,
                    }}
                  >
                    {holiday.label}
                  </Text>
                )}
                {todosForDate.map(todo => (
                  <Text
                    key={`${todo.id}-${dateStr}`}
                    numberOfLines={1}
                    style={{
                      marginTop: 2,
                      fontSize: 10,
                      color: '#424242',
                    }}
                  >
                    - {todo.title}
                  </Text>
                ))}
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
};

export default CalendarScreen;
