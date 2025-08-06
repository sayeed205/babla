import { Clapperboard, House } from 'lucide-react'

import { type SidebarData } from '../types'

export const sidebarData: SidebarData['navGroups'] = [
  {
    title: 'General',
    items: [
      {
        title: 'Home',
        url: '/home',
        icon: House,
      },
      {
        title: 'Movies',
        url: '/movies',
        icon: Clapperboard,
      },
    ],
  },
]
