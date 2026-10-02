<template>
  <div class="mb-6">
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <h3 class="text-sm font-bold text-slate-900 uppercase tracking-wider">
          Sub-Meters & Circuits
        </h3>
        <span class="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-mono font-medium">
          {{ meterList.length }} circuits
        </span>
      </div>
      <div class="text-xs text-slate-500">
        Updated every cycle (~5s)
      </div>
    </div>

    <!-- Active Meters Grid -->
    <div v-if="meterList.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <MeterCard 
        v-for="meter in meterList" 
        :key="meter.prefix"
        :meter="meter" 
        :total-main-power-w="mainPowerW"
      />
    </div>

    <!-- Empty State -->
    <div 
      v-else 
      class="bg-white border border-dashed border-slate-300 rounded-xl p-8 text-center shadow-xs"
    >
      <div class="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
        <Radio class="w-6 h-6 animate-pulse text-cyan-600" />
      </div>
      <h4 class="text-sm font-semibold text-slate-800">Waiting for data from MQTT Broker...</h4>
      <p class="text-xs text-slate-500 mt-1 max-w-md mx-auto">
        Connected and subscribing to topic: 
        <span class="font-mono text-cyan-700 bg-cyan-50 px-1.5 py-0.5 rounded border border-cyan-200">home/main-elec/+/telemetry</span>
        Please wait a moment (typical interval ~5s).
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useMqttStore } from '@/stores/mqttStore'
import MeterCard from './MeterCard.vue'
import { Radio } from 'lucide-vue-next'

const store = useMqttStore()
const device = computed(() => store.activeDevice)

const meterList = computed(() => {
  if (!device.value) return []
  return Object.values(device.value.meters).sort((a, b) => {
    if (a.prefix === 'main_power') return -1
    if (b.prefix === 'main_power') return 1
    return a.prefix.localeCompare(b.prefix)
  })
})

const mainPowerW = computed(() => {
  const main = device.value?.meters['main_power']
  if (main && !main.isReadFailed && typeof main.power === 'number') {
    return main.power
  }
  return 0
})
</script>
