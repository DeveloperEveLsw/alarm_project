import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Modal, FlatList, TextInput } from 'react-native';
import { alarmService, scheduleService, initializeDatabase } from '../services';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation.types';
import MapLocationPicker from '../Components/MapLocationPicker';
import { LocationBasedSettings } from '../types/alarm.types';

const AlarmCard = ({id, title, time, toggle, onToggle, onDelete}: {
    id: number;
    title?: string;
    time: string;
    toggle: boolean;
    onToggle: (id: number) => void;
    onDelete: (id: number) => void;
}) => {
    return ( 
    <View style={{backgroundColor:"white", paddingHorizontal: 20, paddingVertical: 25, borderRadius:15, margin:7}}>
        <View style={{flexDirection:"row", justifyContent:"space-between", alignItems:"center"}}>
            <View style={{flex: 1}}>
                <Text style={title ? {fontSize:25, fontWeight:"600"} : {display:"none"}}>{title}</Text>
                <Text style={{fontSize:15, color:"#666"}}>{time}</Text>
            </View>
            <View style={{flexDirection:"row", alignItems:"center"}}>
                <TouchableOpacity 
                    style={{
                        backgroundColor: toggle ? "#4CAF50" : "#E0E0E0",
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 15,
                        marginRight: 10
                    }}
                    onPress={() => onToggle(id)}
                >
                    <Text style={{color: toggle ? "white" : "#666", fontSize: 12}}>
                        {toggle ? "켜짐" : "꺼짐"}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={{
                        backgroundColor: "#f44336",
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 10
                    }}
                    onPress={() => onDelete(id)}
                >
                    <Text style={{color: "white", fontSize: 12}}>삭제</Text>
                </TouchableOpacity>
            </View>
        </View>
    </View>
    )
}

const AddAlarmCard = () => {
    const [showModal, setShowModal] = useState(false);
    const [alarmTitle, setAlarmTitle] = useState('');
    const [alarmTime, setAlarmTime] = useState('');
    const queryClient = useQueryClient();

    const createAlarmMutation = useMutation({
        mutationFn: async () => {
            console.log('🔄 알람 생성 시작:', { alarmTitle, alarmTime });
            console.log('🔧 alarmService 상태:', alarmService);
            console.log('🔧 alarmService.databaseService 상태:', (alarmService as any).databaseService);
            
            if (!alarmTitle.trim() || !alarmTime.trim()) {
                throw new Error('제목과 시간을 입력해주세요.');
            }
            
            try {
                const result = await alarmService.createAlarm({
                    time: alarmTime,
                    title: alarmTitle,
                    isSystemAlarm: true
                });
                console.log('✅ 알람 생성 성공:', result);
                return result;
            } catch (error) {
                console.error('❌ 알람 생성 실패:', error);
                throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['alarms'] });
            setShowModal(false);
            setAlarmTitle('');
            setAlarmTime('');
            Alert.alert('성공', '알람이 추가되었습니다!');
        },
        onError: (error) => {
            console.error('알람 생성 오류:', error);
            Alert.alert('오류', `알람 생성 실패: ${error.message}`);
        }
    });

    const handleAddAlarm = () => {
        createAlarmMutation.mutate();
    };

    return (
        <>
            <TouchableOpacity
                style={{
                    backgroundColor: "#4CAF50",
                    paddingHorizontal: 20,
                    paddingVertical: 15,
                    borderRadius: 15,
                    margin: 7,
                    alignItems: "center"
                }}
                onPress={() => setShowModal(true)}
            >
                <Text style={{ color: "white", fontSize: 18, fontWeight: "600" }}>
                    + 알람 추가
                </Text>
            </TouchableOpacity>

            <Modal
                visible={showModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowModal(false)}
            >
                <View style={{
                    flex: 1,
                    backgroundColor: "rgba(0,0,0,0.5)",
                    justifyContent: "center",
                    alignItems: "center"
                }}>
                    <View style={{
                        backgroundColor: "white",
                        borderRadius: 15,
                        padding: 20,
                        width: "80%",
                        maxWidth: 400
                    }}>
                        <Text style={{
                            fontSize: 20,
                            fontWeight: "600",
                            marginBottom: 20,
                            textAlign: "center"
                        }}>
                            새 알람 추가
                        </Text>

                        <TextInput
                            style={{
                                borderWidth: 1,
                                borderColor: "#ddd",
                                borderRadius: 8,
                                padding: 12,
                                marginBottom: 15,
                                fontSize: 16
                            }}
                            placeholder="알람 제목"
                            value={alarmTitle}
                            onChangeText={setAlarmTitle}
                        />

                        <TextInput
                            style={{
                                borderWidth: 1,
                                borderColor: "#ddd",
                                borderRadius: 8,
                                padding: 12,
                                marginBottom: 20,
                                fontSize: 16
                            }}
                            placeholder="시간 (예: 07:00)"
                            value={alarmTime}
                            onChangeText={setAlarmTime}
                        />

                        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                            <TouchableOpacity
                                style={{
                                    backgroundColor: "#f44336",
                                    paddingHorizontal: 20,
                                    paddingVertical: 12,
                                    borderRadius: 8,
                                    flex: 1,
                                    marginRight: 10
                                }}
                                onPress={() => setShowModal(false)}
                            >
                                <Text style={{ color: "white", textAlign: "center", fontWeight: "600" }}>
                                    취소
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={{
                                    backgroundColor: "#2196f3",
                                    paddingHorizontal: 20,
                                    paddingVertical: 12,
                                    borderRadius: 8,
                                    flex: 1,
                                    marginLeft: 10
                                }}
                                onPress={handleAddAlarm}
                                disabled={createAlarmMutation.isPending}
                            >
                                <Text style={{ color: "white", textAlign: "center", fontWeight: "600" }}>
                                    {createAlarmMutation.isPending ? "추가 중..." : "추가"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    );
};

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Main'>;

