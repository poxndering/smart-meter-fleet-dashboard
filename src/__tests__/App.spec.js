import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import App from '../App.vue'
import HeaderNav from '@/components/HeaderNav.vue'
import RemoteConfigModal from '@/components/RemoteConfigModal.vue'
import LiveLogsModal from '@/components/LiveLogsModal.vue'
import MqttSettingsModal from '@/components/MqttSettingsModal.vue'
import { useMqttStore } from '@/stores/mqttStore'

vi.mock('mqtt', () => {
  return {
    default: {
      connect: vi.fn(() => ({
        on: vi.fn(),
        subscribe: vi.fn(),
        publish: vi.fn(),
        end: vi.fn(),
      })),
    },
  }
})

describe('App.vue', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useMqttStore()
  })

  it('renders HeaderNav and modals in default closed state', () => {
    const wrapper = mount(App, {
      global: {
        stubs: {
          RouterView: { template: '<div class="router-view-stub"></div>' },
        },
      },
    })

    expect(wrapper.findComponent(HeaderNav).exists()).toBe(true)
    expect(wrapper.findComponent(RemoteConfigModal).props('isOpen')).toBe(false)
    expect(wrapper.findComponent(LiveLogsModal).props('isOpen')).toBe(false)
    expect(wrapper.findComponent(MqttSettingsModal).props('isOpen')).toBe(false)
  })

  it('opens modals when HeaderNav emits events', async () => {
    const wrapper = mount(App, {
      global: {
        stubs: {
          RouterView: true,
        },
      },
    })

    const header = wrapper.findComponent(HeaderNav)

    // Open Config
    await header.vm.$emit('open-config')
    expect(wrapper.findComponent(RemoteConfigModal).props('isOpen')).toBe(true)

    // Open Logs
    await header.vm.$emit('open-logs')
    expect(wrapper.findComponent(LiveLogsModal).props('isOpen')).toBe(true)

    // Open Settings
    await header.vm.$emit('open-settings')
    expect(wrapper.findComponent(MqttSettingsModal).props('isOpen')).toBe(true)
  })
})
