<template>
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
    <!-- Chart 1: Real-time Power Trend -->
    <div
      class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between"
    >
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <div class="p-1.5 rounded-lg bg-cyan-50 border border-cyan-200 text-cyan-600">
            <TrendingUp class="w-4 h-4" />
          </div>
          <div>
            <h4 class="text-sm font-bold text-slate-900 tracking-tight">Active Power Trend (W)</h4>
            <p class="text-[11px] text-slate-500">Real-time active power history per circuit</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span
            v-if="history.length > 0"
            class="text-[11px] text-emerald-700 font-mono flex items-center gap-1.5 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            {{ history.length }} pts
          </span>
          <span
            v-else
            class="text-[11px] text-amber-700 font-mono flex items-center gap-1.5 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200"
          >
            <Clock class="w-3 h-3 text-amber-600 animate-pulse" />
            Waiting MQTT
          </span>
        </div>
      </div>

      <div class="h-64 w-full relative">
        <canvas ref="powerCanvasRef"></canvas>

        <!-- Subtle overlay when completely empty -->
        <div
          v-if="history.length === 0"
          class="absolute inset-0 flex flex-col items-center justify-center bg-white/75 backdrop-blur-[1px] rounded-lg text-xs text-slate-600 pointer-events-none"
        >
          <Clock class="w-5 h-5 mb-1.5 text-cyan-600 animate-pulse" />
          <span class="font-medium text-slate-800">Waiting for live data from MQTT telemetry...</span>
          <span class="text-[11px] text-slate-500 mt-0.5 font-mono"
            >Topic: home/main-elec/+/telemetry</span
          >
        </div>
      </div>
    </div>

    <!-- Chart 2: Voltage Stability -->
    <div
      class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between"
    >
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <div class="p-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-600">
            <Gauge class="w-4 h-4" />
          </div>
          <div>
            <h4 class="text-sm font-bold text-slate-900 tracking-tight">Voltage Stability (V)</h4>
            <p class="text-[11px] text-slate-500">Main feeder voltage stability (Nominal 230V)</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span
            v-if="history.length > 0"
            class="text-[11px] text-emerald-700 font-mono flex items-center gap-1.5 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            {{ history.length }} pts
          </span>
          <span
            v-else
            class="text-[11px] text-amber-700 font-mono flex items-center gap-1.5 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200"
          >
            <Clock class="w-3 h-3 text-amber-600 animate-pulse" />
            Waiting MQTT
          </span>
        </div>
      </div>

      <div class="h-64 w-full relative">
        <canvas ref="voltCanvasRef"></canvas>

        <!-- Subtle overlay when completely empty -->
        <div
          v-if="history.length === 0"
          class="absolute inset-0 flex flex-col items-center justify-center bg-white/75 backdrop-blur-[1px] rounded-lg text-xs text-slate-600 pointer-events-none"
        >
          <Clock class="w-5 h-5 mb-1.5 text-blue-600 animate-pulse" />
          <span class="font-medium text-slate-800">Waiting for live voltage data...</span>
          <span class="text-[11px] text-slate-500 mt-0.5 font-mono">Nominal: 230V ±10%</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useMqttStore } from "@/stores/mqttStore";
import Chart from "chart.js/auto";
import { Clock, Gauge, TrendingUp } from "lucide-vue-next";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";

const store = useMqttStore();
const device = computed(() => store.activeDevice);
const history = computed(() => device.value?.history || []);

const powerCanvasRef = ref(null);
const voltCanvasRef = ref(null);

let powerChart = null;
let voltChart = null;

const COLOR_PALETTE = [
  { border: "#0284c7", bg: "rgba(2, 132, 199, 0.12)" }, // Sky/Cyan (Main)
  { border: "#0ea5e9", bg: "rgba(14, 165, 233, 0.12)" }, // Air 01
  { border: "#9333ea", bg: "rgba(147, 51, 234, 0.12)" }, // Purple (Air 02)
  { border: "#059669", bg: "rgba(5, 150, 105, 0.12)" }, // Emerald
  { border: "#d97706", bg: "rgba(217, 119, 6, 0.12)" }, // Amber
  { border: "#db2777", bg: "rgba(219, 39, 119, 0.12)" }, // Pink
];

