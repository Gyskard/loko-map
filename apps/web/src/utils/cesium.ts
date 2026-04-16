import * as Cesium from "cesium";

/**
 * Remove all entities in `active` from the viewer and clear the record.
 * Centralises the repeated remove-then-delete pattern used in RailTracks
 * and StationMarkers.
 */
export function clearEntities(
  viewer: Cesium.Viewer,
  active: Record<string, Cesium.Entity>,
): void {
  for (const entity of Object.values(active)) {
    viewer.entities.remove(entity);
  }
  for (const key in active) {
    delete active[key];
  }
}
