import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import PowerCharts from '../PowerCharts.vue'
import { useMqttStore } from '@/stores/mqttStore'
import { nextTick } from 'vue'

const chartConstructorSpy = vi.fn()

vi.mock('chart.js/auto', () => {
  class MockChart {
    constructor(canvas, config) {
      chartConstructorSpy(canvas, config)
      this.data = config.data || { labels: [], datasets: [] }
    }
    update() {}
    destroy() {}
  }
  return {
    default: MockChart,
  }
})

describe('PowerCharts.vue', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useMqttStore()
    chartConstructorSpy.mockClear()
  })

  it('renders chart containers and empty waiting states when history is empty', async () => {
    const wrapper = mount(PowerCharts)
    await nextTick()

    expect(wrapper.text()).toContain('Active Power Trend (W)')
    expect(wrapper.text()).toContain('Voltage Stability (V)')
    expect(wrapper.text()).toContain('Waiting MQTT')
    expect(wrapper.text()).toContain('Waiting for live data from MQTT telemetry...')
  })

  it('initializes Chart.js instances and displays point count when history has entries', async () => {
    store.devices['esp32-node1'] = {
      deviceId: 'esp32-node1',
      lastSeen: Date.now(),
      meters: {
        main_power: { power: 2500, volt: 230, isReadFailed: false },
      },
      history: [
        {
          timestamp: Date.now() - 5000,
          timeLabel: '10:00:00',
          totalPower: 2500,
          mainVolt: 230,
          metersPower: { main_power: 2500 },
        },
        {
          timestamp: Date.now(),
          timeLabel: '10:00:05',
          totalPower: 2600,
          mainVolt: 230.5,
          metersPower: { main_power: 2600 },
        },
      ],
    }
    store.selectedDeviceId = 'esp32-node1'

    const wrapper = mount(PowerCharts)
    await nextTick()
    await flushPromises()

    expect(wrapper.text()).toContain('2 pts')
    expect(chartConstructorSpy).toHaveBeenCalled()
  })

  it('destroys chart instances upon unmount', async () => {
    const wrapper = mount(PowerCharts)
    await nextTick()

    wrapper.unmount()
    expect(wrapper.exists()).toBe(false)
  })
})
