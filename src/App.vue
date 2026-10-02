<template>
  <div
    class="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-cyan-600 selection:text-white"
  >
    <!-- Navbar Header -->
    <HeaderNav
      @open-config="isConfigOpen = true"
      @open-logs="isLogsOpen = true"
      @open-settings="isSettingsOpen = true"
    />

    <!-- Main Content Area -->
    <main class="flex-1">
      <RouterView />
    </main>

    <!-- Modals -->
    <RemoteConfigModal :is-open="isConfigOpen" @close="isConfigOpen = false" />

    <LiveLogsModal :is-open="isLogsOpen" @close="isLogsOpen = false" />

    <MqttSettingsModal :is-open="isSettingsOpen" @close="isSettingsOpen = false" />
  </div>
</template>

<script setup>
import HeaderNav from "@/components/HeaderNav.vue";
import LiveLogsModal from "@/components/LiveLogsModal.vue";
import MqttSettingsModal from "@/components/MqttSettingsModal.vue";
import RemoteConfigModal from "@/components/RemoteConfigModal.vue";
import { useMqttStore } from "@/stores/mqttStore";
import { onMounted, ref } from "vue";
import { RouterView } from "vue-router";

const store = useMqttStore();

const isConfigOpen = ref(false);
const isLogsOpen = ref(false);
const isSettingsOpen = ref(false);

onMounted(() => {
  store.connect();
});
</script>
