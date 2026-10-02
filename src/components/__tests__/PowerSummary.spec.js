import { useMqttStore } from "@/stores/mqttStore";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import PowerSummary from "../PowerSummary.vue";

describe("PowerSummary.vue", () => {
  let store;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useMqttStore();
  });

  it("renders default empty/zero summary state when no device is connected", () => {
    const wrapper = mount(PowerSummary);
    expect(wrapper.text()).toContain("Active Power (Total)");
    expect(wrapper.text()).toContain("Voltage");
    expect(wrapper.text()).toContain("Current & PF");
    expect(wrapper.text()).toContain("Accumulated Energy");
    expect(wrapper.text()).toContain("0.000"); // kW
    expect(wrapper.text()).toContain("—"); // Volt fallback
  });

  it("renders aggregated electrical power, voltage, current and energy from active device with main meter", () => {
    store.devices["esp32-node1"] = {
      deviceId: "esp32-node1",
      meters: {
        main_power: {
          power: 3450.5,
          kw: 3.451,
          volt: 231.2,
          current: 14.92,
          freq: 50.1,
          pf: 0.99,
          energy: 125400,
          kwh: 125.4,
          isReadFailed: false,
        },
      },
    };
    store.selectedDeviceId = "esp32-node1";

    const wrapper = mount(PowerSummary);
    expect(wrapper.text()).toContain("3.451"); // displayPowerKw
    expect(wrapper.text()).toContain("3,450.5 W"); // displayPowerW
    expect(wrapper.text()).toContain("231.2"); // displayVolt
    expect(wrapper.text()).toContain("50.1 Hz"); // displayFreq
    expect(wrapper.text()).toContain("14.92"); // displayCurrent
    expect(wrapper.text()).toContain("0.99"); // displayPf
    expect(wrapper.text()).toContain("125.40"); // displayKwh
    expect(wrapper.text()).toContain("125,400 Wh"); // displayWh
  });

  it("calculates fallback current, voltage, and power from submeters when main meter is absent", () => {
    store.devices["esp32-node1"] = {
      deviceId: "esp32-node1",
      meters: {
        sub1: {
          power: 1200,
          kw: 1.2,
          volt: 228.5,
          current: 5.25,
          isReadFailed: false,
        },
        sub2: {
          power: 800,
          kw: 0.8,
          volt: 228.5,
          current: 3.5,
          isReadFailed: false,
        },
        sub3: {
          power: 500,
          current: 2.1,
          isReadFailed: true, // Should be excluded from current sum
        },
      },
    };
    store.selectedDeviceId = "esp32-node1";

    const wrapper = mount(PowerSummary);
    // 1.2 + 0.8 = 2.000 kW
    expect(wrapper.text()).toContain("2.000");
    // 5.25 + 3.5 = 8.75 A
    expect(wrapper.text()).toContain("8.75");
    // Volt fallback from first available meter
    expect(wrapper.text()).toContain("228.5");
  });
});
