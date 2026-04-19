import * as Cesium from "cesium";

// Central cleanup when we want to clear RailTracks or StationMarkers due to user changing the view
export const clearEntities = (
  viewer: Cesium.Viewer,
  active: Record<string, Cesium.Entity>,
): void => {
  for (const entity of Object.values(active)) {
    viewer.entities.remove(entity);
  }
  for (const key in active) {
    delete active[key];
  }
};
