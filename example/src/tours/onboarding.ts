import { defineTour } from 'react-native-walkthrough';

export const onboardingTour = defineTour({
  id: 'onboarding',
  steps: [
    {
      id: 'search',
      route: '/(tabs)',
      target: 'home.search',
      title: 'Search',
      text: 'Find anything fast with the search bar.',
    },
    {
      id: 'profile',
      route: '/(tabs)/profile',
      target: 'profile.avatar',
      title: 'Your Profile',
      text: 'Your account and preferences live here.',
    },
    {
      id: 'notifications',
      route: '/settings',
      target: 'settings.notifs',
      title: 'Notifications',
      text: 'Control which alerts you receive.',
    },
  ],
});
