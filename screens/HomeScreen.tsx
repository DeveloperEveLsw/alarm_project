import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Modal, FlatList } from 'react-native';
import LocationAlarmService from '../services/location/LocationAlarmService';

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

const LocationAlarmCard = () => {
    const [destination, setDestination] = useState('');
    const [isTracking, setIsTracking] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    
    // 테스트용 목적지 목록
    const testDestinations = [
        { name: '강남역', lat: 37.497952, lng: 127.027618 },
        { name: '홍대입구역', lat: 37.557527, lng: 126.925227 },
        { name: '잠실역', lat: 37.513294, lng: 127.100516 },
        { name: '명동역', lat: 37.563692, lng: 126.982117 },
        { name: '신촌역', lat: 37.555239, lng: 126.936893 }
    ];

    const startLocationAlarm = async () => {
        if (!destination.trim()) {
            Alert.alert('알림', '목적지를 입력해주세요.');
            return;
        }

        try {
            // 목적지 이름으로 좌표 찾기
            const selectedDestination = testDestinations.find(dest => dest.name === destination);
            const destinationCoords = selectedDestination || {
                lat: 37.497952,
                lng: 127.027618,
                name: destination
            };

            const result = await LocationAlarmService.startLocationAlarm(destinationCoords);
            
            if (result.success) {
                setIsTracking(true);
                Alert.alert('알림', '위치 기반 알람이 시작되었습니다!');
            } else {
                Alert.alert('오류', result.message);
            }
        } catch (error) {
            Alert.alert('오류', '알람 설정에 실패했습니다.');
        }
    };

    const stopLocationAlarm = async () => {
        await LocationAlarmService.stopLocationAlarm();
        setIsTracking(false);
        Alert.alert('알림', '위치 기반 알람이 중지되었습니다.');
    };

    return (
        <View style={{backgroundColor:"#e3f2fd", paddingHorizontal: 20, paddingVertical: 25, borderRadius:15, margin:7}}>
            <Text style={{fontSize:20, fontWeight:"600", marginBottom:15}}>🚌 버스 하차 알림</Text>
            
            <TouchableOpacity
                style={{
                    backgroundColor:"white",
                    padding:15,
                    borderRadius:8,
                    marginBottom:15,
                    flexDirection:"row",
                    justifyContent:"space-between",
                    alignItems:"center"
                }}
                onPress={() => !isTracking && setShowDropdown(true)}
                disabled={isTracking}
            >
                <Text style={{fontSize:16, color: destination ? "#333" : "#999"}}>
                    {destination || "목적지 선택"}
                </Text>
                <Text style={{fontSize:16, color:"#666"}}>▼</Text>
            </TouchableOpacity>

            <Modal
                visible={showDropdown}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowDropdown(false)}
            >
                <TouchableOpacity 
                    style={{flex:1, backgroundColor:"rgba(0,0,0,0.5)", justifyContent:"center", alignItems:"center"}}
                    onPress={() => setShowDropdown(false)}
                >
                    <View style={{backgroundColor:"white", borderRadius:10, padding:20, width:"80%", maxHeight:"50%"}}>
                        <Text style={{fontSize:18, fontWeight:"600", marginBottom:15, textAlign:"center"}}>목적지 선택</Text>
                        <FlatList
                            data={testDestinations}
                            keyExtractor={(item) => item.name}
                            renderItem={({item}) => (
                                <TouchableOpacity
                                    style={{padding:15, borderBottomWidth:1, borderBottomColor:"#eee"}}
                                    onPress={() => {
                                        setDestination(item.name);
                                        setShowDropdown(false);
                                    }}
                                >
                                    <Text style={{fontSize:16}}>{item.name}</Text>
                                    <Text style={{fontSize:12, color:"#666", marginTop:2}}>
                                        위도: {item.lat.toFixed(4)}, 경도: {item.lng.toFixed(4)}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </TouchableOpacity>
            </Modal>
            
            <TouchableOpacity
                style={{
                    backgroundColor: isTracking ? "#f44336" : "#2196f3",
                    padding:15,
                    borderRadius:8,
                    alignItems:"center"
                }}
                onPress={isTracking ? stopLocationAlarm : startLocationAlarm}
            >
                <Text style={{color:"white", fontSize:16, fontWeight:"600"}}>
                    {isTracking ? "알람 중지" : "알람 시작"}
                </Text>
            </TouchableOpacity>
            
            {isTracking && (
                <Text style={{marginTop:10, fontSize:14, color:"#666"}}>
                    📍 위치 추적 중... 목적지 근처에 도착하면 알려드릴게요!
                </Text>
            )}
        </View>
    );
};

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
                }}>모든 상태 꺼진 상태입니다</Text>
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
                <LocationAlarmCard />
                {test_alarmList.map((alarm, index)=>{
                    return <AlarmCard key={`${alarm.title}_${index}`} title={alarm.title} time={alarm.time} toggle={alarm.toggle} />
                })}
            </ScrollView>
        </View>
    )
}

export default HomeScreen