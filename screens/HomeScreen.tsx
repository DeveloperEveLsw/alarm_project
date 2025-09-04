import { useState } from 'react';
import { StatusBar, StyleSheet, useColorScheme, View, Text, ScrollView  } from 'react-native';

const AlarmCard = ({title,time,toggle}:{title?:string,time:string,toggle:boolean}) => {
    return ( 
    <View style={{backgroundColor:"white", paddingHorizontal: 20, paddingVertical: 25, borderRadius:15, margin:7}}>
        <View>
            <Text style={title ? {fontSize:25} : {display:"none"}}>{title}</Text>
        </View>
        <View style={{flexDirection:"row"}}>
            <Text style={{fontSize:15}}>{time}</Text>
            <Text style={{marginLeft:"auto"}}>{toggle ? "켜짐" : "꺼짐"}</Text>
        </View>
    </View>
    )
}

const HomeScreen = () => {

    const test_alarmList = [
        { title:"이 알람은 제목이 있어요",time:"오전 7:00",toggle:false },
        { title:"이 아래 알람은 제목이 없어요",time:"오전 7:03",toggle:true },
        { title:undefined,time:"오전 7:07",toggle:false },
        { title:"이제 자야해",time:"오후 11:00",toggle:true },
        { title:"스크롤 해보셈",time:"오전 8:00",toggle:true }
    ]

    return (
        <View style={{flex:1}}>
            <View style={{
                alignItems:"center",
                marginTop: 100,
                marginBottom: 100
                }}>
                <Text style={{
                    fontSize:30,
                    fontWeight:"600"
                }}>모든 알람이 꺼진 상태입니다</Text>
            </View>
            <View>
                <View style={{
                    flexDirection:"row-reverse",
                    marginRight:30
                }}>
                    <Text style={{fontSize:55, fontWeight:"200"}}>+</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 95 }}>
                {test_alarmList.map(alarm=>{
                    return <AlarmCard key={alarm.title} title={alarm.title} time={alarm.time} toggle={alarm.toggle} />
                })}
            </ScrollView>
        </View>
    )
}

export default HomeScreen