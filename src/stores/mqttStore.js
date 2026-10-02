import mqtt from "mqtt";
import { defineStore } from "pinia";

const METRIC_SUFFIXES = ["volt", "current", "power", "energy", "freq", "pf", "kwh", "kw"];

function formatMeterName(prefix) {
  // Format 'main_power' -> 'Main Power', 'air01' -> 'Air 01', 'air_02' -> 'Air 02'
  return prefix
    .replace(/_/g, " ")
    .replace(/([a-zA-Z])(\d+)/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export const useMqttStore = defineStore("mqtt", {
  state: () => {
    const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";
    const defaultBroker = isHttps ? "wss://mqtt.nxge.co:8084/mqtt" : "ws://mqtt.nxge.co:8083/mqtt";

    return {
      client: null,
      connectionStatus: "disconnected",
      errorMessage: "",
      devices: {},
      selectedDeviceId: "esp32-dev-main-meter-home",
      logs: [],
      settings: {
        brokerUrl: defaultBroker,
        topicTelemetry: "home/main-elec/+/telemetry",
        topicStatus: "home/main-elec/+/status",
        topicConfig: "home/main-elec/{deviceId}/config",
        clientId: "dashboard-" + Math.random().toString(16).substring(2, 8),
        reconnectPeriod: 4000,
      },
      publishStatus: "",
    };
  },

  getters: {
    deviceList(state) {
      return Object.values(state.devices);
    },

    activeDevice(state) {
      if (state.selectedDeviceId && state.devices[state.selectedDeviceId]) {
        return state.devices[state.selectedDeviceId] ?? null;
      }
      const keys = Object.keys(state.devices);
      if (keys.length > 0 && keys[0]) {
        return state.devices[keys[0]] ?? null;
      }
      return null;
    },

    totalPowerKw() {
      const dev = this.activeDevice;
      if (!dev) return 0;
      // If main_power exists, use main_power_kw or main_power_power / 1000
      if (dev.meters["main_power"] && !dev.meters["main_power"].isReadFailed) {
        return dev.meters["main_power"].kw ?? (dev.meters["main_power"].power ?? 0) / 1000;
      }
      // Otherwise sum all active submeter powers
      let sum = 0;
      const meterList = Object.values(dev.meters);
      for (const m of meterList) {
        if (!m.isReadFailed) {
          sum += m.kw ?? (m.power ?? 0) / 1000;
        }
      }
      return Number(sum.toFixed(3));
    },

    totalEnergyKwh() {
      const dev = this.activeDevice;
      if (!dev) return 0;
      if (dev.meters["main_power"] && !dev.meters["main_power"].isReadFailed) {
        return dev.meters["main_power"].kwh ?? (dev.meters["main_power"].energy ?? 0) / 1000;
      }
      let sum = 0;
      const meterList = Object.values(dev.meters);
      for (const m of meterList) {
        if (!m.isReadFailed) {
          sum += m.kwh ?? (m.energy ?? 0) / 1000;
        }
      }
      return Number(sum.toFixed(2));
    },
  },

  actions: {
    connect() {
      if (this.client) {
        try {
          this.client.end(true);
        } catch (e) {
          console.error(e);
        }
      }

      this.connectionStatus = "connecting";
      this.errorMessage = "";
      this.addLog("SYSTEM", `Connecting to MQTT Broker: ${this.settings.brokerUrl}`);

      try {
        const client = mqtt.connect(this.settings.brokerUrl, {
          clientId: this.settings.clientId,
          reconnectPeriod: this.settings.reconnectPeriod,
          connectTimeout: 7000,
          clean: true,
          rejectUnauthorized: false,
        });

        client.on("connect", () => {
          this.connectionStatus = "connected";
          this.errorMessage = "";
          this.addLog("SYSTEM", "Connected successfully! Subscribing to topics...");

          // Subscribe to telemetry and status
          const topicsToSub = [this.settings.topicTelemetry, this.settings.topicStatus];
          client.subscribe(topicsToSub, (err) => {
            if (err) {
              this.errorMessage = `Subscription error: ${err.message}`;
              this.addLog("ERROR", `Subscribe failed: ${err.message}`, true);
            } else {
              this.addLog("SYSTEM", `Subscribed to: ${topicsToSub.join(", ")}`);
            }
          });
        });

        client.on("message", (topic, message) => {
          this.handleIncomingMessage(topic, message.toString());
        });

        client.on("error", (err) => {
          console.error("MQTT error:", err);
          this.errorMessage = err.message || "Connection error";
          this.connectionStatus = "error";
          this.addLog("ERROR", `MQTT Error: ${err.message}`, true);
        });

        client.on("close", () => {
          if (this.connectionStatus !== "error") {
            this.connectionStatus = "disconnected";
          }
          this.addLog("SYSTEM", "MQTT Connection closed.");
        });

        client.on("offline", () => {
          this.connectionStatus = "disconnected";
          this.addLog("SYSTEM", "MQTT Client is offline. Auto-reconnecting...");
        });

        this.client = client;
      } catch (err) {
        this.connectionStatus = "error";
        this.errorMessage = err.message || "Failed to initialize MQTT";
        this.addLog("ERROR", `Init error: ${err.message}`, true);
      }
    },

    disconnect() {
      if (this.client) {
        this.client.end();
        this.client = null;
        this.connectionStatus = "disconnected";
        this.addLog("SYSTEM", "Disconnected by user.");
      }
    },

    handleIncomingMessage(topic, payloadText) {
      this.addLog(topic, payloadText);

      // Expected topics:
      // home/main-elec/<deviceId>/telemetry
      // home/main-elec/<deviceId>/status
      const parts = topic.split("/");
      if (parts.length < 4 || parts[0] !== "home" || parts[1] !== "main-elec") {
        return;
      }

      const deviceId = parts[2];
      const messageType = parts[3];
      if (!deviceId || !messageType) return;

      // Initialize device entry if not exist
      if (!this.devices[deviceId]) {
        this.devices[deviceId] = {
          deviceId,
          status: "online",
          meters: {},
          knownMeters: [],
          readFailedMeters: [],
          history: [],
          packetCount: 0,
        };
      }

      const device = this.devices[deviceId];
      if (!device) return;
      device.lastSeen = Date.now();

      if (messageType === "status") {
        // Status payload: "online" or "offline"
        const cleanStatus = payloadText.trim().toLowerCase();
        if (cleanStatus === "online" || cleanStatus === "offline") {
          device.status = cleanStatus;
        }
        return;
      }

      if (messageType === "telemetry") {
        try {
          const payload = JSON.parse(payloadText);
          device.rawPayload = payload;
          device.status = "online";

          if (typeof payload.rssi === "number") {
            device.rssi = payload.rssi;
          }
          if (typeof payload.localIp === "string") {
            device.localIp = payload.localIp;
          }

          // Parse meters:
          // A meter field matches: <prefix>_<suffix>
          const prefixesInPayload = new Set();
          const parsedMetrics = {};

          for (const key of Object.keys(payload)) {
            for (const suffix of METRIC_SUFFIXES) {
              const endsWithSuffix = key.endsWith(`_${suffix}`);
              if (endsWithSuffix) {
                const prefix = key.slice(0, -(suffix.length + 1));
                if (prefix) {
                  prefixesInPayload.add(prefix);
                  if (!parsedMetrics[prefix]) {
                    parsedMetrics[prefix] = {
                      prefix,
                      name: formatMeterName(prefix),
                      isReadFailed: false,
                    };
                  }
                  const val = payload[key];
                  if (typeof val === "number") {
                    const target = parsedMetrics[prefix];
                    if (target) {
                      target[suffix] = val;
                    }
                  }
                }
                break;
              }
            }
          }

          // Update known meters list
          for (const prefix of prefixesInPayload) {
            if (!device.knownMeters.includes(prefix)) {
              device.knownMeters.push(prefix);
            }
          }

          // Detect read failed meters:
          const readFailedList = [];
          for (const knownPrefix of device.knownMeters) {
            if (!prefixesInPayload.has(knownPrefix)) {
              readFailedList.push(knownPrefix);
              this.addLog("SYSTEM", `[meter] ${knownPrefix} read failed`, true);
              // If previously had entry, mark as read failed and clear current values (no stale data)
              const existingMeter = device.meters[knownPrefix];
              if (existingMeter) {
                existingMeter.isReadFailed = true;
                existingMeter.volt = undefined;
                existingMeter.current = undefined;
                existingMeter.power = undefined;
                existingMeter.kw = undefined;
                existingMeter.freq = undefined;
                existingMeter.pf = undefined;
              }
            }
          }
          device.readFailedMeters = readFailedList;

          // Save valid parsed metrics
          const now = Date.now();
          for (const prefix of prefixesInPayload) {
            const parsed = parsedMetrics[prefix];
            device.meters[prefix] = {
              ...device.meters[prefix],
              ...parsed,
              lastUpdated: now,
              isReadFailed: false,
            };
          }

          // Compute History Entry
          const mainMeter = device.meters["main_power"];
          let currentTotalPower = 0;
          if (mainMeter && !mainMeter.isReadFailed && typeof mainMeter.power === "number") {
            currentTotalPower = mainMeter.power;
          } else {
            // sum of other meters
            const allMeters = Object.values(device.meters);
            for (const m of allMeters) {
              if (!m.isReadFailed && typeof m.power === "number") {
                currentTotalPower += m.power;
              }
            }
          }

          let mainVolt = 0;
          if (mainMeter && !mainMeter.isReadFailed && typeof mainMeter.volt === "number") {
            mainVolt = mainMeter.volt;
          } else {
            const allMeters = Object.values(device.meters);
            const fallback = allMeters.find((m) => !m.isReadFailed && typeof m.volt === "number");
            mainVolt = fallback?.volt ?? 0;
          }

          const meterPowers = {};
          const allMetersEntries = Object.entries(device.meters);
          for (const [pfx, m] of allMetersEntries) {
            meterPowers[pfx] = !m.isReadFailed && typeof m.power === "number" ? m.power : 0;
          }

          const timeLabel = new Date().toLocaleTimeString("en-US", {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });
          device.history.push({
            timestamp: now,
            timeLabel,
            totalPower: Number(currentTotalPower.toFixed(1)),
            mainVolt: Number(mainVolt.toFixed(1)),
            metersPower: meterPowers,
          });

          // Keep last 30 data points for performance
          if (device.history.length > 30) {
            device.history.shift();
          }

          // Auto-select device if current selected has no data
          if (!this.selectedDeviceId || !this.devices[this.selectedDeviceId]) {
            this.selectedDeviceId = deviceId;
          }
        } catch (e) {
          console.error("Failed to parse telemetry JSON:", e);
          this.addLog("ERROR", `Malformed telemetry JSON from ${topic}: ${e.message}`, true);
        }
      }
    },

    publishRemoteConfig(deviceId, intervalSeconds, customPayload) {
      if (!this.client || this.connectionStatus !== "connected") {
        this.publishStatus = "Broker not connected";
        return false;
      }

      // Topic pattern: home/main-elec/<deviceId>/config or custom
      const topic = this.settings.topicConfig.replace("{deviceId}", deviceId);
      const payload = customPayload?.trim()
        ? customPayload
        : JSON.stringify({ interval: intervalSeconds, report_interval_sec: intervalSeconds });

      this.client.publish(topic, payload, { qos: 0, retain: false }, (err) => {
        if (err) {
          this.publishStatus = `Publish error: ${err.message}`;
          this.addLog("ERROR", `Config publish failed: ${err.message}`, true);
        } else {
          this.publishStatus = `Configuration sent (${intervalSeconds}s) to ${topic}`;
          this.addLog("CONFIG", `Published to ${topic}: ${payload}`);
        }
      });
      return true;
    },

    selectDevice(deviceId) {
      this.selectedDeviceId = deviceId;
    },

    addLog(topic, payloadText, isError = false) {
      this.logs.unshift({
        id: Math.random().toString(36).substring(2, 9),
        timestamp: Date.now(),
        topic,
        payloadText,
        isError,
      });
      if (this.logs.length > 80) {
        this.logs.pop();
      }
    },

    clearLogs() {
      this.logs = [];
    },

    updateSettings(newSettings) {
      const changedBroker =
        newSettings.brokerUrl && newSettings.brokerUrl !== this.settings.brokerUrl;
      this.settings = { ...this.settings, ...newSettings };
      if (changedBroker) {
        this.connect();
      }
    },
  },
});
