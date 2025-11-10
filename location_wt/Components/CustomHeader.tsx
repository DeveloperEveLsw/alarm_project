import React from 'react';
import { View, Text, SafeAreaView, TouchableOpacity } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type CustomHeaderProps = {
  title: string;
  navigation: NativeStackNavigationProp<any>;
};

const CustomHeader = ({ title, navigation }: CustomHeaderProps) => {
  return (
    <SafeAreaView style={{backgroundColor: '#f5f5f5'}}>
      <View style={{height: 60, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10}}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{paddingRight: 15}}>
          <Text style={{fontSize: 24, color: '#000', fontWeight: 'bold'}}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={{fontSize: 18, fontWeight: 'bold'}}>{title}</Text>
      </View>
    </SafeAreaView>
  );
};

export default CustomHeader;