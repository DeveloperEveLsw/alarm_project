import React, { useState, useRef, useEffect, useMemo} from 'react';
import { View, Text, TextInput, Button, StyleSheet, TouchableOpacity, Animated, Pressable } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation.types'
import { DBManager } from '../services/db/db'
import WheelPicker from '@quidone/react-native-wheel-picker';
import IconButton from '../Components/Button/IconButton';
import IconToggleButton from '../Components/Button/IconToggleButton';
import TextToggleButton from '../Components/Button/TextToggleButton';

import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';



// Define the type for the route params
type ScheduleEditorScreenRouteProp = RouteProp<{ params: { date: string } }, 'params'>;
type ScheduleEditorScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ScheduleEditor'>;

const ScheduleEditorScreen = () => {
  const route = useRoute<ScheduleEditorScreenRouteProp>();
  
  const [timeValue, setTimeValue] = useState(0)

  const [title, setTitle] = useState("")
  const [isRepeatSectionVisible, setIsRepeatSectionVisible] = useState(false);
  const [repeatType, setRepeatType] = useState<string | null>(null); // 'daily', 'weekly', 'monthly'
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([]); // 0:Sun, 1:Mon, ...

  const [isTimePickerVisible, setIsTimePickerVisible] = useState(false)

  const [isDDay, setIsDDay] = useState(false)

  console.log("안녕하세요")

  const hourData = [...Array(24).keys()].map(i => ({ label: `${i}시`, value: i }));
  const minuteData = [...Array(60).keys()].map(i => ({ label: `${i}분`, value: i })); 

  return (
    <View style={{flex:1}}>
    <View style={styles.container}>
      <TextInput placeholder="일정을 입력하세요." style={{backgroundColor:"#e7e7e7ff", borderRadius:15, padding:16, marginBottom:10}} onChangeText={(text)=> setTitle(text)}></TextInput>
      <View style={{flexDirection: 'row',height:50}}>
        <IconToggleButton 
          IconComponent={MaterialCommunityIcons}
          iconName="repeat-off"
          onToggleIconName='repeat'
          iconColor="black"
          iconSize={40}
          onToggle={(isChecked) => {setIsRepeatSectionVisible(isChecked)}}>
        </IconToggleButton>

        <IconToggleButton 
          IconComponent={MaterialCommunityIcons}
          iconName="clock-outline"
          onToggleIconName='clock'
          iconColor="black"
          iconSize={40}
          onToggle={(isChecked) => {setIsTimePickerVisible(isChecked)}}>
        </IconToggleButton>

        <TextToggleButton
          boxStyle={{height:40, paddingLeft:10, paddingRight:10, borderRadius:14}}
          textStyle={{fontSize:20,fontWeight:'bold'}}
          title="D-DAY"
          onToggle={(isChecked)=>{setIsDDay(isChecked)}}
          color="#000"
          onToggleColor="#FFF"
          onToggleBackgroundColor="#000">
        </TextToggleButton>

        
      </View>
      {isTimePickerVisible ? (<View style={{flexDirection: 'row'}}>
        <WheelPicker
          data={hourData}
          value={timeValue}
          onValueChanged={({ item: { value } }) => setTimeValue(value)}
          visibleItemCount={3}
          overlayItemStyle={{borderRadius:0, borderTopLeftRadius:10, borderBottomLeftRadius:10}}
        />
        <WheelPicker
          data={minuteData}
          value={timeValue}
          onValueChanged={({ item: { value } }) => setTimeValue(value)}
          visibleItemCount={3}
          overlayItemStyle={{borderRadius:0, borderTopRightRadius:10, borderBottomRightRadius:10}}
        />
      </View>) : ""}
    
      {isRepeatSectionVisible && (
        <View style={styles.repeatContainer}>
          <Text style={styles.sectionTitle}>반복 설정</Text>
          <View style={styles.buttonGroup}>
            <TouchableOpacity 
              style={[styles.optionButton, repeatType === 'weekly' && styles.optionButtonSelected]} 
              onPress={() => setRepeatType('weekly')}>
              <Text style={[styles.optionButtonText, repeatType === 'weekly' && styles.optionButtonTextSelected]}>요일</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.optionButton, repeatType === 'monthly' && styles.optionButtonSelected]} 
              onPress={() => setRepeatType('monthly')}>
              <Text style={[styles.optionButtonText, repeatType === 'monthly' && styles.optionButtonTextSelected]}>월</Text>
            </TouchableOpacity>
          </View>
          {repeatType === 'weekly' && (
            <View style={styles.weekdaySelector}>
              {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
                <TouchableOpacity 
                  key={day} 
                  style={[styles.weekdayButton, selectedWeekdays.includes(index) && styles.weekdayButtonSelected]}
                  onPress={() => {
                    const newSelection = [...selectedWeekdays];
                    if (newSelection.includes(index)) {
                      // Remove day
                      setSelectedWeekdays(newSelection.filter(i => i !== index));
                    } else {
                      // Add day
                      newSelection.push(index);
                      setSelectedWeekdays(newSelection.sort((a, b) => a - b));
                    }
                  }}>
                  <Text style={[styles.weekdayButtonText, selectedWeekdays.includes(index) && styles.weekdayButtonTextSelected]}>{day}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      <Button title="추가" onPress={ async () =>  {
        console.log("ㅎㅇ")
        const db = await DBManager.getDB()
        await db.executeSql(
          `INSERT INTO Todo (title) VALUES (?);`,
          [title])
        const [result] = await db.executeSql(`
        SELECT * FROM Todo;
        `)
        for (let i = 0; i < result.rows.length; i++) {
          console.log(i)
          console.log(result.rows.item(i));
}
}} />
    </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding:20,
    backgroundColor: '#ffffffff',
    margin:20,
    borderRadius: 20,
    maxHeight:430
  },
  // Repeat Section Styles
  repeatContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  optionButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  optionButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  optionButtonText: {
    color: '#333',
  },
  optionButtonTextSelected: {
    color: '#fff',
  },
  weekdaySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  weekdayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  weekdayButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  weekdayButtonText: {
    color: '#333',
  },
  weekdayButtonTextSelected: {
    color: '#fff',
  },
});

export default ScheduleEditorScreen;