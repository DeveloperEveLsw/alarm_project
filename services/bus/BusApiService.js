// 김포시 버스 API 서비스 (경기도 버스정보 API 사용)
class BusApiService {
  constructor() {
    this.baseUrl = 'http://openapi.gbis.go.kr/ws/rest';
    this.serviceKey = 'YOUR_GYEONGGI_API_KEY'; // 공공데이터포털에서 발급받은 경기도 버스 API 키
    this.cityCode = '31230'; // 김포시 코드
  }

  /**
   * 김포시 정류장 버스 도착 정보 조회
   * @param {string} stationId - 정류장 ID
   * @returns {Promise<Array>} 버스 도착 정보 배열
   */
  async getBusArrivalInfo(stationId) {
    try {
      const url = `${this.baseUrl}/arrivalinfo`;
      const params = new URLSearchParams({
        serviceKey: this.serviceKey,
        stationId: stationId
      });

      const response = await fetch(`${url}?${params}`);
      const text = await response.text();
      
      // XML 응답을 파싱 (React Native에서는 DOMParser가 없으므로 간단한 파싱 사용)
      console.log('XML 응답:', text);
      
      // 임시로 빈 배열 반환 (실제 구현에서는 XML 파싱 필요)
      return [];
    } catch (error) {
      console.error('김포시 버스 도착정보 조회 실패:', error);
      return [];
    }
  }

  /**
   * 김포시 위치 기반 주변 정류장 조회
   * @param {number} lat - 위도
   * @param {number} lng - 경도
   * @param {number} radius - 반경(미터)
   * @returns {Promise<Array>} 주변 정류장 배열
   */
  async getNearbyStations(lat, lng, radius = 500) {
    try {
      const url = `${this.baseUrl}/station`;
      const params = new URLSearchParams({
        serviceKey: this.serviceKey,
        x: lng,
        y: lat,
        radius: radius
      });

      const response = await fetch(`${url}?${params}`);
      const text = await response.text();
      
      // XML 응답을 파싱 (React Native에서는 DOMParser가 없으므로 간단한 파싱 사용)
      console.log('XML 응답:', text);
      
      // 임시로 빈 배열 반환 (실제 구현에서는 XML 파싱 필요)
      return [];
    } catch (error) {
      console.error('김포시 주변 정류장 조회 실패:', error);
      return [];
    }
  }

  /**
   * 경로 정보 조회 (목적지까지의 버스 경로)
   * @param {object} start - 출발지 {lat, lng}
   * @param {object} end - 목적지 {lat, lng}
   * @returns {Promise<object>} 경로 정보
   */
  async getBusRoute(start, end) {
    try {
      // 실제로는 더 복잡한 경로 탐색 API 사용
      // 여기서는 간단한 예시
      const startStations = await this.getNearbyStations(start.lat, start.lng, 300);
      const endStations = await this.getNearbyStations(end.lat, end.lng, 300);
      
      if (startStations.length === 0 || endStations.length === 0) {
        return null;
      }

      // 출발지 근처 정류장의 버스 정보 조회
      const busInfo = await this.getBusArrivalInfo(startStations[0].stationId);
      
      return {
        startStation: startStations[0],
        endStations: endStations,
        availableBuses: busInfo,
        estimatedTime: 20 // 예상 소요시간(분)
      };
    } catch (error) {
      console.error('경로 조회 실패:', error);
      return null;
    }
  }

  /**
   * 특정 버스의 실시간 위치 추적
   * @param {string} routeNo - 버스 노선번호
   * @param {string} vehicleNo - 차량번호
   * @returns {Promise<object>} 버스 위치 정보
   */
  async trackBusLocation(routeNo, vehicleNo) {
    try {
      const url = `${this.baseUrl}/buspos/getBusPosByRtid`;
      const params = new URLSearchParams({
        serviceKey: this.serviceKey,
        busRouteId: routeNo,
        resultType: 'json'
      });

      const response = await fetch(`${url}?${params}`);
      const data = await response.json();
      
      if (data.msgHeader.headerCd === '0') {
        const targetBus = data.msgBody.itemList.find(
          bus => bus.plainNo === vehicleNo
        );
        
        if (targetBus) {
          return {
            vehicleNo: targetBus.plainNo,
            routeNo: routeNo,
            lat: targetBus.gpsY,
            lng: targetBus.gpsX,
            stationName: targetBus.stNm,
            direction: targetBus.direc
          };
        }
      }
      
      return null;
    } catch (error) {
      console.error('버스 위치 추적 실패:', error);
      return null;
    }
  }

  /**
   * 도착시간을 사용자 친화적 형태로 변환
   * @param {string} predictTime - 예상 도착시간(분)
   * @returns {string} 형식화된 도착시간
   */
  formatArrivalTime(predictTime) {
    if (!predictTime) return '정보없음';
    
    const minutes = parseInt(predictTime, 10);
    if (isNaN(minutes)) return '정보없음';
    
    if (minutes <= 0) return '곧도착';
    if (minutes === 1) return '1분후';
    return `${minutes}분후`;
  }

  /**
   * 버스 타입 변환
   * @param {string} routeTypeName - 노선 타입명
   * @returns {string} 표준화된 버스 타입
   */
  getBusType(routeTypeName) {
    if (!routeTypeName) return '일반버스';
    
    const type = routeTypeName.toLowerCase();
    if (type.includes('간선') || type.includes('trunk')) return '간선버스';
    if (type.includes('지선') || type.includes('branch')) return '지선버스';
    if (type.includes('순환') || type.includes('circular')) return '순환버스';
    if (type.includes('광역') || type.includes('express')) return '광역버스';
    if (type.includes('마을') || type.includes('village')) return '마을버스';
    
    return '일반버스';
  }
}

export default new BusApiService();