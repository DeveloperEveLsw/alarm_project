import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { ScrollView, StyleSheet, Text, View } from 'react-native';
import dayjs from 'dayjs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import ScheduleTodoCard, {
  ScheduleTodo,
  ScheduleTodoFormData,
} from '../Components/ScheduleTodoCard';
import { DBManager } from '../services/db/db';
import { RootStackParamList } from '../types/navigation.types';

type Props = NativeStackScreenProps<RootStackParamList, 'ScheduleEditor'>;

type ExpandedCardId = number | null;

const ScheduleEditorScreen: React.FC<Props> = ({ route }) => {
  const [dateValue, setDateValue] = useState(route.params.date);
  const [todos, setTodos] = useState<ScheduleTodo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedCardId, setExpandedCardId] = useState<ExpandedCardId>(null);

  const closeExpandedCard = useCallback(() => {
    setExpandedCardId(null);
  }, []);

  useEffect(() => {
    setDateValue(route.params.date);
    closeExpandedCard();
  }, [closeExpandedCard, route.params.date]);

  const loadTodos = useCallback(async () => {
    try {
      setIsLoading(true);
      const db = await DBManager.getDB();
      const [result] = await db.executeSql('SELECT * FROM Todo;');

      const parsed: ScheduleTodo[] = [];
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

        parsed.push({
          id: Number(row.id),
          title: typeof row.title === 'string' ? row.title : '',
          dueDate: typeof row.due_date === 'string' ? row.due_date : null,
          dueTime: typeof row.due_time === 'string' ? row.due_time : null,
          isRepeating: Number(row.is_repeating) === 1,
          repeatType:
            row.repeat_type === 'weekly' || row.repeat_type === 'monthly'
              ? row.repeat_type
              : null,
          repeatWeekdays,
          repeatDayOfMonth:
            row.repeat_day_of_month !== null && row.repeat_day_of_month !== undefined
              ? Number(row.repeat_day_of_month)
              : null,
          ddayId:
            row.dday_id !== null && row.dday_id !== undefined
              ? Number(row.dday_id)
              : null,
          alarmId:
            row.alarm_id !== null && row.alarm_id !== undefined
              ? Number(row.alarm_id)
              : null,
          alarmSetId:
            row.alarm_set_id !== null && row.alarm_set_id !== undefined
              ? Number(row.alarm_set_id)
              : null,
        });
      }

      const targetDate = dateValue;
      const targetDay = dayjs(targetDate);
      const weekday = targetDay.day();
      const dayOfMonth = targetDay.date();

      const filtered = parsed.filter(todo => {
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

      setTodos(filtered);
    } catch (error) {
      console.error('Failed to load todos for editor', error);
    } finally {
      setIsLoading(false);
    }
  }, [dateValue]);

  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  const handleTodoCardPress = useCallback(
    (todo: ScheduleTodo) => {
      if (expandedCardId === todo.id) {
        closeExpandedCard();
        return;
      }
      setExpandedCardId(todo.id);
    },
    [closeExpandedCard, expandedCardId],
  );

  const handleSaveExisting = useCallback(
    async (todo: ScheduleTodo, formData: ScheduleTodoFormData) => {
      setIsSaving(true);
      try {
        const db = await DBManager.getDB();
        const dueDate = dateValue;
        const dueTime = formData.isTimePickerVisible
          ? `${String(formData.timeValue[0]).padStart(2, '0')}:${String(
              formData.timeValue[1],
            ).padStart(2, '0')}`
          : null;

        const isRepeating = formData.isRepeatSectionVisible && formData.repeatType ? 1 : 0;
        const repeatTypeToSave = isRepeating ? formData.repeatType : null;
        const repeatWeekday =
          isRepeating &&
          formData.repeatType === 'weekly' &&
          formData.selectedWeekdays.length > 0
            ? JSON.stringify(formData.selectedWeekdays)
            : null;
        const repeatDayOfMonth =
          isRepeating && formData.repeatType === 'monthly' && dueDate
            ? Number(dueDate.split('-')[2]) || null
            : null;

        await db.executeSql(
          `UPDATE Todo SET
            title = ?,
            description = ?,
            due_date = ?,
            due_time = ?,
            is_repeating = ?,
            repeat_type = ?,
            repeat_weekday = ?,
            repeat_day_of_month = ?,
            alarm_id = ?,
            alarm_set_id = ?
          WHERE id = ?;`,
          [
            formData.title,
            null,
            dueDate,
            dueTime,
            isRepeating,
            repeatTypeToSave,
            repeatWeekday,
            repeatDayOfMonth,
            todo.alarmId,
            todo.alarmSetId,
            todo.id,
          ],
        );

        if (formData.isDDay) {
          if (todo.ddayId) {
            await db.executeSql(`UPDATE Dday SET target_date = ? WHERE id = ?;`, [
              dueDate,
              todo.ddayId,
            ]);
          } else {
            const [insertDdayResult] = await db.executeSql(
              `INSERT INTO Dday (todo_id, target_date) VALUES (?, ?);`,
              [todo.id, dueDate],
            );
            await db.executeSql(`UPDATE Todo SET dday_id = ? WHERE id = ?;`, [
              insertDdayResult.insertId,
              todo.id,
            ]);
          }
        } else if (todo.ddayId) {
          await db.executeSql(`DELETE FROM Dday WHERE id = ?;`, [todo.ddayId]);
          await db.executeSql(`UPDATE Todo SET dday_id = NULL WHERE id = ?;`, [todo.id]);
        }

        await loadTodos();
        closeExpandedCard();
      } catch (error) {
        console.error('Failed to save todo item', error);
        throw error;
      } finally {
        setIsSaving(false);
      }
    },
    [closeExpandedCard, dateValue, loadTodos],
  );

  const handleCreateTodo = useCallback(
    async (formData: ScheduleTodoFormData) => {
      setIsSaving(true);
      try {
        const db = await DBManager.getDB();
        const dueDate = dateValue;
        const dueTime = formData.isTimePickerVisible
          ? `${String(formData.timeValue[0]).padStart(2, '0')}:${String(
              formData.timeValue[1],
            ).padStart(2, '0')}`
          : null;

        const isRepeating = formData.isRepeatSectionVisible && formData.repeatType ? 1 : 0;
        const repeatTypeToSave = isRepeating ? formData.repeatType : null;
        const repeatWeekday =
          isRepeating &&
          formData.repeatType === 'weekly' &&
          formData.selectedWeekdays.length > 0
            ? JSON.stringify(formData.selectedWeekdays)
            : null;
        const repeatDayOfMonth =
          isRepeating && formData.repeatType === 'monthly' && dueDate
            ? Number(dueDate.split('-')[2]) || null
            : null;

        const [insertTodoResult] = await db.executeSql(
          `INSERT INTO Todo (
            title,
            description,
            due_date,
            due_time,
            is_repeating,
            repeat_type,
            repeat_weekday,
            repeat_day_of_month,
            dday_id,
            alarm_id,
            alarm_set_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            formData.title,
            null,
            dueDate,
            dueTime,
            isRepeating,
            repeatTypeToSave,
            repeatWeekday,
            repeatDayOfMonth,
            null,
            null,
            null,
          ],
        );

        const todoId = insertTodoResult.insertId;
        if (formData.isDDay && todoId) {
          const [insertDdayResult] = await db.executeSql(
            `INSERT INTO Dday (todo_id, target_date) VALUES (?, ?);`,
            [todoId, dueDate],
          );
          await db.executeSql(`UPDATE Todo SET dday_id = ? WHERE id = ?;`, [
            insertDdayResult.insertId,
            todoId,
          ]);
        }

        await loadTodos();
      } catch (error) {
        console.error('Failed to create todo item', error);
        throw error;
      } finally {
        setIsSaving(false);
      }
    },
    [dateValue, loadTodos],
  );

  const handleNewCardCancel = useCallback(() => {
    // 화면 차원에서 별도 처리할 내용이 없어도 콜백은 유지합니다.
  }, []);

  const formattedDateLabel = useMemo(() => {
    const date = dayjs(dateValue);
    if (!date.isValid()) {
      return dateValue;
    }
    return date.format('YYYY년 MM월 DD일');
  }, [dateValue]);

  return (
    <View style={styles.screen}>
      <Text style={styles.dateLabel}>{formattedDateLabel}</Text>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.todoListContainer}>
          <Text style={styles.sectionTitle}>해당 날짜의 일정</Text>
          {isLoading ? (
            <Text style={styles.helperText}>일정을 불러오는 중입니다...</Text>
          ) : (
            <>
              {todos.length === 0 ? (
                <Text style={styles.helperText}>등록된 일정이 없습니다.</Text>
              ) : null}
              {todos.map(todo => {
                const isExpanded = expandedCardId === todo.id;
                return (
                  <ScheduleTodoCard
                    key={todo.id}
                    isExpanded={isExpanded}
                    onPressHeader={() => handleTodoCardPress(todo)}
                    isSaving={isSaving}
                    initialData={todo}
                    onCancel={closeExpandedCard}
                    onSave={formData => handleSaveExisting(todo, formData)}
                  />
                );
              })}
              <ScheduleTodoCard
                key={`new-${dateValue}`}
                mode="new"
                isExpanded
                isSaving={isSaving}
                onSave={handleCreateTodo}
                onCancel={handleNewCardCancel}
              />
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  dateLabel: {
    fontSize: 18,
    fontWeight: '600',
    paddingHorizontal: 20,
    paddingTop: 20,
    color: '#212121',
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  todoListContainer: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
  },
  helperText: {
    fontSize: 14,
    color: '#757575',
  },
});

export default ScheduleEditorScreen;
