import { defineStore } from 'pinia'
import { ref } from 'vue'
import maplibregl, { Map } from 'maplibre-gl'
import { markRaw } from 'vue';

export const useMapStore = defineStore('map', () => {
  /* --- STATE --- */

  const map = ref<Map | null>(null)
  const center = ref<[number, number]>([0, 0])
  const zoom = ref(2)

  /* --- ACTIONS --- */

  const initMap = (container: HTMLElement, options?: Partial<maplibregl.MapOptions>) => {
    map.value = markRaw(new Map({
      container,
      style: 'https://demotiles.maplibre.org/style.json',
      center: center.value,
      zoom: zoom.value,
      ...options
    }))}

  const deleteMap = () => {
    map.value?.remove()
    map.value = null
  }

  return {
    map, center, zoom,
    initMap, deleteMap
  }
});