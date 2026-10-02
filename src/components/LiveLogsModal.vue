<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-none"
  >
    <div
      class="bg-white border border-slate-200 rounded-xl w-full max-w-4xl h-[85vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
    >
      <!-- Modal Header -->
      <div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
        <div class="flex items-center gap-2.5">
          <div class="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
            <Terminal class="w-5 h-5" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h3 class="text-base font-bold text-slate-900">Live MQTT Console & Logs</h3>
              <span
                class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200"
              >
                {{ filteredLogs.length }} packets
              </span>
            </div>
            <p class="text-xs text-slate-500">
              Inspect live telemetry payloads and [meter] read failed alerts
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            @click="handleClearLogs"
            class="text-xs text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 flex items-center gap-1 transition"
          >
            <Trash2 class="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
          <button
            @click="$emit('close')"
            class="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <X class="w-5 h-5" />
          </button>
        </div>
      </div>

      <!-- Filter Bar -->
      <div
        class="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs"
      >
        <div class="flex items-center gap-1.5">
          <span class="text-slate-500 font-semibold mr-1">Filter:</span>
          <button
            @click="activeFilter = 'all'"
            class="px-2.5 py-1 rounded-md transition font-medium"
            :class="
              activeFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            "
          >
            All
          </button>
          <button
            @click="activeFilter = 'telemetry'"
            class="px-2.5 py-1 rounded-md transition font-medium"
            :class="
              activeFilter === 'telemetry'
                ? 'bg-cyan-100 text-cyan-800 border border-cyan-300'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            "
          >
            Telemetry
          </button>
          <button
            @click="activeFilter = 'status'"
            class="px-2.5 py-1 rounded-md transition font-medium"
            :class="
              activeFilter === 'status'
                ? 'bg-blue-100 text-blue-800 border border-blue-300'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            "
          >
            Status (LWT)
          </button>
          <button
            @click="activeFilter = 'warning'"
            class="px-2.5 py-1 rounded-md transition font-medium"
            :class="
              activeFilter === 'warning'
                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            "
          >
            Warnings & Errors
          </button>
        </div>

        <div class="text-[11px] text-slate-500 font-mono">Auto-scroll enabled</div>
      </div>

      <!-- Logs Stream Body -->
      <div class="flex-1 overflow-y-auto p-4 space-y-2.5 font-mono text-xs bg-slate-50">
        <div
          v-for="log in filteredLogs"
          :key="log.id"
          class="p-3 rounded-lg border transition-all"
          :class="{
            'bg-white border-slate-200 hover:border-slate-300 shadow-2xs': !log.isError,
            'bg-rose-50/80 border-rose-200 text-rose-900': log.isError,
          }"
        >
          <div
            class="flex items-center justify-between text-[11px] text-slate-500 mb-1.5 pb-1 border-b border-slate-100"
          >
            <div class="flex items-center gap-2">
              <span class="text-slate-500">{{ formatTimestamp(log.timestamp) }}</span>
              <span
                class="px-1.5 py-0.5 rounded font-bold text-[10px]"
                :class="{
                  'bg-cyan-50 text-cyan-700 border border-cyan-200':
                    log.topic.includes('telemetry'),
                  'bg-emerald-50 text-emerald-700 border border-emerald-200':
                    log.topic.includes('status'),
                  'bg-amber-50 text-amber-700 border border-amber-200': log.topic === 'SYSTEM',
                  'bg-rose-50 text-rose-700 border border-rose-200': log.topic === 'ERROR',
                  'bg-blue-50 text-blue-700 border border-blue-200': log.topic === 'CONFIG',
                }"
              >
                {{ log.topic }}
              </span>
            </div>

            <button
              @click="copyPayload(log.payloadText)"
              class="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100 transition"
              title="Copy Payload"
            >
              <Copy class="w-3.5 h-3.5" />
            </button>
          </div>

          <!-- Payload Display -->
          <pre class="text-slate-800 whitespace-pre-wrap break-all text-[11px] leading-relaxed">{{
            formatPayload(log.payloadText)
          }}</pre>
        </div>

        <div
          v-if="filteredLogs.length === 0"
          class="h-48 flex items-center justify-center text-slate-400"
        >
          No logs match the current filter.
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useMqttStore } from "@/stores/mqttStore";
import { Copy, Terminal, Trash2, X } from "lucide-vue-next";
import { computed, ref } from "vue";
import { toast } from "vue3-toastify";

defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
});

defineEmits(["close"]);
const store = useMqttStore();
const activeFilter = ref("all");

const filteredLogs = computed(() => {
  if (activeFilter.value === "telemetry") {
    return store.logs.filter((l) => l.topic.includes("telemetry"));
  }
  if (activeFilter.value === "status") {
    return store.logs.filter((l) => l.topic.includes("status"));
  }
  if (activeFilter.value === "warning") {
    return store.logs.filter((l) => l.isError || l.payloadText.includes("read failed"));
  }
  return store.logs;
});

function formatTimestamp(ts) {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
  });
}

function formatPayload(raw) {
  try {
    const obj = JSON.parse(raw);
    return JSON.stringify(obj, null, 2);
  } catch {
    return raw;
  }
}

function copyPayload(text) {
  navigator.clipboard?.writeText(text);
  toast.info("Payload copied to clipboard");
}

function handleClearLogs() {
  store.clearLogs();
  toast.info("Logs cleared successfully");
}
</script>
