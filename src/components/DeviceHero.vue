<template>
  <div class="bg-white border border-slate-200 rounded-xl p-4 lg:p-5 shadow-sm mb-6">
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      
      <!-- Left: Device identification -->
      <div class="flex items-start sm:items-center gap-3.5">
        <div class="h-12 w-12 rounded-xl bg-cyan-50 border border-cyan-200 flex items-center justify-center shrink-0 text-cyan-600 shadow-xs">
          <Router class="w-6 h-6" />
        </div>
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <h2 class="text-lg font-bold text-slate-900 font-mono tracking-tight">
              {{ device?.deviceId || store.selectedDeviceId || 'No Device Connected' }}
            </h2>
            <!-- Status Badge -->
            <span 
              class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize"
              :class="statusBadgeClasses"
            >
              <span class="w-1.5 h-1.5 rounded-full" :class="statusDotClasses"></span>
              {{ device?.status || 'Waiting Data' }}
            </span>
          </div>
          <p class="text-xs text-slate-500 mt-0.5">
            Fleet Node • Topic: 
            <span class="text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded font-mono">home/main-elec/{{ device?.deviceId || store.selectedDeviceId }}/telemetry</span>
          </p>
        </div>
      </div>

      <!-- Right: Telemetry Metadata (IP, RSSI, Last update) -->
      <div class="flex flex-wrap items-center gap-3 sm:gap-4 text-xs">
        
        <!-- Local IP -->
        <div class="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex items-center gap-2">
          <Globe class="w-4 h-4 text-emerald-600" />
          <div>
            <div class="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Local IP</div>
            <div class="font-mono font-bold text-slate-800">
              {{ device?.localIp || '—' }}
            </div>
          </div>
        </div>

        <!-- Wi-Fi Signal RSSI -->
        <div class="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex items-center gap-2.5">
          <Wifi class="w-4 h-4" :class="rssiColorClass" />
          <div>
            <div class="text-[10px] text-slate-500 uppercase tracking-wider font-semibold flex items-center gap-1">
              Wi-Fi RSSI
              <span class="font-normal lowercase text-[10px]" :class="rssiColorClass">({{ rssiQuality }})</span>
            </div>
            <div class="font-mono font-bold text-slate-800">
              {{ device?.rssi !== undefined ? `${device.rssi} dBm` : '—' }}
            </div>
          </div>
        </div>

        <!-- Last Seen -->
        <div class="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex items-center gap-2">
          <Clock class="w-4 h-4 text-cyan-600" />
          <div>
            <div class="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Last Telemetry</div>
            <div class="font-mono font-bold text-slate-800">
              {{ timeAgo }}
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- Alert Banner: Read Failed Meters Warning -->
    <div 
      v-if="device && device.readFailedMeters && device.readFailedMeters.length > 0"
      class="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex items-start gap-2.5"
    >
      <AlertTriangle class="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
      <div>
        <span class="font-semibold text-amber-900">Meter Read Warning:</span>
        Meter(s)
        <span class="font-mono font-bold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200">
          {{ device.readFailedMeters.join(', ') }}
        </span>
        failed to read in this cycle (missing key in payload — [meter] ... read failed)
      </div>
    </div>

  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useMqttStore } from '@/stores/mqttStore'
import { Router, Globe, Wifi, Clock, AlertTriangle } from 'lucide-vue-next'

const store = useMqttStore()
const device = computed(() => store.activeDevice)

// Reactive time-ago calculation
const now = ref(Date.now())
let timer = null

onMounted(() => {
  timer = window.setInterval(() => {
    now.value = Date.now()
  }, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

const timeAgo = computed(() => {
  if (!device.value?.lastSeen) return 'Never'
  const diffSec = Math.floor((now.value - device.value.lastSeen) / 1000)
  if (diffSec < 0) return 'Just now'
  if (diffSec < 60) return `${diffSec}s ago`
  const min = Math.floor(diffSec / 60)
  return `${min}m ago`
})

const statusBadgeClasses = computed(() => {
  const st = device.value?.status
  if (st === 'online') return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
  if (st === 'offline') return 'bg-rose-50 text-rose-700 border border-rose-200'
  return 'bg-slate-100 text-slate-600 border border-slate-200'
})

const statusDotClasses = computed(() => {
  const st = device.value?.status
  if (st === 'online') return 'bg-emerald-500 animate-pulse'
  if (st === 'offline') return 'bg-rose-500'
  return 'bg-slate-400'
})

const rssiQuality = computed(() => {
  const r = device.value?.rssi
  if (r === undefined) return 'unknown'
  if (r >= -55) return 'excellent'
  if (r >= -67) return 'good'
  if (r >= -78) return 'fair'
  return 'weak'
})

const rssiColorClass = computed(() => {
  const q = rssiQuality.value
  if (q === 'excellent' || q === 'good') return 'text-emerald-600'
  if (q === 'fair') return 'text-amber-600'
  return 'text-rose-600'
})
</script>

