<template>
  <div 
    class="bg-white border rounded-xl p-4 transition-all relative overflow-hidden flex flex-col justify-between shadow-xs"
    :class="{
      'border-slate-200 hover:border-slate-300 hover:shadow-md': !meter.isReadFailed,
      'border-rose-300 bg-rose-50/40': meter.isReadFailed
    }"
  >
    <!-- Top accent border line based on meter type -->
    <div 
      class="absolute top-0 left-0 right-0 h-1"
      :class="accentClass"
    ></div>

    <div>
      <!-- Header: Title, Prefix, Status -->
      <div class="flex items-start justify-between gap-2 mb-3.5 pt-1">
        <div>
          <div class="flex items-center gap-2">
            <h3 class="text-sm font-bold text-slate-900 tracking-tight">
              {{ meter.name }}
            </h3>
            <span class="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
              {{ meter.prefix }}
            </span>
          </div>
          <p class="text-[11px] text-slate-500 mt-0.5">
            {{ isMain ? 'Incoming Feeder' : 'Branch Circuit' }}
          </p>
        </div>

        <!-- Health Status Badge -->
        <span 
          v-if="!meter.isReadFailed" 
          class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          Active
        </span>
        <span 
          v-else 
          class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200"
          title="This meter failed to read in the current cycle; stale values cleared"
        >
          <AlertCircle class="w-3 h-3 text-rose-600" />
          Read Failed
        </span>
      </div>

      <!-- Warning overlay if read failed -->
      <div 
        v-if="meter.isReadFailed" 
        class="mb-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-[11px] text-rose-800 flex items-center gap-2"
      >
        <AlertTriangle class="w-3.5 h-3.5 shrink-0 text-rose-600" />
        <span>[meter] {{ meter.prefix }} read failed — no data in this transmission cycle</span>
      </div>

      <!-- Main Power Callout -->
      <div class="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-3.5">
        <div class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
          <span>Active Power</span>
          <span v-if="!meter.isReadFailed && typeof meter.kw === 'number'" class="text-xs font-mono font-bold text-cyan-700">
            {{ meter.kw.toFixed(4) }} kW
          </span>
        </div>
        <div class="flex items-baseline gap-2">
          <span 
            class="text-2xl font-extrabold font-mono tracking-tight"
            :class="meter.isReadFailed ? 'text-slate-400' : 'text-slate-900'"
          >
            {{ meter.isReadFailed || meter.power === undefined ? '—' : meter.power.toFixed(1) }}
          </span>
          <span class="text-xs font-semibold text-slate-500 font-mono">W</span>
        </div>

        <!-- Load distribution progress bar (relative to total main power) -->
        <div v-if="!meter.isReadFailed && loadPercent !== null" class="mt-2">
          <div class="flex justify-between text-[10px] text-slate-500 mb-1">
            <span>Load Share:</span>
            <span class="font-mono text-slate-700 font-medium">{{ loadPercent }}%</span>
          </div>
          <div class="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
            <div 
              class="h-1.5 rounded-full transition-all duration-500"
              :class="isMain ? 'bg-cyan-600' : 'bg-emerald-500'"
              :style="{ width: `${Math.min(loadPercent, 100)}%` }"
            ></div>
          </div>
        </div>
      </div>

      <!-- Electrical Metrics Grid -->
      <div class="grid grid-cols-2 gap-2 text-xs">
        
        <!-- Voltage -->
        <div class="bg-white rounded-lg p-2 border border-slate-200 shadow-2xs">
          <div class="text-[10px] text-slate-500 font-semibold uppercase">Voltage</div>
          <div class="font-mono font-bold text-slate-800 mt-0.5">
            {{ meter.isReadFailed || meter.volt === undefined ? '—' : `${meter.volt.toFixed(1)} V` }}
          </div>
        </div>

        <!-- Current -->
        <div class="bg-white rounded-lg p-2 border border-slate-200 shadow-2xs">
          <div class="text-[10px] text-slate-500 font-semibold uppercase">Current</div>
          <div class="font-mono font-bold text-slate-800 mt-0.5">
            {{ meter.isReadFailed || meter.current === undefined ? '—' : `${meter.current.toFixed(3)} A` }}
          </div>
        </div>

        <!-- Frequency -->
        <div class="bg-white rounded-lg p-2 border border-slate-200 shadow-2xs">
          <div class="text-[10px] text-slate-500 font-semibold uppercase">Frequency</div>
          <div class="font-mono font-bold text-slate-800 mt-0.5">
            {{ meter.isReadFailed || meter.freq === undefined ? '—' : `${meter.freq.toFixed(1)} Hz` }}
          </div>
        </div>

        <!-- Power Factor -->
        <div class="bg-white rounded-lg p-2 border border-slate-200 shadow-2xs">
          <div class="text-[10px] text-slate-500 font-semibold uppercase">Power Factor (PF)</div>
          <div class="font-mono font-bold text-slate-800 mt-0.5">
            {{ meter.isReadFailed || meter.pf === undefined ? '—' : meter.pf.toFixed(2) }}
          </div>
        </div>

      </div>
    </div>

    <!-- Footer: Energy Accumulation (kWh) -->
    <div class="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
      <span class="text-slate-500 font-medium">Accumulated Energy:</span>
      <div class="text-right">
        <span class="font-mono font-bold text-slate-900">
          {{ meter.kwh !== undefined ? `${meter.kwh.toLocaleString('en-US', { minimumFractionDigits: 3 })} kWh` : '—' }}
        </span>
        <div v-if="meter.energy !== undefined" class="text-[10px] text-slate-400 font-mono">
          ({{ meter.energy.toLocaleString('en-US') }} Wh)
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { computed } from 'vue'
import { AlertCircle, AlertTriangle } from 'lucide-vue-next'

const props = defineProps({
  meter: {
    type: Object,
    required: true,
  },
  totalMainPowerW: {
    type: Number,
    default: 0,
  },
})

const isMain = computed(() => {
  return props.meter.prefix.toLowerCase().includes('main')
})

const accentClass = computed(() => {
  if (props.meter.isReadFailed) return 'bg-rose-500'
  if (isMain.value) return 'bg-cyan-600'
  if (props.meter.prefix.includes('air')) return 'bg-sky-500'
  return 'bg-emerald-500'
})

const loadPercent = computed(() => {
  if (isMain.value) return 100
  if (!props.totalMainPowerW || props.totalMainPowerW <= 0) return null
  if (props.meter.power === undefined || props.meter.power <= 0) return 0
  const pct = (props.meter.power / props.totalMainPowerW) * 100
  return Number(pct.toFixed(1))
})
</script>

