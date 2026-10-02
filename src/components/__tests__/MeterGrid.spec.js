import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import MeterGrid from '../MeterGrid.vue'
import MeterCard from '../MeterCard.vue'
import { useMqttStore } from '@/stores/mqttStore'

describe('MeterGrid.vue', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useMqttStore()
  })

  it('renders empty waiting state when no meters exist', () => {
    const wrapper = mount(MeterGrid)
    expect(wrapper.text()).toContain('Waiting for data from MQTT Broker...')
    expect(wrapper.text()).toContain('0 circuits')
    expect(wrapper.findComponent(MeterCard).exists()).toBe(false)
  })

  it('renders MeterCard components sorted with main_power first', () => {
    store.devices['esp32-node1'] = {
      deviceId: 'esp32-node1',
      meters: {
        z_meter: { prefix: 'z_meter', name: 'Z Meter', isReadFailed: false, power: 100 },
        a_meter: { prefix: 'a_meter', name: 'A Meter', isReadFailed: false, power: 200 },
        main_power: { prefix: 'main_power', name: 'Main Power', isReadFailed: false, power: 3000 },
      },
    }
    store.selectedDeviceId = 'esp32-node1'

    const wrapper = mount(MeterGrid)
    expect(wrapper.text()).toContain('3 circuits')

    const cards = wrapper.findAllComponents(MeterCard)
    expect(cards.length).toBe(3)
    // main_power should come first
    expect(cards[0].props('meter').prefix).toBe('main_power')
    expect(cards[1].props('meter').prefix).toBe('a_meter')
    expect(cards[2].props('meter').prefix).toBe('z_meter')
  })
})
