// 김포시 테스트용 데모 버스 API 서비스
class DemoBusApiService {
  constructor() {
    // 김포시 주요 지역 정류장 데모 데이터
    this.demoStations = [
      // 김포공항 주변
      {
        stationId: 'GPO31001',
        stationName: '김포공항',
        lat: 37.558598,
        lng: 126.794374,
        distance: 50
      },
      {
        stationId: 'GPO31002',
        stationName: '김포공항.국내선청사',
        lat: 37.557283,
        lng: 126.795728,
        distance: 120
      },
      // 김포시청 주변
      {
        stationId: 'GPO31010',
        stationName: '김포시청',
        lat: 37.615935,
        lng: 126.715399,
        distance: 80
      },
      {
        stationId: 'GPO31011',
        stationName: '김포시청.김포한강신도시',
        lat: 37.613245,
        lng: 126.717891,
        distance: 200
      },
      // 사우동 주변
      {
        stationId: 'GPO31020',
        stationName: '사우역',
        lat: 37.590533,
        lng: 126.726764,
        distance: 90
      },
      {
        stationId: 'GPO31021',
        stationName: '사우동.김포대학교',
        lat: 37.588245,
        lng: 126.729156,
        distance: 150
      }
    ];

    // 김포시 데모 버스 도착 정보
    this.demoBusInfo = {
      'GPO31001': [ // 김포공항
        {
          routeNo: '6000',
          vehicleNo: 'GP1234',
          stationName: '김포공항',
          arrivalTime: '3분후',
          arrivalMin: 3,
          direction: '여의도.강남방면',
          busType: '광역버스'
        },
        {
          routeNo: '9000',
          vehicleNo: 'GP5678',
          stationName: '김포공항',
          arrivalTime: '7분후',
          arrivalMin: 7,
          direction: '잠실.송파방면',
          busType: '광역버스'
        }
      ],
      'GPO31010': [ // 김포시청
        {
          routeNo: '6-1',
          vehicleNo: 'GP1111',
          stationName: '김포시청',
          arrivalTime: '2분후',
          arrivalMin: 2,
          direction: '김포공항방면',
          busType: '시내버스'
        },
        {
          routeNo: '16',
          vehicleNo: 'GP2222',
          stationName: '김포시청',
          arrivalTime: '8분후',
          arrivalMin: 8,
          direction: '김포터미널방면',
          busType: '시내버스'
        }
      ],
      'GPO31020': [ // 사우역
        {
          routeNo: '5',
          vehicleNo: 'GP3333',
          stationName: '사우역',
          arrivalTime: '4분후',
          arrivalMin: 4,
          direction: '김포공항방면',
          busType: '시내버스'
        },
        {
          routeNo: '6001',
          vehicleNo: 'GP4444',
          stationName: '사우역',
          arrivalTime: '12분후',
          arrivalMin: 12,
          direction: '서울역방면',
          busType: '광역버스'
        }
      ]
    };
  }

  /**
   * 데모용 버스 도착 정보 조회
   */
  async getBusArrivalInfo(stationId) {
    // 실제 API 호출을 시뮬레이션하기 위한 지연
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log(`🚌 정류장 ${stationId}의 버스 도착 정보 조회`);
    
    // 해당 정류장의 버스 정보 반환, 없으면 빈 배열
    return this.demoBusInfo[stationId] || [];
  }

  /**
   * 데모용 주변 정류장 조회
   */
  async getNearbyStations(lat, lng, radius = 500) {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log(`📍 위치 (${lat}, ${lng}) 주변 정류장 조회`);
    return this.demoStations;
  }

  /**
   * 데모용 버스 경로 조회
   */
  async getBusRoute(start, end) {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    console.log(`🗺️ 경로 조회: (${start.lat}, ${start.lng}) → (${end.lat}, ${end.lng})`);
    
    // 출발지에서 가장 가까운 정류장 찾기
    const startStation = this.findNearestStation(start.lat, start.lng);
    
    // 목적지에서 가장 가까운 정류장 찾기
    const endStation = this.findNearestStation(end.lat, end.lng);
    
    // 출발지 정류장의 버스 정보
    const availableBuses = this.demoBusInfo[startStation.stationId] || [];
    
    return {
      startStation: startStation,
      endStations: [endStation],
      availableBuses: availableBuses,
      estimatedTime: Math.floor(Math.random() * 30) + 15 // 15-45분 랜덤
    };
  }
  
  /**
   * 가장 가까운 정류장 찾기
   */
  findNearestStation(lat, lng) {
    let nearestStation = this.demoStations[0];
    let minDistance = this.calculateDistance(lat, lng, nearestStation.lat, nearestStation.lng);
    
    this.demoStations.forEach(station => {
      const distance = this.calculateDistance(lat, lng, station.lat, station.lng);
      if (distance < minDistance) {
        minDistance = distance;
        nearestStation = station;
      }
    });
    
    return nearestStation;
  }
  
  /**
   * 두 점 사이의 거리 계산 (km)
   */
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // 지구 반지름 (km)
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
  
  toRadians(degrees) {
    return degrees * (Math.PI/180);
  }

  /**
   * 데모용 버스 위치 추적
   */
  async trackBusLocation(routeNo, vehicleNo) {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    console.log(`🔍 버스 추적: ${routeNo}번 (${vehicleNo})`);
    
    return {
      vehicleNo: vehicleNo,
      routeNo: routeNo,
      lat: 37.500000 + (Math.random() - 0.5) * 0.01, // 강남역 주변 랜덤 위치
      lng: 127.027000 + (Math.random() - 0.5) * 0.01,
      stationName: '강남역 근처',
      direction: '신정네거리방면'
    };
  }

  /**
   * 실제 API 호출 여부 확인
   */
  isDemo() {
    return true;
  }
}

export default new DemoBusApiService();
