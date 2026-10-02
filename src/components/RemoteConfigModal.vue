<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-none"
  >
    <div
      class="bg-white border border-slate-200 rounded-xl w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
    >
      <!-- Modal Header -->
      <div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
            <Sliders class="w-5 h-5" />
          </div>
          <div>
            <h3 class="text-base font-bold text-slate-900">Remote Configuration</h3>
            <p class="text-xs text-slate-500">
              Configure device reporting telemetry interval
            </p>
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
      <div class="p-6 space-y-5 text-xs">
        <!-- Target Device Info -->
        <div
          class="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between"
        >
          <div>
            <span class="text-slate-500 font-medium">Target Device:</span>
            <div class="font-mono font-bold text-slate-900 text-sm mt-0.5">
              {{ currentDeviceId }}
            </div>
          </div>
          <span
            class="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-mono text-[11px] border border-emerald-200 font-medium"
          >
            Online
          </span>
        </div>

        <!-- Interval Preset Selection -->
        <div>
          <label class="block text-slate-700 font-semibold mb-2">
            Select Publish Interval:
          </label>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="preset in presets"
              :key="preset.sec"
              type="button"
              @click="selectedInterval = preset.sec"
              class="py-2.5 px-3 rounded-lg border font-medium transition-all text-center"
              :class="
                selectedInterval === preset.sec
                  ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-xs'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              "
            >
              <div class="font-bold text-sm">{{ preset.sec }}s</div>
              <div class="text-[10px] text-slate-500 mt-0.5">{{ preset.desc }}</div>
            </button>
          </div>
        </div>

        <!-- Target MQTT Topic -->
        <div>
          <label class="block text-slate-700 font-semibold mb-1"> Target MQTT Topic: </label>
          <input
            v-model="customTopic"
            type="text"
            class="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono focus:border-blue-600 focus:bg-white focus:outline-none"
          />
        </div>

        <!-- Payload Preview -->
        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="text-slate-700 font-semibold">JSON Payload Preview:</label>
            <button
              type="button"
              @click="useCustomPayload = !useCustomPayload"
              class="text-blue-600 hover:text-blue-800 text-[11px] font-medium"
            >
              {{ useCustomPayload ? "Use Default JSON" : "Edit JSON Manually" }}
            </button>
          </div>

          <textarea
            v-if="useCustomPayload"
            v-model="rawPayloadInput"
            rows="3"
            class="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-mono text-xs focus:border-blue-600 focus:bg-white focus:outline-none"
          ></textarea>
          <pre
            v-else
            class="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 font-mono text-xs overflow-x-auto"
            >{{ generatedJson }}</pre
          >
        </div>

        <!-- Status Message -->
        <div
          v-if="store.publishStatus"
          class="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 font-medium"
        >
          {{ store.publishStatus }}
        </div>
      </div>

      <!-- Modal Footer -->
      <div
        class="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-slate-50"
      >
        <span class="text-slate-500 text-xs"> Standard interval: 5 seconds </span>
        <div class="flex items-center gap-2">
          <button
            type="button"
            @click="$emit('close')"
            class="px-4 py-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="sendConfig"
            :disabled="store.connectionStatus !== 'connected'"
            class="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send class="w-3.5 h-3.5" />
            <span>Send Config to Device</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useMqttStore } from "@/stores/mqttStore";
import { Send, Sliders, X } from "lucide-vue-next";
import { computed, ref, watch } from "vue";
import { toast } from "vue3-toastify";

defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["close"]);
const store = useMqttStore();

const currentDeviceId = computed(() => {
  return store.activeDevice?.deviceId || store.selectedDeviceId || "esp32-dev-main-meter-home";
});

const customTopic = ref(`home/main-elec/${currentDeviceId.value}/config`);

watch(currentDeviceId, (id) => {
  customTopic.value = `home/main-elec/${id}/config`;
});

const selectedInterval = ref(5);
const useCustomPayload = ref(false);
const rawPayloadInput = ref('{"interval": 5}');

const presets = [
  { sec: 1, desc: "High Real-time" },
  { sec: 2, desc: "Continuous Fast" },
  { sec: 5, desc: "Default" },
  { sec: 10, desc: "Bandwidth Saver" },
  { sec: 30, desc: "Medium Interval" },
  { sec: 60, desc: "Power Saver" },
];

const generatedJson = computed(() => {
  return JSON.stringify(
    {
      interval: selectedInterval.value,
      report_interval_sec: selectedInterval.value,
    },
    null,
    2,
  );
});

function sendConfig() {
  const payload = useCustomPayload.value ? rawPayloadInput.value : generatedJson.value;
  const ok = store.publishRemoteConfig(currentDeviceId.value, selectedInterval.value, payload);
  if (ok) {
    toast.success(`Configuration sent to ${currentDeviceId.value} (${selectedInterval.value}s)`);
    emit("close");
  } else {
    toast.error(store.publishStatus || "Failed to send configuration (broker disconnected)");
  }
}
</script>
