import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import DeviceHero from '../DeviceHero.vue'
import { useMqttStore } from '@/stores/mqttStore'

describe('DeviceHero.vue', () => {
  let store

  beforeEach(() => {
    vi.useFakeTimers()
    setActivePinia(createPinia())
    store = useMqttStore()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders default fallback when no active device exists', () => {
    store.selectedDeviceId = 'esp32-fallback'
    const wrapper = mount(DeviceHero)

    expect(wrapper.text()).toContain('esp32-fallback')
    expect(wrapper.text()).toContain('Waiting Data')
    expect(wrapper.text()).toContain('Local IP')
    expect(wrapper.text()).toContain('—') // IP dash
    expect(wrapper.text()).toContain('Never') // timeAgo
  })

  it('renders active device details: ID, IP, online status, RSSI, and time ago', () => {
    const baseTime = 1700000000000
    vi.setSystemTime(baseTime)

    store.devices['esp32-solar'] = {
      deviceId: 'esp32-solar',
      status: 'online',
      localIp: '192.168.1.88',
      rssi: -62,
      lastSeen: baseTime - 15000, // 15s ago
      readFailedMeters: [],
    }
    store.selectedDeviceId = 'esp32-solar'

    const wrapper = mount(DeviceHero)

    expect(wrapper.text()).toContain('esp32-solar')
    expect(wrapper.text()).toContain('online')
    expect(wrapper.text()).toContain('192.168.1.88')
    expect(wrapper.text()).toContain('-62 dBm')
    expect(wrapper.text()).toContain('(good)') // -62 is >= -67 -> good
    expect(wrapper.text()).toContain('15s ago')
  })

  it('evaluates RSSI quality correctly: excellent, good, fair, weak', () => {
    store.devices['dev1'] = { deviceId: 'dev1', rssi: -50 }
    store.selectedDeviceId = 'dev1'
    let wrapper = mount(DeviceHero)
    expect(wrapper.text()).toContain('(excellent)')

    store.devices['dev1'].rssi = -70
    wrapper = mount(DeviceHero)
    expect(wrapper.text()).toContain('(fair)')

    store.devices['dev1'].rssi = -85
    wrapper = mount(DeviceHero)
    expect(wrapper.text()).toContain('(weak)')
  })

  it('displays read failed warning alert banner when device has readFailedMeters', () => {
    store.devices['esp32-test'] = {
      deviceId: 'esp32-test',
      status: 'online',
      readFailedMeters: ['air01', 'water_heater'],
    }
    store.selectedDeviceId = 'esp32-test'

    const wrapper = mount(DeviceHero)
    expect(wrapper.text()).toContain('Meter Read Warning:')
    expect(wrapper.text()).toContain('air01, water_heater')
    expect(wrapper.text()).toContain('failed to read in this cycle')
  })
})
