<template>
  <div class="max-w-7xl mx-auto px-4 lg:px-8 py-6 w-full">
    <!-- Active Device Hero Header -->
    <DeviceHero />

    <!-- Top KPI Cards -->
    <PowerSummary />

    <!-- Real-time Power & Voltage Charts -->
    <PowerCharts />

    <!-- Sub-Meters Grid (with individual circuits and read failure detection) -->
    <MeterGrid />
  </div>
</template>

<script setup>
import DeviceHero from "@/components/DeviceHero.vue";
import MeterGrid from "@/components/MeterGrid.vue";
import PowerCharts from "@/components/PowerCharts.vue";
import PowerSummary from "@/components/PowerSummary.vue";
</script>
