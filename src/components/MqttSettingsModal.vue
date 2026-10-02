<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-none"
  >
    <div
      class="bg-white border border-slate-200 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
    >
      <!-- Modal Header -->
      <div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="p-2 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
            <Settings class="w-5 h-5" />
          </div>
          <div>
            <h3 class="text-base font-bold text-slate-900">MQTT Broker Settings</h3>
            <p class="text-xs text-slate-500">Configure WebSocket MQTT broker connection</p>
          </div>
        </div>
        <button
          @click="$emit('close')"
          class="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Modal Body -->
      <div class="p-6 space-y-4 text-xs">
        <!-- Broker WebSocket URL -->
        <div>
          <label class="block text-slate-700 font-semibold mb-1"> Broker WebSocket URL: </label>
          <input
            v-model="brokerUrlInput"
            type="text"
            placeholder="ws://mqtt.nxge.co:8083/mqtt"
            class="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono focus:border-cyan-600 focus:bg-white focus:outline-none"
          />
          <div class="flex gap-2 mt-2">
            <button
              type="button"
              @click="brokerUrlInput = 'ws://mqtt.nxge.co:8083/mqtt'"
              class="text-[11px] px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition font-medium"
            >
              ws:// 8083 (Non-SSL)
            </button>
            <button
              type="button"
              @click="brokerUrlInput = 'wss://mqtt.nxge.co:8084/mqtt'"
              class="text-[11px] px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition font-medium"
            >
              wss:// 8084 (SSL/TLS)
            </button>
          </div>
        </div>

        <!-- Client ID -->
        <div>
          <label class="block text-slate-700 font-semibold mb-1"> Client ID: </label>
          <input
            v-model="clientIdInput"
            type="text"
            class="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono focus:border-cyan-600 focus:bg-white focus:outline-none"
          />
        </div>

        <!-- Telemetry Topic Pattern -->
        <div>
          <label class="block text-slate-700 font-semibold mb-1"> Telemetry Topic: </label>
          <input
            v-model="telemetryTopicInput"
            type="text"
            class="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono focus:border-cyan-600 focus:bg-white focus:outline-none"
          />
          <span class="text-[11px] text-slate-500"
            >Supports wildcards such as home/main-elec/+/telemetry</span
          >
        </div>

        <!-- Status Topic Pattern -->
        <div>
          <label class="block text-slate-700 font-semibold mb-1"> Status Topic (LWT): </label>
          <input
            v-model="statusTopicInput"
            type="text"
            class="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono focus:border-cyan-600 focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      <!-- Modal Footer -->
      <div
        class="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-2 bg-slate-50"
      >
        <button
          type="button"
          @click="$emit('close')"
          class="px-4 py-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition font-medium text-xs"
        >
          Close
        </button>
        <button
          type="button"
          @click="saveAndReconnect"
          class="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-medium shadow-sm transition text-xs"
        >
          <RefreshCw class="w-3.5 h-3.5" />
          <span>Save & Reconnect</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useMqttStore } from "@/stores/mqttStore";
import { RefreshCw, Settings, X } from "lucide-vue-next";
import { ref } from "vue";
import { toast } from "vue3-toastify";

defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["close"]);
const store = useMqttStore();

const brokerUrlInput = ref(store.settings.brokerUrl);
const clientIdInput = ref(store.settings.clientId);
const telemetryTopicInput = ref(store.settings.topicTelemetry);
const statusTopicInput = ref(store.settings.topicStatus);

function saveAndReconnect() {
  store.updateSettings({
    brokerUrl: brokerUrlInput.value,
    clientId: clientIdInput.value,
    topicTelemetry: telemetryTopicInput.value,
    topicStatus: statusTopicInput.value,
  });
  toast.success("Broker settings saved; reconnecting...");
  emit("close");
}
</script>
