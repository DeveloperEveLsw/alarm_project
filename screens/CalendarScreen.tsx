import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  Animated,
  Dimensions,
  I18nManager,
  Image,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { DateData } from 'react-native-calendars';
import dayjs from 'dayjs';

import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';

import { RootStackParamList } from '../types/navigation.types';
import { todoService } from '../services/todoService';
import type { ScheduleTodo } from '../types/todo.types';
import HorizontalCalendarPager from '../Components/HorizontalCalendarPager';
import WheelPicker from '@quidone/react-native-wheel-picker';
import { categoryService } from '../services/categoryService';
import type { Category } from '../types/category.types';
import { useAuthStore } from '../stores/authStore';
import { useBackupAction } from '../hooks/useBackupAction';
import { useRestoreAction } from '../hooks/useRestoreAction';

const SCROLL_RANGE = 50;

type CalendarScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Main'>;

const CalendarScreen: React.FC = () => {
  const defaultInitialDate = useMemo(() => dayjs().startOf('month').format('YYYY-MM-DD'), []);
  const [calendarBaseDate, setCalendarBaseDate] = useState(defaultInitialDate);
  const baseMonth = useMemo(() => dayjs(calendarBaseDate), [calendarBaseDate]);
  const [currentDateLabel, setCurrentDateLabel] = useState(baseMonth.format('YYYY년 M월'));
  const { data: todos = [] } = useQuery<ScheduleTodo[]>({
    queryKey: ['todos', 'all'],
    queryFn: todoService.getAllTodos,
  });
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: categoryService.getCategories,
  });
  const availableYears = useMemo(() => {
    const currentYear = dayjs().year();
    return Array.from({ length: 9 }, (_, index) => currentYear - 4 + index);
  }, []);
  const availableMonths = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => ({
        value: index,
        label: `${index + 1}월`,
      })),
    [],
  );
  const [categoryVisibility, setCategoryVisibility] = useState<Record<number, boolean>>({});
  const [isMenuVisible, setMenuVisible] = useState(false);
  const menuAnimation = useRef(new Animated.Value(0)).current;
  const menuTranslateX = menuAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [280, 0],
  });
  const [isMonthPickerVisible, setMonthPickerVisible] = useState(false);
  const monthPickerAnimation = useRef(new Animated.Value(0)).current;
  const monthPickerTranslateY = monthPickerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [400, 0],
  });
  const [selectedYear, setSelectedYear] = useState(baseMonth.year());
  const [selectedMonth, setSelectedMonth] = useState(baseMonth.month());
  useEffect(() => {
    setSelectedYear(baseMonth.year());
    setSelectedMonth(baseMonth.month());
  }, [baseMonth]);
  useEffect(() => {
    setCategoryVisibility(prev => {
      const next: Record<number, boolean> = { ...prev };
      let changed = false;
      const ids = new Set(categories.map(category => category.id));
      categories.forEach(category => {
        if (typeof next[category.id] === 'undefined') {
          next[category.id] = true;
          changed = true;
        }
      });
      Object.keys(next).forEach(key => {
        const id = Number(key);
        if (!ids.has(id)) {
          delete next[id];
          changed = true;
        }
      });
      return changed ? { ...next } : next;
    });
  }, [categories]);
  const placeholderTheme = useMemo(
    () => ({
      'stylesheet.calendar-list.main': {
        placeholderText: {
          color: 'transparent',
        },
      },
      'stylesheet.calendar.header': {
        arrow: {
          opacity: 0,
          width: 0,
          height: 0,
        },
        header: {
          justifyContent: 'center',
        },
        monthText: {
          opacity: 0,
        },
      },
    }),
    [],
  );

  const SCREEN_WIDTH = Dimensions.get('window').width;
  const tabBarHeight = useBottomTabBarHeight();
  const [screenHeight, setScreenHeight] = useState(Dimensions.get('window').height);
  const [headerHeight, setHeaderHeight] = useState(0);
  const DAY_CELL_WIDTH = SCREEN_WIDTH / 7;
  const WEEKDAY_HEADER_HEIGHT = 32;
  const CALENDAR_VERTICAL_PADDING = 48;
  const MIN_DAY_CELL_HEIGHT = DAY_CELL_WIDTH + 12;
  const MIN_CALENDAR_HEIGHT = MIN_DAY_CELL_HEIGHT * 6 + WEEKDAY_HEADER_HEIGHT + CALENDAR_VERTICAL_PADDING;
  const availableCalendarHeight = Math.max(screenHeight - headerHeight - tabBarHeight, MIN_CALENDAR_HEIGHT);
  const DAY_CELL_HEIGHT = useMemo(() => {
    const rawHeight = (availableCalendarHeight - WEEKDAY_HEADER_HEIGHT - CALENDAR_VERTICAL_PADDING) / 6;
    return Math.max(rawHeight, MIN_DAY_CELL_HEIGHT);
  }, [availableCalendarHeight, MIN_DAY_CELL_HEIGHT]);
  const CALENDAR_HEIGHT = useMemo(
    () => DAY_CELL_HEIGHT * 6 + WEEKDAY_HEADER_HEIGHT + CALENDAR_VERTICAL_PADDING,
    [DAY_CELL_HEIGHT],
  );
  const handleScreenLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { height } = event.nativeEvent.layout;
      if (Math.abs(height - screenHeight) > 1) {
        setScreenHeight(height);
      }
    },
    [screenHeight],
  );
  const handleHeaderLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { height } = event.nativeEvent.layout;
      if (Math.abs(height - headerHeight) > 0.5) {
        setHeaderHeight(height);
      }
    },
    [headerHeight],
  );
  const shouldFixRTL = useMemo(() => I18nManager.isRTL && Platform.OS === 'android', []);
  const lastOffsetRef = useRef(SCROLL_RANGE * SCREEN_WIDTH);
  useEffect(() => {
    lastOffsetRef.current = SCROLL_RANGE * SCREEN_WIDTH;
  }, [SCREEN_WIDTH, calendarBaseDate]);

  const navigation = useNavigation<CalendarScreenNavigationProp>();
  const user = useAuthStore(state => state.user);
  const loginWithGoogle = useAuthStore(state => state.loginWithGoogle);
  const logout = useAuthStore(state => state.logout);
  const isLoggingIn = useAuthStore(state => state.isLoggingIn);
  const { startBackup: handleBackup, isBackingUp } = useBackupAction();
  const { startRestore, isRestoring } = useRestoreAction();
  const userProfile = useMemo(() => {
    if (!user) return null;
    const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
    const displayName =
      (typeof metadata.full_name === 'string' && metadata.full_name) ||
      (typeof metadata.name === 'string' && metadata.name) ||
      user.email ||
      'Google 사용자';
    const email = user.email ?? '';
    const avatarUrl =
      typeof metadata.avatar_url === 'string' && metadata.avatar_url.trim().length > 0
        ? metadata.avatar_url
        : null;
    return { name: displayName, email, avatarUrl };
  }, [user]);
  const handleLogin = useCallback(() => {
    loginWithGoogle().catch(error => {
      console.warn('[Auth] login failed', error);
    });
  }, [loginWithGoogle]);
  const handleLogout = useCallback(() => {
    logout().catch(error => {
      console.warn('[Auth] logout failed', error);
    });
  }, [logout]);

  const handleDayPress = useCallback(
    (dateString: string) => {
      navigation.navigate('ScheduleEditor', { date: dateString });
    },
    [navigation],
  );

  const getCategoryForTodo = useCallback(
    (todo: ScheduleTodo) => {
      if (todo.categoryId == null) {
        return undefined;
      }
      return categories.find(category => category.id === todo.categoryId);
    },
    [categories],
  );
  const getTodosForDate = useCallback(
    (targetDate: string) =>
      todoService
        .filterTodosByDate(todos, targetDate)
        .filter(todo => {
          const todoCategory = getCategoryForTodo(todo);
          return todoCategory ? categoryVisibility[todoCategory.id] ?? true : true;
        }),
    [todos, categoryVisibility, getCategoryForTodo],
  );
  const renderDayComponent = useCallback(
    ({ date, state }: { date?: DateData; state?: string }) => {
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
            style={[
              styles.dayCell,
              {
                width: DAY_CELL_WIDTH,
                height: DAY_CELL_HEIGHT,
              },
            ]}
          >
            <View style={styles.dayHeader}>
              <Text
                style={[
                  styles.dayNumber,
                  {
                    color: textColor,
                  },
                  state === 'disabled' ? styles.dayNumberDisabled : null,
                  holiday ? styles.dayNumberHoliday : null,
                ]}
              >
                {date?.day}
              </Text>
              {holiday && (
                <Text style={[styles.holidayLabel, { color: holiday.color }]}>
                  {holiday.label}
                </Text>
              )}
            </View>
            <View style={styles.todoList}>
              {todosForDate.map(todo => (
                <View
                  key={`${todo.id}-${dateStr}`}
                  style={[
                    styles.todoCard,
                    todo.isRepeating && styles.todoCardRepeat,
                    todo.ddayId != null && styles.todoCardDDay,
                  ]}
                >
                  {(() => {
                    const todoCategory = getCategoryForTodo(todo);
                    if (!todoCategory) return null;
                    return (
                      <View style={styles.todoCardCategoryRow}>
                        <View
                          style={[styles.todoCategoryDot, { backgroundColor: todoCategory.color }]}
                        />
                        <Text style={styles.todoCategoryLabel}>{todoCategory.name}</Text>
                      </View>
                    );
                  })()}
                  <Text numberOfLines={1} style={styles.todoCardText}>
                    {todo.title}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [DAY_CELL_HEIGHT, DAY_CELL_WIDTH, getCategoryForTodo, getTodosForDate, handleDayPress],
  );
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      lastOffsetRef.current = event.nativeEvent.contentOffset.x;
    },
    [],
  );
  const handleMomentumScrollEnd = useCallback(
    (event?: NativeSyntheticEvent<NativeScrollEvent>) => {
      const totalPages = SCROLL_RANGE * 2 + 1;
      const rawOffsetX = event?.nativeEvent?.contentOffset?.x ?? lastOffsetRef.current;
      const adjustedOffset = shouldFixRTL
        ? SCREEN_WIDTH * totalPages - rawOffsetX
        : rawOffsetX;
      const pageIndex = Math.round(adjustedOffset / SCREEN_WIDTH);
      const monthOffset = pageIndex - SCROLL_RANGE;
      const labelDate = dayjs(calendarBaseDate).add(monthOffset, 'month');
      setCurrentDateLabel(labelDate.format('YYYY년 M월'));
    },
    [SCREEN_WIDTH, calendarBaseDate, shouldFixRTL],
  );
  const scrollViewProps = useMemo(
    () => ({
      onMomentumScrollEnd: handleMomentumScrollEnd,
      onScroll: handleScroll,
      scrollEventThrottle: 16,
    }),
    [handleMomentumScrollEnd, handleScroll],
  );
  const calendarStyle = useMemo(
    () => ({
      padding: 0,
      margin: 0,
      borderWidth: 0,
    }),
    [],
  );
  const renderCalendarHeader = useCallback(() => <View />, []);
  const calendarProps = useMemo(
    () => ({
      dayComponent: renderDayComponent,
      hideExtraDays: false,
      style: calendarStyle,
      theme: placeholderTheme,
      renderHeader: renderCalendarHeader,
    }),
    [calendarStyle, placeholderTheme, renderDayComponent, renderCalendarHeader],
  );
  const handleCategoryToggle = useCallback((categoryId: number, value: boolean) => {
    setCategoryVisibility(prev => ({
      ...prev,
      [categoryId]: value,
    }));
  }, []);
  const handleOpenMonthPicker = useCallback(() => {
    setSelectedYear(baseMonth.year());
    setSelectedMonth(baseMonth.month());
    setMonthPickerVisible(true);
    Animated.timing(monthPickerAnimation, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [baseMonth, monthPickerAnimation]);
  const handleCloseMonthPicker = useCallback(() => {
    Animated.timing(monthPickerAnimation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setMonthPickerVisible(false));
  }, [monthPickerAnimation]);
  const handleApplyMonthSelection = useCallback(() => {
    const nextDate = dayjs()
      .year(selectedYear)
      .month(selectedMonth)
      .startOf('month');
    const formatted = nextDate.format('YYYY-MM-DD');
    setCalendarBaseDate(formatted);
    setCurrentDateLabel(nextDate.format('YYYY년 M월'));
    handleCloseMonthPicker();
  }, [handleCloseMonthPicker, selectedMonth, selectedYear]);
  const handleOpenMenu = useCallback(() => {
    setMenuVisible(true);
    Animated.timing(menuAnimation, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [menuAnimation]);
  const handleCloseMenu = useCallback(() => {
    Animated.timing(menuAnimation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setMenuVisible(false));
  }, [menuAnimation]);
  return (
    <View style={styles.screen} onLayout={handleScreenLayout}>
      <View style={styles.headerRow} onLayout={handleHeaderLayout}>
        <TouchableOpacity onPress={handleOpenMonthPicker}>
          <Text style={styles.currentMonthLabel}>{currentDateLabel}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuButton} onPress={handleOpenMenu} activeOpacity={0.7}>
          {[0, 1, 2].map(index => (
            <View key={index} style={styles.menuButtonLine} />
          ))}
        </TouchableOpacity>
      </View>
      <HorizontalCalendarPager
        key={calendarBaseDate}
        scrollRange={SCROLL_RANGE}
        initialDate={calendarBaseDate}
        calendarHeight={CALENDAR_HEIGHT}
        calendarProps={calendarProps}
        scrollViewProps={scrollViewProps}
      />
      {isMenuVisible && (
        <View style={styles.menuOverlay} pointerEvents="box-none">
          <TouchableWithoutFeedback onPress={handleCloseMenu}>
            <Animated.View style={[styles.menuBackdrop, { opacity: menuAnimation }]} />
          </TouchableWithoutFeedback>
          <Animated.View
            style={[
              styles.menuContainer,
              {
                transform: [{ translateX: menuTranslateX }],
              },
            ]}
          >
            <ScrollView>
              <View style={styles.menuHeader}>
                {userProfile ? (
                  <>
                    <View style={styles.menuHeaderRow}>
                      {userProfile.avatarUrl ? (
                        <Image source={{ uri: userProfile.avatarUrl }} style={styles.menuAvatar} />
                      ) : (
                        <View style={styles.menuAvatarPlaceholder}>
                          <Text style={styles.menuAvatarInitials}>
                            {userProfile.name.slice(0, 2).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View style={styles.menuHeaderInfo}>
                        <Text style={styles.menuHeaderLabel}>{userProfile.name}</Text>
                        {userProfile.email ? (
                          <Text style={styles.menuHeaderSubLabel}>{userProfile.email}</Text>
                        ) : null}
                      </View>
                    </View>
                    <TouchableOpacity style={styles.menuLogoutButton} onPress={handleLogout}>
                      <Text style={styles.menuLogoutText}>로그아웃</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <View style={styles.menuAuthPrompt}>
                    <Text style={styles.menuAuthTitle}>로그인이 필요해요</Text>
                    <Text style={styles.menuAuthSubtitle}>
                      Google 계정으로 로그인하면 백업/공유 기능을 사용할 수 있어요.
                    </Text>
                    <TouchableOpacity
                      style={[styles.googleButton, isLoggingIn ? styles.googleButtonDisabled : null]}
                      onPress={handleLogin}
                      disabled={isLoggingIn}
                    >
                      <Text style={styles.googleButtonLabel}>
                        {isLoggingIn ? '로그인 중...' : 'Google 계정으로 로그인'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
              <View style={styles.menuActions}>
                <TouchableOpacity
                  style={[
                    styles.menuActionButton,
                    isBackingUp ? styles.menuActionButtonDisabled : null,
                  ]}
                  onPress={handleBackup}
                  disabled={isBackingUp}
                >
                  <Text style={styles.menuActionText}>
                    {isBackingUp ? '백업 중...' : '백업하기'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.menuActionButton,
                    isRestoring ? styles.menuActionButtonDisabled : null,
                  ]}
                  onPress={startRestore}
                  disabled={isRestoring}
                >
                  <Text style={styles.menuActionText}>
                    {isRestoring ? '복원 중...' : '백업 가져오기'}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.menuSection}>
                <Text style={styles.menuSectionTitle}>카테고리 필터</Text>
                {categories.length === 0 ? (
                  <Text style={styles.menuEmptyText}>카테고리를 추가하면 여기에서 필터링할 수 있어요.</Text>
                ) : (
                  categories.map(category => (
                    <View key={category.id} style={styles.categoryRow}>
                      <View style={styles.categoryLabelContainer}>
                        <View
                          style={[styles.categoryDot, { backgroundColor: category.color }]}
                        />
                        <Text style={styles.categoryLabel}>{category.name}</Text>
                      </View>
                      <Switch
                        value={categoryVisibility[category.id] ?? true}
                        onValueChange={value => handleCategoryToggle(category.id, value)}
                        trackColor={{ true: '#10B981', false: '#9CA3AF' }}
                        thumbColor="#ffffff"
                      />
                    </View>
                  ))
                )}
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      )}
      {isMonthPickerVisible && (
        <View style={styles.monthPickerOverlay} pointerEvents="box-none">
          <TouchableWithoutFeedback onPress={handleCloseMonthPicker}>
            <Animated.View style={[styles.menuBackdrop, { opacity: monthPickerAnimation }]} />
          </TouchableWithoutFeedback>
          <Animated.View
            style={[
              styles.monthPickerSheet,
              {
                transform: [{ translateY: monthPickerTranslateY }],
              },
            ]}
          >
            <Text style={styles.monthPickerTitle}>년 월 선택</Text>
            <View style={styles.monthPickerRow}>
              <WheelPicker
                data={availableYears.map(year => ({ label: `${year}년`, value: year }))}
                value={selectedYear}
                onValueChanged={({ item }) => setSelectedYear(item.value)}
                visibleItemCount={3}
                style={styles.yearPicker}
              />
              <WheelPicker
                data={availableMonths}
                value={selectedMonth}
                onValueChanged={({ item }) => setSelectedMonth(item.value)}
                visibleItemCount={3}
                style={styles.monthPicker}
              />
            </View>
            <TouchableOpacity style={styles.monthPickerConfirmButton} onPress={handleApplyMonthSelection}>
              <Text style={styles.monthPickerConfirmText}>선택</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  currentMonthLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuButtonLine: {
    width: 16,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#111827',
    marginVertical: 2,
  },
  menuOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  menuContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 280,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: -4, height: 0 },
    shadowRadius: 8,
    elevation: 6,
  },
  menuHeader: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
  },
  menuHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  menuAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C7D2FE',
  },
  menuAvatarInitials: {
    fontSize: 16,
    fontWeight: '700',
    color: '#312E81',
  },
  menuHeaderInfo: {
    flex: 1,
  },
  menuHeaderLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  menuHeaderSubLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  menuLogoutButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    backgroundColor: '#fff',
  },
  menuLogoutText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4338CA',
  },
  menuAuthPrompt: {
    gap: 8,
  },
  menuAuthTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  menuAuthSubtitle: {
    fontSize: 13,
    color: '#4B5563',
  },
  googleButton: {
    marginTop: 8,
    backgroundColor: '#1A73E8',
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: 'center',
  },
  googleButtonDisabled: {
    opacity: 0.6,
  },
  googleButtonLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  menuActions: {
    gap: 12,
  },
  menuActionButton: {
    backgroundColor: '#E5E7EB',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  menuActionButtonDisabled: {
    opacity: 0.6,
  },
  menuActionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  menuSection: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 16,
  },
  menuSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  menuEmptyText: {
    fontSize: 13,
    color: '#6B7280',
  },
  monthPickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  monthPickerSheet: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    elevation: 8,
  },
  monthPickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  monthPickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 20,
  },
  yearPicker: {
    flex: 1,
  },
  monthPicker: {
    flex: 1,
  },
  monthPickerConfirmButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  monthPickerConfirmText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  categoryLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  categoryLabel: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  dayCell: {
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    borderColor: '#bebebe',
    borderStyle: 'solid',
    borderTopWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  dayHeader: {
    alignItems: 'center',
    marginBottom: 4,
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: '600',
    paddingTop: 2,
  },
  dayNumberDisabled: {
    opacity: 0.3,
  },
  dayNumberHoliday: {
    fontWeight: '700',
  },
  holidayLabel: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
  },
  todoList: {
    flexGrow: 1,
    width: '100%',
  },
  todoCard: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 6,
    marginTop: 4,
  },
  todoCardRepeat: {
    backgroundColor: '#e6f0ff',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  todoCardDDay: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  todoCardCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  todoCategoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  todoCategoryLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#4B5563',
  },
  todoCardText: {
    fontSize: 10,
    color: '#1f2937',
    fontWeight: '600',
  },
});

export default CalendarScreen;