const HomeScreen = () => {
    const navigation = useNavigation<HomeScreenNavigationProp>();
    const queryClient = useQueryClient();
    const [isMapPickerVisible, setIsMapPickerVisible] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState<LocationBasedSettings | null>(null);

    // DB 초기화
    useEffect(() => {
        const initDB = async () => {
            try {
                console.log('🔄 HomeScreen에서 DB 초기화 시작');
                console.log('🔧 alarmService 상태 확인:', alarmService);
                console.log('🔧 alarmService.databaseService 상태 확인:', (alarmService as any).databaseService);
                
                await initializeDatabase();
                console.log('✅ HomeScreen에서 DB 초기화 완료');
                
                // 초기화 후 다시 확인
                console.log('🔧 초기화 후 alarmService.databaseService 상태 확인:', (alarmService as any).databaseService);
            } catch (error) {
                console.error('❌ HomeScreen에서 DB 초기화 실패:', error);
            }
        };
        initDB();
    }, []);

    // 알람 목록 조회
    const { data: alarms = [], isLoading } = useQuery({
        queryKey: ['alarms'],
        queryFn: async () => {
            console.log('🔄 알람 목록 조회 시작');
            console.log('🔧 alarmService 상태:', alarmService);
            console.log('🔧 alarmService.databaseService 상태:', (alarmService as any).databaseService);
            
            try {
                const result = await alarmService.getAllAlarms();
                console.log('✅ 알람 목록 조회 성공:', result);
                return result;
            } catch (error) {
                console.error('❌ 알람 목록 조회 실패:', error);
                throw error;
            }
        },
    });

    // 알람 삭제
    const deleteAlarmMutation = useMutation({
        mutationFn: async (alarmId: number) => {
            console.log('🔄 알람 삭제 시작:', alarmId);
            console.log('🔧 alarmService 상태:', alarmService);
            
            try {
                await alarmService.deleteAlarm(alarmId);
                console.log('✅ 알람 삭제 성공:', alarmId);
            } catch (error) {
                console.error('❌ 알람 삭제 실패:', error);
                throw error;
            }
        },
        onSuccess: () => {
            console.log('🔄 쿼리 무효화 시작');
            queryClient.invalidateQueries({ queryKey: ['alarms'] });
            Alert.alert('성공', '알람이 삭제되었습니다.');
        },
        onError: (error) => {
            console.error('알람 삭제 오류:', error);
            Alert.alert('오류', `알람 삭제 실패: ${error.message}`);
        }
    });

    // 알람 토글 (켜기/끄기)
    const toggleAlarmMutation = useMutation({
        mutationFn: async (alarmId: number) => {
            console.log('🔄 알람 토글 시작:', alarmId);
            console.log('🔧 현재 알람 목록:', alarms);
            
            const alarm = alarms.find(a => a.id === alarmId);
            if (!alarm) {
                console.error('❌ 알람을 찾을 수 없습니다:', alarmId);
                throw new Error('알람을 찾을 수 없습니다.');
            }
            
            console.log('🔧 찾은 알람:', alarm);
            console.log('🔧 현재 상태:', alarm.isSystemAlarm);
            console.log('🔧 변경할 상태:', !alarm.isSystemAlarm);
            
            try {
                if (alarm.isSystemAlarm) {
                    console.log('🔄 OS 알람 취소 중...');
                    await alarmService.cancelSystemAlarm(alarmId);
                }
                
                console.log('🔄 알람 상태 업데이트 중...');
                await alarmService.updateAlarm(alarmId, {
                    isSystemAlarm: !alarm.isSystemAlarm
                });
                console.log('✅ 알람 토글 성공');
            } catch (error) {
                console.error('❌ 알람 토글 실패:', error);
                throw error;
            }
        },
        onSuccess: () => {
            console.log('🔄 쿼리 무효화 시작');
            queryClient.invalidateQueries({ queryKey: ['alarms'] });
        },
        onError: (error) => {
            console.error('알람 토글 오류:', error);
            Alert.alert('오류', `알람 토글 실패: ${error.message}`);
        }
    });

    const handleToggleAlarm = (alarmId: number) => {
        console.log('🔄 handleToggleAlarm 호출:', alarmId);
        console.log('🔧 toggleAlarmMutation 상태:', toggleAlarmMutation);
        toggleAlarmMutation.mutate(alarmId);
    };

    const handleDeleteAlarm = (alarmId: number) => {
        console.log('🔄 handleDeleteAlarm 호출:', alarmId);
        console.log('🔧 deleteAlarmMutation 상태:', deleteAlarmMutation);
        Alert.alert(
            '알람 삭제',
            '정말로 이 알람을 삭제하시겠습니까?',
            [
                { text: '취소', style: 'cancel' },
                { text: '삭제', style: 'destructive', onPress: () => {
                    console.log('🔄 삭제 확인됨, mutation 실행');
                    deleteAlarmMutation.mutate(alarmId);
                }}
            ]
        );
    };

    const handleLocationSelect = (location: LocationBasedSettings) => {
        setSelectedLocation(location);
        setIsMapPickerVisible(false);
        Alert.alert(
            '위치 선택 완료',
            `위도 ${location.latitude?.toFixed(4)}, 경도 ${location.longitude?.toFixed(4)}`
        );
    };

    return (
        <View style={{flex:1}}>
            <View style={{
                alignItems:"center",
                marginTop: 50,
                marginBottom: 30
            }}>
                <Text style={{
                    fontSize:24,
                    fontWeight:"600"
                }}>알람 관리</Text>
                
                <View style={{ flexDirection: "row", flexWrap: 'wrap', marginTop: 10 }}>
                    <TouchableOpacity
                        style={{
                            backgroundColor: "#ff9800",
                            paddingHorizontal: 15,
                            paddingVertical: 8,
                            borderRadius: 20,
                            marginRight: 10
                        }}
                        onPress={() => navigation.navigate('TestAlarm')}
                    >
                        <Text style={{ color: "white", fontSize: 14, fontWeight: "600" }}>
                            🧪 알람 테스트
                        </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                        style={{
                            backgroundColor: "#9c27b0",
                            paddingHorizontal: 15,
                            paddingVertical: 8,
                            borderRadius: 20,
                            marginRight: 10
                        }}
                        onPress={() => navigation.navigate('DBTest')}
                    >
                        <Text style={{ color: "white", fontSize: 14, fontWeight: "600" }}>
                            🔧 DB 테스트
                        </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                        style={{
                            backgroundColor: "#607d8b",
                            paddingHorizontal: 15,
                            paddingVertical: 8,
                            borderRadius: 20,
                            marginRight: 10
                        }}
                        onPress={() => navigation.navigate('DBConnectionTest')}
                    >
                        <Text style={{ color: "white", fontSize: 14, fontWeight: "600" }}>
                            🔗 연결 테스트
                        </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                        style={{
                            backgroundColor: "#795548",
                            paddingHorizontal: 15,
                            paddingVertical: 8,
                            borderRadius: 20,
                            marginRight: 10
                        }}
                        onPress={() => navigation.navigate('SimpleAlarmTest')}
                    >
                        <Text style={{ color: "white", fontSize: 14, fontWeight: "600" }}>
                            🚨 알람 테스트
                        </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                        style={{
                            backgroundColor: "#e91e63",
                            paddingHorizontal: 15,
                            paddingVertical: 8,
                            borderRadius: 20
                        }}
                        onPress={() => navigation.navigate('AlarmTest')}
                    >
                        <Text style={{ color: "white", fontSize: 14, fontWeight: "600" }}>
                            🔔 울림 테스트
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={{
                            backgroundColor: "#2196f3",
                            paddingHorizontal: 15,
                            paddingVertical: 8,
                            borderRadius: 20,
                            marginTop: 10
                        }}
                        onPress={() => setIsMapPickerVisible(true)}
                    >
                        <Text style={{ color: "white", fontSize: 14, fontWeight: "600" }}>
                            📍 위치 선택
                        </Text>
                    </TouchableOpacity>
                </View>

                {selectedLocation?.latitude && selectedLocation?.longitude ? (
                    <Text style={{ marginTop: 8, fontSize: 12, color: "#555" }}>
                        선택된 위치: {selectedLocation.latitude.toFixed(4)}, {selectedLocation.longitude.toFixed(4)}
                    </Text>
                ) : null}
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 95 }}>
                <AddAlarmCard />
                
                {isLoading ? (
                    <View style={{ alignItems: "center", padding: 20 }}>
                        <Text>알람 목록을 불러오는 중...</Text>
                    </View>
                ) : alarms.length === 0 ? (
                    <View style={{ alignItems: "center", padding: 20 }}>
                        <Text style={{ color: "#666", fontSize: 16 }}>
                            등록된 알람이 없습니다.
                        </Text>
                        <Text style={{ color: "#999", fontSize: 14, marginTop: 5 }}>
                            + 버튼을 눌러 알람을 추가해보세요!
                        </Text>
                    </View>
                ) : (
                    alarms.map((alarm) => (
                        <AlarmCard
                            key={alarm.id}
                            id={alarm.id}
                            title={alarm.title}
                            time={alarm.time}
                            toggle={alarm.isSystemAlarm}
                            onToggle={handleToggleAlarm}
                            onDelete={handleDeleteAlarm}
                        />
                    ))
                )}
            </ScrollView>
            <MapLocationPicker
                visible={isMapPickerVisible}
                onClose={() => setIsMapPickerVisible(false)}
                onLocationSelect={handleLocationSelect}
                initialLocation={selectedLocation ?? undefined}
            />
        </View>
    )
}

export default HomeScreen
