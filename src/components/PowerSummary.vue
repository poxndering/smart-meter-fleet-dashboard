<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
    <!-- Card 1: Total Active Power -->
    <div
      class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-cyan-400/80 hover:shadow-md transition-all"
    >
      <div class="flex items-center justify-between text-slate-500 mb-2">
        <span class="text-xs font-semibold uppercase tracking-wider">Active Power (Total)</span>
        <div class="p-2 rounded-lg bg-cyan-50 border border-cyan-200 text-cyan-600">
          <Zap class="w-4 h-4" />
        </div>
      </div>
      <div class="flex items-baseline gap-2">
        <span class="text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
          {{ displayPowerKw }}
        </span>
        <span class="text-sm font-semibold text-cyan-600 font-mono">kW</span>
      </div>
      <div
        class="mt-2.5 flex items-center justify-between text-xs border-t border-slate-100 pt-2 text-slate-500"
      >
        <span>Instant:</span>
        <span class="font-mono font-medium text-slate-800">{{ displayPowerW }} W</span>
      </div>
    </div>

    <!-- Card 2: Main Grid Voltage -->
    <div
      class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-blue-400/80 hover:shadow-md transition-all"
    >
      <div class="flex items-center justify-between text-slate-500 mb-2">
        <span class="text-xs font-semibold uppercase tracking-wider">Voltage</span>
        <div class="p-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-600">
          <Gauge class="w-4 h-4" />
        </div>
      </div>
      <div class="flex items-baseline gap-2">
        <span class="text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
          {{ displayVolt }}
        </span>
        <span class="text-sm font-semibold text-blue-600 font-mono">V</span>
      </div>
      <div
        class="mt-2.5 flex items-center justify-between text-xs border-t border-slate-100 pt-2 text-slate-500"
      >
        <span>Frequency:</span>
        <span class="font-mono font-medium text-slate-800">{{ displayFreq }} Hz</span>
      </div>
    </div>

    <!-- Card 3: Total Current & PF -->
    <div
      class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-emerald-400/80 hover:shadow-md transition-all"
    >
      <div class="flex items-center justify-between text-slate-500 mb-2">
        <span class="text-xs font-semibold uppercase tracking-wider">Current & PF</span>
        <div class="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600">
          <Activity class="w-4 h-4" />
        </div>
      </div>
      <div class="flex items-baseline gap-2">
        <span class="text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
          {{ displayCurrent }}
        </span>
        <span class="text-sm font-semibold text-emerald-600 font-mono">A</span>
      </div>
      <div
        class="mt-2.5 flex items-center justify-between text-xs border-t border-slate-100 pt-2 text-slate-500"
      >
        <span>Power Factor (PF):</span>
        <span class="font-mono font-medium text-slate-800">{{ displayPf }}</span>
      </div>
    </div>

    <!-- Card 4: Accumulated Energy -->
    <div
      class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-purple-400/80 hover:shadow-md transition-all"
    >
      <div class="flex items-center justify-between text-slate-500 mb-2">
        <span class="text-xs font-semibold uppercase tracking-wider">Accumulated Energy</span>
        <div class="p-2 rounded-lg bg-purple-50 border border-purple-200 text-purple-600">
          <BatteryCharging class="w-4 h-4" />
        </div>
      </div>
      <div class="flex items-baseline gap-2">
        <span class="text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
          {{ displayKwh }}
        </span>
        <span class="text-sm font-semibold text-purple-600 font-mono">kWh</span>
      </div>
      <div
        class="mt-2.5 flex items-center justify-between text-xs border-t border-slate-100 pt-2 text-slate-500"
      >
        <span>Energy in Wh:</span>
        <span class="font-mono font-medium text-slate-800">{{ displayWh }} Wh</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useMqttStore } from "@/stores/mqttStore";
import { Activity, BatteryCharging, Gauge, Zap } from "lucide-vue-next";
import { computed } from "vue";

const store = useMqttStore();
const device = computed(() => store.activeDevice);

const mainMeter = computed(() => {
  return device.value?.meters["main_power"];
});

const displayPowerKw = computed(() => {
  return store.totalPowerKw.toLocaleString("en-US", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
});

const displayPowerW = computed(() => {
  if (
    mainMeter.value &&
    !mainMeter.value.isReadFailed &&
    typeof mainMeter.value.power === "number"
  ) {
    return mainMeter.value.power.toLocaleString("en-US", { minimumFractionDigits: 1 });
  }
  return (store.totalPowerKw * 1000).toLocaleString("en-US", { minimumFractionDigits: 1 });
});

const displayVolt = computed(() => {
  if (
    mainMeter.value &&
    !mainMeter.value.isReadFailed &&
    typeof mainMeter.value.volt === "number"
  ) {
    return mainMeter.value.volt.toFixed(1);
  }
  if (device.value) {
    for (const m of Object.values(device.value.meters)) {
      if (!m.isReadFailed && typeof m.volt === "number") return m.volt.toFixed(1);
    }
  }
  return "—";
});

const displayFreq = computed(() => {
  if (
    mainMeter.value &&
    !mainMeter.value.isReadFailed &&
    typeof mainMeter.value.freq === "number"
  ) {
    return mainMeter.value.freq.toFixed(1);
  }
  return "50.0";
});

const displayCurrent = computed(() => {
  if (
    mainMeter.value &&
    !mainMeter.value.isReadFailed &&
    typeof mainMeter.value.current === "number"
  ) {
    return mainMeter.value.current.toFixed(2);
  }
  let sum = 0;
  if (device.value) {
    for (const m of Object.values(device.value.meters)) {
      if (!m.isReadFailed && typeof m.current === "number") sum += m.current;
    }
  }
  return sum > 0 ? sum.toFixed(2) : "—";
});

const displayPf = computed(() => {
  if (mainMeter.value && !mainMeter.value.isReadFailed && typeof mainMeter.value.pf === "number") {
    return mainMeter.value.pf.toFixed(2);
  }
  return "—";
});

const displayKwh = computed(() => {
  return store.totalEnergyKwh.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
});

const displayWh = computed(() => {
  if (
    mainMeter.value &&
    !mainMeter.value.isReadFailed &&
    typeof mainMeter.value.energy === "number"
  ) {
    return mainMeter.value.energy.toLocaleString("en-US");
  }
  return Math.round(store.totalEnergyKwh * 1000).toLocaleString("en-US");
});
</script>
