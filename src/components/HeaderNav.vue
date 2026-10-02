<template>
  <header
    class="bg-white/95 backdrop-blur border-b border-slate-200 sticky top-0 z-40 px-4 lg:px-8 py-3.5 shadow-xs"
  >
    <div class="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
      <!-- Brand & Fleet Info -->
      <div class="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
        <div class="flex items-center gap-2.5">
          <div
            class="h-9 w-9 rounded-lg bg-black/55 flex items-center justify-center shadow-md shadow-cyan-500/20"
          >
            <Zap class="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-base font-bold text-slate-900 tracking-tight">Smart Meter Fleet</h1>
              <span
                class="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-cyan-50 text-cyan-700 border border-cyan-200"
              >
                Live MQTT
              </span>
            </div>
            <p class="text-xs text-slate-500 font-mono">mqtt.nxge.co:1883</p>
          </div>
        </div>

        <!-- Connection status mobile badge -->
        <div class="flex md:hidden items-center gap-1.5 text-xs">
          <span
            class="h-2.5 w-2.5 rounded-full"
            :class="{
              'bg-emerald-500 animate-pulse': store.connectionStatus === 'connected',
              'bg-amber-400 animate-spin': store.connectionStatus === 'connecting',
              'bg-rose-500':
                store.connectionStatus === 'error' || store.connectionStatus === 'disconnected',
            }"
          ></span>
          <span class="text-slate-700 font-medium capitalize">{{ store.connectionStatus }}</span>
        </div>
      </div>

      <!-- Controls & Actions -->
      <div class="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
        <!-- Device Selector -->
        <div
          class="flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700"
        >
          <Cpu class="w-4 h-4 text-cyan-600" />
          <span class="text-slate-500 font-normal hidden sm:inline">Fleet Device:</span>
          <select
            v-model="store.selectedDeviceId"
            class="bg-transparent text-slate-900 font-mono text-xs focus:outline-none cursor-pointer pr-1"
          >
            <option
              v-for="dev in store.deviceList"
              :key="dev.deviceId"
              :value="dev.deviceId"
              class="bg-white text-slate-900"
            >
              {{ dev.deviceId }}
            </option>
            <option
              v-if="store.deviceList.length === 0"
              value="esp32-dev-main-meter-home"
              class="bg-white text-slate-900"
            >
              esp32-dev-main-meter-home (waiting...)
            </option>
          </select>
        </div>

        <!-- Desktop Connection Indicator -->
        <div
          class="hidden md:flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 text-xs"
        >
          <span class="relative flex h-2 w-2">
            <span
              v-if="store.connectionStatus === 'connected'"
              class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"
            ></span>
            <span
              class="relative inline-flex rounded-full h-2 w-2"
              :class="{
                'bg-emerald-500': store.connectionStatus === 'connected',
                'bg-amber-400': store.connectionStatus === 'connecting',
                'bg-rose-500':
                  store.connectionStatus === 'error' || store.connectionStatus === 'disconnected',
              }"
            ></span>
          </span>
          <span class="text-slate-700 font-medium capitalize">{{ store.connectionStatus }}</span>
          <button
            v-if="store.connectionStatus !== 'connected'"
            @click="handleReconnect"
            class="ml-1 text-cyan-600 hover:text-cyan-700 underline font-medium"
          >
            Reconnect
          </button>
        </div>

        <!-- Action: Remote Config -->
        <button
          @click="$emit('open-config')"
          class="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-xs px-3 py-1.5 rounded-lg transition-all shadow-sm"
          title="Remote Config Reporting Interval"
        >
          <Sliders class="w-3.5 h-3.5" />
          <span>Remote Config</span>
        </button>

        <!-- Action: Live Logs -->
        <button
          @click="$emit('open-logs')"
          class="flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-700 font-medium text-xs px-3 py-1.5 rounded-lg border border-slate-200 transition-all shadow-xs"
          title="Live MQTT Logs and Debug Console"
        >
          <Terminal class="w-3.5 h-3.5 text-emerald-600" />
          <span>Logs</span>
          <span
            v-if="errorLogCount > 0"
            class="px-1.5 py-0.2 bg-rose-100 text-rose-700 rounded text-[10px] font-bold"
          >
            {{ errorLogCount }}
          </span>
        </button>

        <!-- Action: Settings -->
        <button
          @click="$emit('open-settings')"
          class="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all border border-slate-200 bg-white shadow-xs"
          title="MQTT Settings"
        >
          <Settings class="w-4 h-4" />
        </button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { useMqttStore } from "@/stores/mqttStore";
import { Cpu, Settings, Sliders, Terminal, Zap } from "lucide-vue-next";
import { computed } from "vue";
import { toast } from "vue3-toastify";

defineEmits(["open-config", "open-logs", "open-settings"]);
const store = useMqttStore();

const errorLogCount = computed(() => {
  return store.logs.filter((l) => l.isError).length;
});

function handleReconnect() {
  store.connect();
  toast.info("Reconnecting to MQTT broker...");
}
</script>
