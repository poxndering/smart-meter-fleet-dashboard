import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import HeaderNav from '../HeaderNav.vue'
import { useMqttStore } from '@/stores/mqttStore'

describe('HeaderNav.vue', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useMqttStore()
  })

  it('renders branding and connection status', () => {
    store.connectionStatus = 'connected'
    const wrapper = mount(HeaderNav)

    expect(wrapper.text()).toContain('Smart Meter Fleet')
    expect(wrapper.text()).toContain('Live MQTT')
    expect(wrapper.text()).toContain('connected')
  })

  it('displays device options in selector dropdown', () => {
    store.devices = {
      'dev-1': { deviceId: 'dev-1' },
      'dev-2': { deviceId: 'dev-2' },
    }
    const wrapper = mount(HeaderNav)

    const select = wrapper.find('select')
    const options = select.findAll('option')
    expect(options.length).toBe(2)
    expect(options[0].text()).toBe('dev-1')
    expect(options[1].text()).toBe('dev-2')
  })

  it('shows error count badge in Logs button when errors exist', () => {
    store.logs = [
      { id: '1', topic: 'ERROR', payloadText: 'failed', isError: true },
      { id: '2', topic: 'SYSTEM', payloadText: 'ok', isError: false },
    ]
    const wrapper = mount(HeaderNav)
    expect(wrapper.text()).toContain('Logs')
    expect(wrapper.text()).toContain('1') // Badge count
  })

  it('triggers store.connect() when clicking Reconnect button', async () => {
    store.connectionStatus = 'disconnected'
    const connectSpy = vi.spyOn(store, 'connect')
    const wrapper = mount(HeaderNav)

    const reconnectBtn = wrapper.findAll('button').find((b) => b.text().includes('Reconnect'))
    await reconnectBtn.trigger('click')
    expect(connectSpy).toHaveBeenCalled()
  })

  it('emits open-config, open-logs, and open-settings events on button clicks', async () => {
    const wrapper = mount(HeaderNav)

    const configBtn = wrapper.findAll('button').find((b) => b.text().includes('Remote Config'))
    await configBtn.trigger('click')
    expect(wrapper.emitted('open-config')).toBeTruthy()

    const logsBtn = wrapper.findAll('button').find((b) => b.text().includes('Logs'))
    await logsBtn.trigger('click')
    expect(wrapper.emitted('open-logs')).toBeTruthy()

    const settingsBtn = wrapper.find('button[title="MQTT Settings"]')
    await settingsBtn.trigger('click')
    expect(wrapper.emitted('open-settings')).toBeTruthy()
  })
})
