import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import MqttSettingsModal from '../MqttSettingsModal.vue'
import { useMqttStore } from '@/stores/mqttStore'

describe('MqttSettingsModal.vue', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useMqttStore()
  })

  it('does not render when isOpen is false', () => {
    const wrapper = mount(MqttSettingsModal, {
      props: { isOpen: false },
    })
    expect(wrapper.find('.fixed').exists()).toBe(false)
  })

  it('initializes inputs with store settings when isOpen is true', () => {
    store.settings.brokerUrl = 'ws://custom-broker:8083/mqtt'
    store.settings.clientId = 'custom-client-id'

    const wrapper = mount(MqttSettingsModal, {
      props: { isOpen: true },
    })

    const inputs = wrapper.findAll('input')
    expect(inputs[0].element.value).toBe('ws://custom-broker:8083/mqtt')
    expect(inputs[1].element.value).toBe('custom-client-id')
  })

  it('updates broker URL when clicking quick preset buttons', async () => {
    const wrapper = mount(MqttSettingsModal, {
      props: { isOpen: true },
    })

    const wssButton = wrapper.findAll('button').find((b) => b.text().includes('wss:// 8084'))
    await wssButton.trigger('click')

    const brokerInput = wrapper.findAll('input')[0]
    expect(brokerInput.element.value).toBe('wss://mqtt.nxge.co:8084/mqtt')
  })

  it('saves settings and emits close event upon submission', async () => {
    const updateSpy = vi.spyOn(store, 'updateSettings')

    const wrapper = mount(MqttSettingsModal, {
      props: { isOpen: true },
    })

    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('ws://new-broker:1883/mqtt')
    await inputs[1].setValue('new-client-id')

    const saveButton = wrapper.findAll('button').find((b) => b.text().includes('Save & Reconnect'))
    await saveButton.trigger('click')

    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        brokerUrl: 'ws://new-broker:1883/mqtt',
        clientId: 'new-client-id',
      })
    )
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('emits close event when close button is clicked', async () => {
    const wrapper = mount(MqttSettingsModal, {
      props: { isOpen: true },
    })

    const closeBtn = wrapper.findAll('button').find((b) => b.text() === 'Close')
    await closeBtn.trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })
})