function getPowerChartData() {
  if (history.value.length === 0) {
    return {
      labels: [],
      datasets: [],
    };
  }

  const labels = history.value.map((h) => h.timeLabel);
  const knownMeters = device.value?.knownMeters?.length ? device.value.knownMeters : ["main_power"];

  const datasets = knownMeters.map((meterKey, idx) => {
    const color = COLOR_PALETTE[idx % COLOR_PALETTE.length] ?? {
      border: "#0284c7",
      bg: "rgba(2, 132, 199, 0.12)",
    };
    const isMain = meterKey === "main_power";
    return {
      label: meterKey.replace(/_/g, " ").toUpperCase(),
      data: history.value.map((h) => h.metersPower?.[meterKey] ?? 0),
      borderColor: color.border,
      backgroundColor: isMain ? color.bg : "transparent",
      fill: isMain,
      tension: 0.3,
      borderWidth: isMain ? 2.5 : 1.8,
      pointRadius: 2,
      pointHoverRadius: 5,
    };
  });

  return { labels, datasets };
}

function getVoltChartData() {
  if (history.value.length === 0) {
    return {
      labels: [],
      datasets: [],
    };
  }

  const labels = history.value.map((h) => h.timeLabel);
  const voltValues = history.value.map((h) => h.mainVolt ?? 230);

  return {
    labels,
    datasets: [
      {
        label: "Voltage (V)",
        data: voltValues,
        borderColor: "#2563eb",
        backgroundColor: "rgba(37, 99, 235, 0.08)",
        fill: true,
        tension: 0.3,
        borderWidth: 2,
        pointRadius: 2,
        pointHoverRadius: 5,
      },
    ],
  };
}

function initCharts() {
  if (powerCanvasRef.value) {
    if (powerChart) {
      powerChart.destroy();
      powerChart = null;
    }
    powerChart = new Chart(powerCanvasRef.value, {
      type: "line",
      data: getPowerChartData(),
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 250 },
        interaction: {
          mode: "index",
          intersect: false,
        },
        plugins: {
          legend: {
            position: "top",
            labels: {
              color: "#475569",
              boxWidth: 12,
              font: { size: 11 },
            },
          },
          tooltip: {
            backgroundColor: "#ffffff",
            titleColor: "#0f172a",
            bodyColor: "#334155",
            borderColor: "#e2e8f0",
            borderWidth: 1,
            padding: 8,
          },
        },
        scales: {
          x: {
            grid: { color: "rgba(226, 232, 240, 0.75)" },
            ticks: { color: "#64748b", font: { size: 10 } },
          },
          y: {
            grid: { color: "rgba(226, 232, 240, 0.75)" },
            ticks: { color: "#64748b", font: { size: 10 } },
            beginAtZero: true,
          },
        },
      },
    });
  }

  if (voltCanvasRef.value) {
    if (voltChart) {
      voltChart.destroy();
      voltChart = null;
    }
    voltChart = new Chart(voltCanvasRef.value, {
      type: "line",
      data: getVoltChartData(),
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 250 },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: "#ffffff",
            titleColor: "#0f172a",
            bodyColor: "#334155",
            borderColor: "#e2e8f0",
            borderWidth: 1,
            padding: 8,
          },
        },
        scales: {
          x: {
            grid: { color: "rgba(226, 232, 240, 0.75)" },
            ticks: { color: "#64748b", font: { size: 10 } },
          },
          y: {
            grid: { color: "rgba(226, 232, 240, 0.75)" },
            ticks: { color: "#64748b", font: { size: 10 } },
            min: 210,
            max: 250,
          },
        },
      },
    });
  }
}

function updateCharts() {
  if (powerChart) {
    const pData = getPowerChartData();
    powerChart.data.labels = pData.labels;
    powerChart.data.datasets = pData.datasets;
    powerChart.update("none");
  }

  if (voltChart) {
    const vData = getVoltChartData();
    voltChart.data.labels = vData.labels;
    voltChart.data.datasets = vData.datasets;
    voltChart.update("none");
  }
}

// Watch history changes
watch(
  () => history.value.length,
  () => {
    updateCharts();
  },
);

watch(
  () => device.value?.lastSeen,
  () => {
    updateCharts();
  },
);

onMounted(() => {
  nextTick(() => {
    initCharts();
  });
});

onBeforeUnmount(() => {
  if (powerChart) {
    powerChart.destroy();
    powerChart = null;
  }
  if (voltChart) {
    voltChart.destroy();
    voltChart = null;
  }
});
</script>
