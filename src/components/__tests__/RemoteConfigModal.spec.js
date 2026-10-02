import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import RemoteConfigModal from '../RemoteConfigModal.vue'
import { useMqttStore } from '@/stores/mqttStore'

describe('RemoteConfigModal.vue', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useMqttStore()
  })

  it('does not render modal when isOpen is false', () => {
    const wrapper = mount(RemoteConfigModal, {
      props: { isOpen: false },
    })
    expect(wrapper.find('.fixed').exists()).toBe(false)
  })

  it('displays target device and interval presets', () => {
    store.selectedDeviceId = 'esp32-node1'
    const wrapper = mount(RemoteConfigModal, {
      props: { isOpen: true },
    })

    expect(wrapper.text()).toContain('esp32-node1')
    expect(wrapper.text()).toContain('Select Publish Interval:')
    expect(wrapper.text()).toContain('1s')
    expect(wrapper.text()).toContain('5s')
    expect(wrapper.text()).toContain('60s')
  })

  it('updates selected interval and generated json when preset is clicked', async () => {
    const wrapper = mount(RemoteConfigModal, {
      props: { isOpen: true },
    })

    const tenSecPreset = wrapper.findAll('button').find((b) => b.text().includes('10s'))
    await tenSecPreset.trigger('click')

    expect(wrapper.find('pre').text()).toContain('"interval": 10')
    expect(wrapper.find('pre').text()).toContain('"report_interval_sec": 10')
  })

  it('calls publishRemoteConfig when send button is clicked', async () => {
    store.connectionStatus = 'connected'
    store.selectedDeviceId = 'esp32-node1'
    const publishSpy = vi.spyOn(store, 'publishRemoteConfig').mockReturnValue(true)

    const wrapper = mount(RemoteConfigModal, {
      props: { isOpen: true },
    })

    const sendBtn = wrapper.findAll('button').find((b) => b.text().includes('Send Config to Device'))
    await sendBtn.trigger('click')

    expect(publishSpy).toHaveBeenCalledWith(
      'esp32-node1',
      5,
      expect.stringContaining('"interval": 5')
    )
  })

  it('allows editing custom JSON payload', async () => {
    store.connectionStatus = 'connected'
    store.selectedDeviceId = 'esp32-node1'
    const publishSpy = vi.spyOn(store, 'publishRemoteConfig').mockReturnValue(true)

    const wrapper = mount(RemoteConfigModal, {
      props: { isOpen: true },
    })

    const toggleBtn = wrapper.findAll('button').find((b) => b.text().includes('Edit JSON Manually'))
    await toggleBtn.trigger('click')

    const textarea = wrapper.find('textarea')
    expect(textarea.exists()).toBe(true)
    await textarea.setValue('{"custom_mode": true}')

    const sendBtn = wrapper.findAll('button').find((b) => b.text().includes('Send Config to Device'))
    await sendBtn.trigger('click')

    expect(publishSpy).toHaveBeenCalledWith(
      'esp32-node1',
      5,
      '{"custom_mode": true}'
    )
  })

  it('disables submit button when store is disconnected', () => {
    store.connectionStatus = 'disconnected'
    const wrapper = mount(RemoteConfigModal, {
      props: { isOpen: true },
    })

    const sendBtn = wrapper.findAll('button').find((b) => b.text().includes('Send Config to Device'))
    expect(sendBtn.attributes('disabled')).toBeDefined()
  })

  it('emits close event when cancel button is clicked', async () => {
    const wrapper = mount(RemoteConfigModal, {
      props: { isOpen: true },
    })

    const cancelBtn = wrapper.findAll('button').find((b) => b.text() === 'Cancel')
    await cancelBtn.trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })
})
