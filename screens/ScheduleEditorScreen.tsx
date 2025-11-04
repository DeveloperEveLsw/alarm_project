import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { ScrollView, StyleSheet, Text, View } from 'react-native';
import dayjs from 'dayjs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import ScheduleTodoCard from '../Components/ScheduleTodoCard';
import type { ScheduleTodo, ScheduleTodoFormData } from '../types/todo.types';
import { todoService } from '../services/todoService';
import { syncTodoAlarms } from '../services/scheduleAlarmService';
import { RootStackParamList } from '../types/navigation.types';

type Props = NativeStackScreenProps<RootStackParamList, 'ScheduleEditor'>;

type ExpandedCardId = number | null;
type ActiveMutationTarget = number | 'new' | null;

type UpdateTodoVariables = {
  todo: ScheduleTodo;
  formData: ScheduleTodoFormData;
};

const ScheduleEditorScreen: React.FC<Props> = ({ route }) => {
  const [dateValue, setDateValue] = useState(route.params.date);
  const [expandedCardId, setExpandedCardId] = useState<ExpandedCardId>(null);
  const [activeMutationTarget, setActiveMutationTarget] = useState<ActiveMutationTarget>(null);
  const [deletingTodoId, setDeletingTodoId] = useState<number | null>(null);

  const queryClient = useQueryClient();

  const closeExpandedCard = useCallback(() => {
    setExpandedCardId(null);
  }, []);

  useEffect(() => {
    setDateValue(route.params.date);
    closeExpandedCard();
  }, [closeExpandedCard, route.params.date]);

  const todosQuery = useQuery<ScheduleTodo[]>({
    queryKey: ['todos', dateValue],
    queryFn: () => todoService.getTodosForDate(dateValue),
  });

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

  const updateTodoMutation = useMutation<ScheduleTodo, Error, UpdateTodoVariables>({
    mutationFn: async ({ todo, formData }: UpdateTodoVariables) => {
      const updated = await todoService.updateTodo({
        todo,
        formData,
        targetDate: dateValue,
      });
      try {
        return await syncTodoAlarms({ todo: updated, formData });
      } catch (error) {
        console.error('Failed to sync alarms for schedule', error);
        return updated;
      }
    },
    onMutate: ({ todo }: UpdateTodoVariables) => {
      setActiveMutationTarget(todo.id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['todos'] });
      closeExpandedCard();
    },
    onError: (error: unknown) => {
      console.error('Failed to save todo item', error);
    },
    onSettled: () => {
      setActiveMutationTarget(null);
    },
  });

  const createTodoMutation = useMutation<ScheduleTodo, Error, ScheduleTodoFormData>({
    mutationFn: async (formData: ScheduleTodoFormData) => {
      const created = await todoService.createTodo({
        formData,
        targetDate: dateValue,
      });
      try {
        return await syncTodoAlarms({ todo: created, formData });
      } catch (error) {
        console.error('Failed to sync alarms for new schedule', error);
        return created;
      }
    },
    onMutate: () => {
      setActiveMutationTarget('new');
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
    onError: (error: unknown) => {
      console.error('Failed to create todo item', error);
    },
    onSettled: () => {
      setActiveMutationTarget(null);
    },
  });

  const deleteTodoMutation = useMutation<void, Error, ScheduleTodo>({
    mutationFn: (todo: ScheduleTodo) => todoService.deleteTodo(todo.id),
    onMutate: ({ id }: ScheduleTodo) => {
      setDeletingTodoId(id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['todos'] });
      closeExpandedCard();
    },
    onError: (error: unknown) => {
      console.error('Failed to delete todo item', error);
    },
    onSettled: () => {
      setDeletingTodoId(null);
    },
  });

  const todos = todosQuery.data ?? [];
  const isLoading = todosQuery.isLoading;

  const handleSaveExisting = useCallback(
    (todo: ScheduleTodo, formData: ScheduleTodoFormData) =>
      updateTodoMutation.mutateAsync({ todo, formData }),
    [updateTodoMutation],
  );

  const handleCreateTodo = useCallback(
    (formData: ScheduleTodoFormData) => createTodoMutation.mutateAsync(formData),
    [createTodoMutation],
  );

  const handleDeleteTodo = useCallback(
    (todo: ScheduleTodo) => deleteTodoMutation.mutateAsync(todo),
    [deleteTodoMutation],
  );

  const handleNewCardCancel = useCallback(() => {
    // 화면 이탈에서 별도로 처리할 내용이 없어 빈 구현을 유지합니다.
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
              {todos.map((todo: ScheduleTodo) => {
                const isExpanded = expandedCardId === todo.id;
                const isSavingExisting =
                  updateTodoMutation.isPending && activeMutationTarget === todo.id;
                return (
                  <ScheduleTodoCard
                    key={todo.id}
                    isExpanded={isExpanded}
                    onPressHeader={() => handleTodoCardPress(todo)}
                    isSaving={isSavingExisting}
                    isDeleting={deleteTodoMutation.isPending && deletingTodoId === todo.id}
                    initialData={todo}
                    onCancel={closeExpandedCard}
                    onSave={formData => handleSaveExisting(todo, formData)}
                    onDelete={handleDeleteTodo}
                  />
                );
              })}
              <ScheduleTodoCard
                key={`new-${dateValue}`}
                mode="new"
                isExpanded
                isSaving={createTodoMutation.isPending && activeMutationTarget === 'new'}
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
