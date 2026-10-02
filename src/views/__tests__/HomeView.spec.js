import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import HomeView from '../HomeView.vue'
import DeviceHero from '@/components/DeviceHero.vue'
import PowerSummary from '@/components/PowerSummary.vue'
import PowerCharts from '@/components/PowerCharts.vue'
import MeterGrid from '@/components/MeterGrid.vue'

vi.mock('chart.js/auto', () => {
  class MockChart {
    constructor() {
      this.data = { labels: [], datasets: [] }
    }
    update() {}
    destroy() {}
  }
  return {
    default: MockChart,
  }
})

describe('HomeView.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders all key dashboard sections and child components', () => {
    const wrapper = mount(HomeView)

    expect(wrapper.findComponent(DeviceHero).exists()).toBe(true)
    expect(wrapper.findComponent(PowerSummary).exists()).toBe(true)
    expect(wrapper.findComponent(PowerCharts).exists()).toBe(true)
    expect(wrapper.findComponent(MeterGrid).exists()).toBe(true)
  })
})
