import React, { useCallback, useMemo } from 'react';
import { Dimensions, FlatList, ListRenderItemInfo } from 'react-native';
import dayjs from 'dayjs';
import { Calendar } from 'react-native-calendars';
import type { CalendarProps } from 'react-native-calendars';

export type HorizontalCalendarPagerProps = {
  initialDate: string;
  scrollRange: number;
  calendarHeight: number;
  calendarWidth?: number;
  calendarProps: CalendarProps;
  scrollViewProps?: {
    onScroll?: (event: any) => void;
    onMomentumScrollEnd?: (event: any) => void;
    scrollEventThrottle?: number;
    showsHorizontalScrollIndicator?: boolean;
  };
};

const HorizontalCalendarPager: React.FC<HorizontalCalendarPagerProps> = ({
  initialDate,
  scrollRange,
  calendarHeight,
  calendarWidth = Dimensions.get('window').width,
  calendarProps,
  scrollViewProps,
}) => {
  const months = useMemo(() => {
    const base = dayjs(initialDate).startOf('month');
    return Array.from({ length: scrollRange * 2 + 1 }, (_, index) =>
      base.add(index - scrollRange, 'month').format('YYYY-MM-DD'),
    );
  }, [initialDate, scrollRange]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<string>) => (
      <Calendar
        {...calendarProps}
        current={item}
        style={[
          { width: calendarWidth, minHeight: calendarHeight },
          calendarProps?.style,
        ]}
        hideArrows
        disableMonthChange
      />
    ),
    [calendarHeight, calendarProps, calendarWidth],
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: calendarWidth,
      offset: calendarWidth * index,
      index,
    }),
    [calendarWidth],
  );

  return (
    <FlatList
      horizontal
      pagingEnabled
      initialScrollIndex={scrollRange}
      getItemLayout={getItemLayout}
      data={months}
      renderItem={renderItem}
      keyExtractor={item => item}
      showsHorizontalScrollIndicator={scrollViewProps?.showsHorizontalScrollIndicator ?? false}
      onMomentumScrollEnd={scrollViewProps?.onMomentumScrollEnd}
      onScroll={scrollViewProps?.onScroll}
      scrollEventThrottle={scrollViewProps?.scrollEventThrottle ?? 16}
      windowSize={5}
      initialNumToRender={3}
      maxToRenderPerBatch={3}
      removeClippedSubviews={false}
    />
  );
};

export default HorizontalCalendarPager;
