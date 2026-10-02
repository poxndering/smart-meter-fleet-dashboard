import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useMqttStore } from '../mqttStore'
import mqtt from 'mqtt'

// Mock mqtt module
vi.mock('mqtt', () => {
  const listeners = {}
  const mockClient = {
    on: vi.fn((event, callback) => {
      listeners[event] = callback
    }),
    subscribe: vi.fn((topics, callback) => {
      if (callback) callback(null)
    }),
    publish: vi.fn((topic, message, opts, callback) => {
      if (callback) callback(null)
    }),
    end: vi.fn((force, callback) => {
      if (callback) callback()
    }),
    // Helper for testing to trigger events
    _emit(event, ...args) {
      if (listeners[event]) {
        listeners[event](...args)
      }
    },
    _listeners: listeners,
  }

  return {
    default: {
      connect: vi.fn(() => mockClient),
    },
  }
})

describe('mqttStore', () => {
  let store
  let mockClient

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useMqttStore()
    mockClient = mqtt.connect()
    vi.clearAllMocks()
  })

  describe('Initial State & Getters', () => {
    it('initializes with default values', () => {
      expect(store.connectionStatus).toBe('disconnected')
      expect(store.errorMessage).toBe('')
      expect(store.devices).toEqual({})
      expect(store.selectedDeviceId).toBe('esp32-dev-main-meter-home')
      expect(store.logs).toEqual([])
      expect(store.publishStatus).toBe('')
      expect(store.settings.brokerUrl).toContain('mqtt.nxge.co')
    })

    it('returns empty deviceList when no devices exist', () => {
      expect(store.deviceList).toEqual([])
    })

    it('returns null for activeDevice when device does not exist', () => {
      expect(store.activeDevice).toBeNull()
    })

    it('returns 0 for totalPowerKw and totalEnergyKwh when no device is active', () => {
      expect(store.totalPowerKw).toBe(0)
      expect(store.totalEnergyKwh).toBe(0)
    })

    it('returns activeDevice when selectedDeviceId exists in devices', () => {
      store.devices['esp32-01'] = { deviceId: 'esp32-01', meters: {} }
      store.selectedDeviceId = 'esp32-01'
      expect(store.activeDevice).toBe(store.devices['esp32-01'])
    })

    it('falls back to the first device in devices if selectedDeviceId is not found', () => {
      store.devices['esp32-fallback'] = { deviceId: 'esp32-fallback', meters: {} }
      store.selectedDeviceId = 'non-existent'
      expect(store.activeDevice).toBe(store.devices['esp32-fallback'])
    })
  })

  describe('Log Management', () => {
    it('prepends logs with id, timestamp, topic, payloadText, and isError', () => {
      store.addLog('SYSTEM', 'Test log message', false)
      expect(store.logs.length).toBe(1)
      expect(store.logs[0].topic).toBe('SYSTEM')
      expect(store.logs[0].payloadText).toBe('Test log message')
      expect(store.logs[0].isError).toBe(false)
      expect(typeof store.logs[0].id).toBe('string')
      expect(typeof store.logs[0].timestamp).toBe('number')
    })

    it('limits logs to a maximum of 80 entries (ring buffer)', () => {
      for (let i = 0; i < 90; i++) {
        store.addLog('SYSTEM', `Log ${i}`)
      }
      expect(store.logs.length).toBe(80)
      expect(store.logs[0].payloadText).toBe('Log 89')
      expect(store.logs[79].payloadText).toBe('Log 10')
    })

    it('clears all logs on clearLogs()', () => {
      store.addLog('SYSTEM', 'Log 1')
      store.addLog('SYSTEM', 'Log 2')
      expect(store.logs.length).toBe(2)
      store.clearLogs()
      expect(store.logs.length).toBe(0)
    })
  })

  describe('Topic Validation & Device Registration in handleIncomingMessage', () => {
    it('ignores topics with less than 4 parts or incorrect prefix', () => {
      store.handleIncomingMessage('home/main-elec', 'telemetry')
      store.handleIncomingMessage('office/main-elec/dev1/telemetry', '{"val": 1}')
      store.handleIncomingMessage('home/sub-elec/dev1/telemetry', '{"val": 1}')
      expect(Object.keys(store.devices).length).toBe(0)
    })

    it('ignores topics with missing deviceId or messageType', () => {
      store.handleIncomingMessage('home/main-elec//telemetry', '{"val": 1}')
      store.handleIncomingMessage('home/main-elec/dev1/', '{"val": 1}')
      expect(Object.keys(store.devices).length).toBe(0)
    })

    it('registers new device entry with initial schema when valid topic arrives', () => {
      store.handleIncomingMessage('home/main-elec/esp32-node1/status', 'online')
      const dev = store.devices['esp32-node1']
      expect(dev).toBeDefined()
      expect(dev.deviceId).toBe('esp32-node1')
      expect(dev.status).toBe('online')
      expect(dev.meters).toEqual({})
      expect(dev.knownMeters).toEqual([])
      expect(dev.readFailedMeters).toEqual([])
      expect(dev.history).toEqual([])
      expect(typeof dev.lastSeen).toBe('number')
    })
  })

  describe('Status Message Handling', () => {
    it('updates device status to online or offline correctly', () => {
      store.handleIncomingMessage('home/main-elec/esp32-node1/status', 'online')
      expect(store.devices['esp32-node1'].status).toBe('online')

      store.handleIncomingMessage('home/main-elec/esp32-node1/status', ' Offline ')
      expect(store.devices['esp32-node1'].status).toBe('offline')
    })

    it('ignores unknown status payloads', () => {
      store.handleIncomingMessage('home/main-elec/esp32-node1/status', 'online')
      store.handleIncomingMessage('home/main-elec/esp32-node1/status', 'unknown_state')
      expect(store.devices['esp32-node1'].status).toBe('online')
    })
  })

  describe('Telemetry Message Handling', () => {
    it('catches malformed JSON gracefully and logs an error without throwing', () => {
      store.handleIncomingMessage('home/main-elec/esp32-node1/telemetry', 'INVALID_JSON{')
      const errorLog = store.logs.find((l) => l.isError && l.topic === 'ERROR')
      expect(errorLog).toBeDefined()
      expect(errorLog.payloadText).toContain('Malformed telemetry JSON')
    })

    it('updates device metadata: rssi, localIp, and rawPayload', () => {
      const payload = {
        rssi: -58,
        localIp: '192.168.1.150',
      }
      store.handleIncomingMessage('home/main-elec/esp32-node1/telemetry', JSON.stringify(payload))
      const dev = store.devices['esp32-node1']
      expect(dev.rssi).toBe(-58)
      expect(dev.localIp).toBe('192.168.1.150')
      expect(dev.rawPayload).toEqual(payload)
      expect(dev.status).toBe('online')
    })

    it('parses meter metrics dynamically using METRIC_SUFFIXES', () => {
      const payload = {
        main_power_volt: 228.4,
        main_power_current: 5.62,
        main_power_power: 1283.6,
        main_power_kw: 1.284,
        main_power_freq: 50.0,
        main_power_pf: 0.98,
        air01_volt: 228.1,
        air01_current: 2.1,
        air01_power: 479.0,
        air01_kw: 0.479,
      }
      store.handleIncomingMessage('home/main-elec/esp32-node1/telemetry', JSON.stringify(payload))
      const dev = store.devices['esp32-node1']

      expect(dev.knownMeters).toContain('main_power')
      expect(dev.knownMeters).toContain('air01')

      // Check main_power metrics
      const mainMeter = dev.meters['main_power']
      expect(mainMeter.name).toBe('Main Power')
      expect(mainMeter.volt).toBe(228.4)
      expect(mainMeter.current).toBe(5.62)
      expect(mainMeter.power).toBe(1283.6)
      expect(mainMeter.kw).toBe(1.284)
      expect(mainMeter.freq).toBe(50.0)
      expect(mainMeter.pf).toBe(0.98)
      expect(mainMeter.isReadFailed).toBe(false)

      // Check air01 metrics
      const airMeter = dev.meters['air01']
      expect(airMeter.name).toBe('Air 01')
      expect(airMeter.power).toBe(479.0)
      expect(airMeter.isReadFailed).toBe(false)
    })

    it('detects read failed meters when a previously known meter is missing in payload', () => {
      // First round: both meters present
      const payload1 = {
        main_power_volt: 228.0,
        main_power_power: 1000,
        air01_volt: 228.0,
        air01_power: 500,
      }
      store.handleIncomingMessage('home/main-elec/esp32-node1/telemetry', JSON.stringify(payload1))

      expect(store.devices['esp32-node1'].meters['air01'].power).toBe(500)
      expect(store.devices['esp32-node1'].readFailedMeters).toEqual([])

      // Second round: air01 is missing (read failed from hardware)
      const payload2 = {
        main_power_volt: 229.0,
        main_power_power: 1100,
      }
      store.handleIncomingMessage('home/main-elec/esp32-node1/telemetry', JSON.stringify(payload2))
      const dev = store.devices['esp32-node1']

      expect(dev.readFailedMeters).toContain('air01')
      const airMeter = dev.meters['air01']
      expect(airMeter.isReadFailed).toBe(true)
      // Check that stale values are cleared to undefined
      expect(airMeter.volt).toBeUndefined()
      expect(airMeter.current).toBeUndefined()
      expect(airMeter.power).toBeUndefined()
      expect(airMeter.kw).toBeUndefined()

      // Should add a system log for read failure
      const failLog = store.logs.find((l) => l.payloadText.includes('[meter] air01 read failed'))
      expect(failLog).toBeDefined()
      expect(failLog.isError).toBe(true)
    })

    it('recovers meter when reading succeeds in subsequent payload', () => {
      // 1. Initial state with meter
      store.handleIncomingMessage(
        'home/main-elec/esp32-node1/telemetry',
        JSON.stringify({ pump_power: 300, pump_volt: 225 })
      )
      // 2. Read failed
      store.handleIncomingMessage(
        'home/main-elec/esp32-node1/telemetry',
        JSON.stringify({})
      )
      expect(store.devices['esp32-node1'].meters['pump'].isReadFailed).toBe(true)

      // 3. Recovery
      store.handleIncomingMessage(
        'home/main-elec/esp32-node1/telemetry',
        JSON.stringify({ pump_power: 320, pump_volt: 226 })
      )
      const pumpMeter = store.devices['esp32-node1'].meters['pump']
      expect(pumpMeter.isReadFailed).toBe(false)
      expect(pumpMeter.power).toBe(320)
      expect(pumpMeter.volt).toBe(226)
      expect(store.devices['esp32-node1'].readFailedMeters).not.toContain('pump')
    })
  })

  describe('Total Power & Voltage Aggregation in History', () => {
    it('uses main_power when main_power is healthy', () => {
      const payload = {
        main_power_power: 2500,
        main_power_volt: 230,
        air01_power: 1000,
      }
      store.handleIncomingMessage('home/main-elec/esp32-node1/telemetry', JSON.stringify(payload))
      const history = store.devices['esp32-node1'].history
      expect(history.length).toBe(1)
      expect(history[0].totalPower).toBe(2500)
      expect(history[0].mainVolt).toBe(230)
      expect(history[0].metersPower).toEqual({
        main_power: 2500,
        air01: 1000,
      })
    })

    it('falls back to sum of submeters when main_power is absent or read failed', () => {
      const payload = {
        sub1_power: 450,
        sub1_volt: 229.5,
        sub2_power: 350,
        sub2_volt: 229.5,
      }
      store.handleIncomingMessage('home/main-elec/esp32-node1/telemetry', JSON.stringify(payload))
      const history = store.devices['esp32-node1'].history
      expect(history.length).toBe(1)
      expect(history[0].totalPower).toBe(800) // 450 + 350
      expect(history[0].mainVolt).toBe(229.5)
    })

    it('maintains maximum of 30 history entries (ring buffer)', () => {
      for (let i = 1; i <= 35; i++) {
        store.handleIncomingMessage(
          'home/main-elec/esp32-node1/telemetry',
          JSON.stringify({ main_power_power: i * 100, main_power_volt: 230 })
        )
      }
      const history = store.devices['esp32-node1'].history
      expect(history.length).toBe(30)
      expect(history[0].totalPower).toBe(600) // 6th entry
      expect(history[29].totalPower).toBe(3500) // 35th entry
    })

    it('auto-selects device if selectedDeviceId has no data', () => {
      store.selectedDeviceId = 'non-existent'
      store.handleIncomingMessage(
        'home/main-elec/esp32-discovered/telemetry',
        JSON.stringify({ main_power_power: 500 })
      )
      expect(store.selectedDeviceId).toBe('esp32-discovered')
    })
  })

  describe('Getters: totalPowerKw and totalEnergyKwh', () => {
    it('calculates totalPowerKw from main_power.kw if present', () => {
      store.devices['esp32-01'] = {
        deviceId: 'esp32-01',
        meters: {
          main_power: { kw: 3.456, isReadFailed: false },
          air: { kw: 1.2, isReadFailed: false },
        },
      }
      store.selectedDeviceId = 'esp32-01'
      expect(store.totalPowerKw).toBe(3.456)
    })

    it('calculates totalPowerKw from main_power.power / 1000 if kw not present', () => {
      store.devices['esp32-01'] = {
        deviceId: 'esp32-01',
        meters: {
          main_power: { power: 2500, isReadFailed: false },
        },
      }
      store.selectedDeviceId = 'esp32-01'
      expect(store.totalPowerKw).toBe(2.5)
    })

    it('sums active submeters when main_power is missing or read failed', () => {
      store.devices['esp32-01'] = {
        deviceId: 'esp32-01',
        meters: {
          main_power: { kw: 5.0, isReadFailed: true }, // failed!
          sub1: { kw: 1.2, isReadFailed: false },
          sub2: { power: 800, isReadFailed: false }, // 0.8 kW
          sub3: { kw: 2.0, isReadFailed: true }, // failed submeter excluded
        },
      }
      store.selectedDeviceId = 'esp32-01'
      expect(store.totalPowerKw).toBe(2.0) // 1.2 + 0.8
    })

    it('calculates totalEnergyKwh correctly with fallback and excludes failed meters', () => {
      store.devices['esp32-01'] = {
        deviceId: 'esp32-01',
        meters: {
          main_power: { kwh: 120.5, isReadFailed: false },
        },
      }
      store.selectedDeviceId = 'esp32-01'
      expect(store.totalEnergyKwh).toBe(120.5)

      // Fallback test
      store.devices['esp32-01'].meters['main_power'].isReadFailed = true
      store.devices['esp32-01'].meters['sub1'] = { energy: 50000, isReadFailed: false } // 50 kWh
      store.devices['esp32-01'].meters['sub2'] = { kwh: 25.5, isReadFailed: false }
      expect(store.totalEnergyKwh).toBe(75.5)
    })
  })

  describe('Actions: Connection & Remote Config', () => {
    it('sets up client listeners and updates status upon connect()', () => {
      store.connect()
      expect(mqtt.connect).toHaveBeenCalled()
      expect(store.connectionStatus).toBe('connecting')

      // Emit connect event
      mockClient._emit('connect')
      expect(store.connectionStatus).toBe('connected')
      expect(mockClient.subscribe).toHaveBeenCalledWith(
        [store.settings.topicTelemetry, store.settings.topicStatus],
        expect.any(Function)
      )

      // Emit message event
      mockClient._emit('message', 'home/main-elec/esp32-test/status', Buffer.from('online'))
      expect(store.devices['esp32-test'].status).toBe('online')

      // Emit error event
      mockClient._emit('error', new Error('Broker socket failure'))
      expect(store.connectionStatus).toBe('error')
      expect(store.errorMessage).toBe('Broker socket failure')

      // Emit offline event
      mockClient._emit('offline')
      expect(store.connectionStatus).toBe('disconnected')

      // Emit close event
      mockClient._emit('close')
      expect(store.connectionStatus).toBe('disconnected')
    })

    it('disconnects and resets client on disconnect()', () => {
      store.connect()
      store.disconnect()
      expect(mockClient.end).toHaveBeenCalled()
      expect(store.client).toBeNull()
      expect(store.connectionStatus).toBe('disconnected')
    })

    it('publishes remote config when connected', () => {
      store.connect()
      mockClient._emit('connect')

      const success = store.publishRemoteConfig('esp32-01', 5)
      expect(success).toBe(true)
      expect(mockClient.publish).toHaveBeenCalledWith(
        'home/main-elec/esp32-01/config',
        JSON.stringify({ interval: 5, report_interval_sec: 5 }),
        { qos: 0, retain: false },
        expect.any(Function)
      )
    })

    it('publishes custom remote config payload when provided', () => {
      store.connect()
      mockClient._emit('connect')

      const custom = JSON.stringify({ interval: 10, mode: 'eco' })
      const success = store.publishRemoteConfig('esp32-01', 10, custom)
      expect(success).toBe(true)
      expect(mockClient.publish).toHaveBeenCalledWith(
        'home/main-elec/esp32-01/config',
        custom,
        { qos: 0, retain: false },
        expect.any(Function)
      )
    })

    it('rejects publishRemoteConfig when not connected', () => {
      store.connectionStatus = 'disconnected'
      const success = store.publishRemoteConfig('esp32-01', 5)
      expect(success).toBe(false)
      expect(store.publishStatus).toBe('Broker not connected')
    })

    it('updates settings and reconnects if brokerUrl changes', () => {
      const connectSpy = vi.spyOn(store, 'connect')
      store.updateSettings({ reconnectPeriod: 5000 })
      expect(store.settings.reconnectPeriod).toBe(5000)
      expect(connectSpy).not.toHaveBeenCalled()

      store.updateSettings({ brokerUrl: 'ws://custom-broker:9001/mqtt' })
      expect(store.settings.brokerUrl).toBe('ws://custom-broker:9001/mqtt')
      expect(connectSpy).toHaveBeenCalled()
    })

    it('selects device on selectDevice()', () => {
      store.selectDevice('esp32-garage')
      expect(store.selectedDeviceId).toBe('esp32-garage')
    })
  })
})
