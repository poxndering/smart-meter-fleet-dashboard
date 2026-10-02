import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import LiveLogsModal from '../LiveLogsModal.vue'
import { useMqttStore } from '@/stores/mqttStore'

describe('LiveLogsModal.vue', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useMqttStore()
  })

  it('does not render modal content when isOpen is false', () => {
    const wrapper = mount(LiveLogsModal, {
      props: { isOpen: false },
    })
    expect(wrapper.find('.fixed').exists()).toBe(false)
  })

  it('renders logs and responds to filtering buttons', async () => {
    store.logs = [
      { id: '1', timestamp: Date.now(), topic: 'home/main-elec/dev1/telemetry', payloadText: '{"power":100}', isError: false },
      { id: '2', timestamp: Date.now(), topic: 'home/main-elec/dev1/status', payloadText: 'online', isError: false },
      { id: '3', timestamp: Date.now(), topic: 'SYSTEM', payloadText: '[meter] air01 read failed', isError: true },
    ]

    const wrapper = mount(LiveLogsModal, {
      props: { isOpen: true },
    })

    expect(wrapper.text()).toContain('Live MQTT Console & Logs')
    expect(wrapper.text()).toContain('3 packets')

    // Filter by Telemetry
    const filterButtons = wrapper.findAll('button')
    const telemetryBtn = filterButtons.find((b) => b.text().includes('Telemetry'))
    await telemetryBtn.trigger('click')
    expect(wrapper.text()).toContain('1 packets')
    expect(wrapper.text()).toContain('telemetry')
    expect(wrapper.text()).not.toContain('online')

    // Filter by Status
    const statusBtn = filterButtons.find((b) => b.text().includes('Status (LWT)'))
    await statusBtn.trigger('click')
    expect(wrapper.text()).toContain('1 packets')
    expect(wrapper.text()).toContain('online')

    // Filter by Warnings & Errors
    const warningBtn = filterButtons.find((b) => b.text().includes('Warnings & Errors'))
    await warningBtn.trigger('click')
    expect(wrapper.text()).toContain('read failed')
  })

  it('triggers store.clearLogs() when clicking clear button', async () => {
    store.logs = [
      { id: '1', timestamp: Date.now(), topic: 'SYSTEM', payloadText: 'test', isError: false },
    ]
    const wrapper = mount(LiveLogsModal, {
      props: { isOpen: true },
    })

    const clearBtn = wrapper.findAll('button').find((b) => b.text().includes('Clear'))
    await clearBtn.trigger('click')
    expect(store.logs.length).toBe(0)
  })

  it('emits close event when close button is clicked', async () => {
    const wrapper = mount(LiveLogsModal, {
      props: { isOpen: true },
    })

    const closeBtn = wrapper.find('button .lucide-x').element.closest('button')
    await closeBtn.click()
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('copies payload to clipboard when copy button is clicked', async () => {
    const writeTextMock = vi.fn()
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    })

    store.logs = [
      { id: '1', timestamp: Date.now(), topic: 'SYSTEM', payloadText: 'copy-me-payload', isError: false },
    ]

    const wrapper = mount(LiveLogsModal, {
      props: { isOpen: true },
    })

    const copyBtn = wrapper.find('button[title="Copy Payload"]')
    await copyBtn.trigger('click')
    expect(writeTextMock).toHaveBeenCalledWith('copy-me-payload')
  })
})
