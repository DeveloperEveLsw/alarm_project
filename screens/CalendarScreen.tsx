import React, { useCallback, useEffect, useState } from 'react';

import { Dimensions, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { CalendarList, DateData } from 'react-native-calendars';
import dayjs from 'dayjs';

import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { DBManager } from '../services/db/db';
import { RootStackParamList } from '../types/navigation.types';

type CalendarScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Main'>;

type CalendarTodo = {
  id: number;
  title: string;
  dueDate: string | null;
  isRepeating: boolean;
  repeatType: 'weekly' | 'monthly' | null;
  repeatWeekdays: number[] | null;
  repeatDayOfMonth: number | null;
};

const CalendarScreen: React.FC = () => {
  const [currentDateLabel, setCurrentDateLabel] = useState('2025년 9월');
  const [todos, setTodos] = useState<CalendarTodo[]>([]);

  const SCREEN_WIDTH = Dimensions.get('window').width;
  const SCREEN_HEIGHT = Dimensions.get('window').height;

  const navigation = useNavigation<CalendarScreenNavigationProp>();

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        const db = await DBManager.getDB();
        const [result] = await db.executeSql('SELECT * FROM Todo;');

        if (!isMounted) {
          return;
        }

        const parsed: CalendarTodo[] = [];

        for (let index = 0; index < result.rows.length; index += 1) {
          const row = result.rows.item(index);

          let repeatWeekdays: number[] | null = null;
          if (typeof row.repeat_weekday === 'string') {
            try {
              const parsedValue = JSON.parse(row.repeat_weekday);
              if (Array.isArray(parsedValue)) {
                repeatWeekdays = parsedValue
                  .map((value: unknown) => Number(value))
                  .filter(value => Number.isInteger(value) && value >= 0 && value <= 6);
              }
            } catch (error) {
              console.warn('Failed to parse repeat_weekday JSON', row.id, error);
            }
          }

          const repeatDayOfMonth =
            row.repeat_day_of_month !== null && row.repeat_day_of_month !== undefined
              ? Number(row.repeat_day_of_month)
              : null;

          const repeatTypeValue =
            typeof row.repeat_type === 'string' ? row.repeat_type : null;

          const repeatType: 'weekly' | 'monthly' | null =
            repeatTypeValue === 'weekly' || repeatTypeValue === 'monthly'
              ? repeatTypeValue
              : null;

          parsed.push({
            id: Number(row.id),
            title: typeof row.title === 'string' ? row.title : '',
            dueDate: typeof row.due_date === 'string' ? row.due_date : null,
            isRepeating: Number(row.is_repeating) === 1,
            repeatType,
            repeatWeekdays,
            repeatDayOfMonth,
          });
        }

        setTodos(parsed);
      } catch (error) {
        console.error('Failed to load todos for calendar', error);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleDayPress = useCallback(
    (dateString: string) => {
      navigation.navigate('ScheduleEditor', { date: dateString });
    },
    [navigation],
  );

  const getTodosForDate = useCallback(
    (targetDate: string) => {
      const targetDay = dayjs(targetDate);
      if (!targetDay.isValid()) {
        return [];
      }

      const weekday = targetDay.day();
      const dayOfMonth = targetDay.date();

      return todos.filter(todo => {
        if (todo.isRepeating) {
          if (todo.repeatType === 'weekly' && todo.repeatWeekdays) {
            return todo.repeatWeekdays.includes(weekday);
          }

          if (todo.repeatType === 'monthly' && todo.repeatDayOfMonth !== null) {
            return todo.repeatDayOfMonth === dayOfMonth;
          }

          return false;
        }

        return todo.dueDate === targetDate;
      });
    },
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
            '2025-03-03': { label: '대체휴일', color: '#1976d2' },
            '2025-03-14': { label: '화이트데이', color: '#e91e63' },
            '2025-03-29': { label: '가족날', color: '#388e3c' },
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
