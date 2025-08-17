<template>
  <div ref="mapContainer" class="map" />
</template>

<script setup lang="ts">
import { useMapStore } from '@/stores/mapStores'
import { ref, onMounted } from 'vue'

const mapContainer = ref<HTMLDivElement | null>(null)
const mapStore = useMapStore()

onMounted(() => {
  if (mapContainer.value) {
    mapStore.initMap(mapContainer.value)
  }
})
</script>

<style>
.map {
    height: 750px;
    width: 750px;
}
</style>