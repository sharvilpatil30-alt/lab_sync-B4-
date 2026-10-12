import { campusNodes, CampusNode } from '../data/campusMapData';

export type LocationMode = 'real-gps' | 'demo-simulated';

export interface LocationState {
  mode: LocationMode;
  isAvailable: boolean;
  hasPermission: boolean;
  isRequesting: boolean;
  error: string | null;
  latitude: number | null;
  longitude: number | null;
  nearestNodeId: string;
}

// Center point of RIT campus in real-world geo coords (Islampur, Maharashtra)
export const RIT_CAMPUS_GEO = {
  centerLat: 17.0463,
  centerLng: 74.2678,
  latSpan: 0.005, // approx 550m
  lngSpan: 0.006, // approx 600m
};

export class CampusLocationProvider {
  private watchId: number | null = null;
  private onLocationChange?: (state: LocationState) => void;

  public state: LocationState = {
    mode: 'demo-simulated',
    isAvailable: typeof navigator !== 'undefined' && 'geolocation' in navigator,
    hasPermission: false,
    isRequesting: false,
    error: null,
    latitude: null,
    longitude: null,
    nearestNodeId: 'node_gate',
  };

  constructor(onChange?: (state: LocationState) => void) {
    this.onLocationChange = onChange;
  }

  public async requestRealLocation(): Promise<LocationState> {
    if (!this.state.isAvailable) {
      this.state = {
        ...this.state,
        mode: 'demo-simulated',
        error: 'Geolocation is not supported by your browser.',
      };
      this.notify();
      return this.state;
    }

    this.state.isRequesting = true;
    this.notify();

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const nearestNode = this.snapGeoToNearestCampusNode(lat, lng);

          this.state = {
            mode: 'real-gps',
            isAvailable: true,
            hasPermission: true,
            isRequesting: false,
            error: null,
            latitude: lat,
            longitude: lng,
            nearestNodeId: nearestNode.id,
          };
          this.notify();
          resolve(this.state);
        },
        (err) => {
          let errorMsg = 'Location permission denied. Switching to Demo Navigation Mode.';
          if (err.code === err.POSITION_UNAVAILABLE) {
            errorMsg = 'GPS location unavailable. Using Demo Navigation Mode.';
          } else if (err.code === err.TIMEOUT) {
            errorMsg = 'Location request timed out. Using Demo Navigation Mode.';
          }

          this.state = {
            ...this.state,
            mode: 'demo-simulated',
            hasPermission: false,
            isRequesting: false,
            error: errorMsg,
          };
          this.notify();
          resolve(this.state);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
      );
    });
  }

  public startWatching() {
    if (!this.state.isAvailable || this.watchId !== null) return;

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const nearestNode = this.snapGeoToNearestCampusNode(lat, lng);

        this.state = {
          ...this.state,
          mode: 'real-gps',
          hasPermission: true,
          latitude: lat,
          longitude: lng,
          nearestNodeId: nearestNode.id,
        };
        this.notify();
      },
      () => {
        // Fallback silently to demo simulation
      },
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
  }

  public stopWatching() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  public setMode(mode: LocationMode) {
    this.state = { ...this.state, mode };
    this.notify();
  }

  private snapGeoToNearestCampusNode(lat: number, lng: number): CampusNode {
    // Normalization to canvas 1200 x 850 bounding box
    const relLat = (lat - (RIT_CAMPUS_GEO.centerLat - RIT_CAMPUS_GEO.latSpan / 2)) / RIT_CAMPUS_GEO.latSpan;
    const relLng = (lng - (RIT_CAMPUS_GEO.centerLng - RIT_CAMPUS_GEO.lngSpan / 2)) / RIT_CAMPUS_GEO.lngSpan;

    const projectedX = Math.max(60, Math.min(1050, relLng * 1100));
    const projectedY = Math.max(100, Math.min(750, (1 - relLat) * 800));

    // Find nearest campus node
    let bestNode = campusNodes[0];
    let minD = Infinity;

    for (const node of campusNodes) {
      const d = Math.hypot(node.x - projectedX, node.y - projectedY);
      if (d < minD) {
        minD = d;
        bestNode = node;
      }
    }

    return bestNode;
  }

  private notify() {
    if (this.onLocationChange) {
      this.onLocationChange({ ...this.state });
    }
  }
}
