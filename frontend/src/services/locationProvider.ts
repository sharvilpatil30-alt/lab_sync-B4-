export type LocationMode = 'real-gps' | 'demo-simulated';
export interface LocationState {
  mode: LocationMode;
  error: string | null;
}
export class CampusLocationProvider {
  public state: LocationState = { mode: 'demo-simulated', error: null };
  constructor(private onChange?: (state: LocationState) => void) {}
  public async requestRealLocation(): Promise<LocationState> {
    this.state = { mode: 'demo-simulated', error: 'Indoor GPS positioning is not available for the CSE map. Navigation starts at CSE PORCH; the moving marker is a simulation.' };
    this.onChange?.({ ...this.state });
    return this.state;
  }
  public stopWatching() {}
  public setMode(mode: LocationMode) {
    this.state = { mode, error: null };
    this.onChange?.({ ...this.state });
  }
}
