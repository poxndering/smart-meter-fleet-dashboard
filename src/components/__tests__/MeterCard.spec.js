import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MeterCard from '../MeterCard.vue'

describe('MeterCard.vue', () => {
  const healthyMeter = {
    prefix: 'air01',
    name: 'Air 01',
    volt: 228.4,
    current: 4.56,
    power: 1041.5,
    kw: 1.0415,
    freq: 50.0,
    pf: 0.98,
    isReadFailed: false,
    lastUpdated: Date.now(),
  }

  const failedMeter = {
    prefix: 'air02',
    name: 'Air 02',
    isReadFailed: true,
  }

  it('renders meter title, prefix, and branch circuit description', () => {
    const wrapper = mount(MeterCard, {
      props: {
        meter: healthyMeter,
        totalMainPowerW: 2500,
      },
    })

    expect(wrapper.text()).toContain('Air 01')
    expect(wrapper.text()).toContain('air01')
    expect(wrapper.text()).toContain('Branch Circuit')
    expect(wrapper.text()).toContain('Active')
  })

  it('renders incoming feeder description when meter prefix is main_power', () => {
    const mainMeter = {
      prefix: 'main_power',
      name: 'Main Power',
      volt: 230.1,
      current: 10.5,
      power: 2416.0,
      kw: 2.416,
      freq: 50.0,
      pf: 0.99,
      isReadFailed: false,
    }

    const wrapper = mount(MeterCard, {
      props: {
        meter: mainMeter,
        totalMainPowerW: 2416,
      },
    })

    expect(wrapper.text()).toContain('Main Power')
    expect(wrapper.text()).toContain('Incoming Feeder')
    expect(wrapper.text()).toContain('100%') // isMain load share is 100%
  })

  it('displays accurate electrical metrics when healthy', () => {
    const wrapper = mount(MeterCard, {
      props: {
        meter: healthyMeter,
        totalMainPowerW: 2500,
      },
    })

    expect(wrapper.text()).toContain('1041.5')
    expect(wrapper.text()).toContain('1.0415 kW')
    expect(wrapper.text()).toContain('228.4 V')
    expect(wrapper.text()).toContain('4.560 A')
    expect(wrapper.text()).toContain('50.0 Hz')
    expect(wrapper.text()).toContain('0.98')
  })

  it('computes and displays load share percentage', () => {
    const wrapper = mount(MeterCard, {
      props: {
        meter: healthyMeter, // 1041.5 W
        totalMainPowerW: 2083, // 1041.5 / 2083 = 50.0%
      },
    })

    expect(wrapper.text()).toContain('50%')
  })

  it('renders read failed state with alert banner and prevents stale data with em-dash', () => {
    const wrapper = mount(MeterCard, {
      props: {
        meter: failedMeter,
        totalMainPowerW: 2500,
      },
    })

    expect(wrapper.text()).toContain('Read Failed')
    expect(wrapper.text()).toContain('[meter] air02 read failed — no data in this transmission cycle')
    // Shows dash for power and other electrical metrics
    expect(wrapper.text()).toContain('—')
    expect(wrapper.classes()).toContain('border-rose-300')
  })

  it('applies correct accent color classes based on meter prefix type', () => {
    const airWrapper = mount(MeterCard, {
      props: { meter: { prefix: 'air_bedroom', name: 'Air Bedroom', isReadFailed: false } },
    })
    expect(airWrapper.find('.h-1').classes()).toContain('bg-sky-500')

    const otherWrapper = mount(MeterCard, {
      props: { meter: { prefix: 'water_pump', name: 'Water Pump', isReadFailed: false } },
    })
    expect(otherWrapper.find('.h-1').classes()).toContain('bg-emerald-500')

    const mainWrapper = mount(MeterCard, {
      props: { meter: { prefix: 'main_power', name: 'Main Power', isReadFailed: false } },
    })
    expect(mainWrapper.find('.h-1').classes()).toContain('bg-cyan-600')

    const failedWrapper = mount(MeterCard, {
      props: { meter: { prefix: 'solar_pv', name: 'Solar PV', isReadFailed: true } },
    })
    expect(failedWrapper.find('.h-1').classes()).toContain('bg-rose-500')
  })
})
