import { Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { TourTarget, useTour } from 'react-native-walkthrough';
import { onboardingTour } from '../../src/tours/onboarding';

export default function HomeScreen() {
  const { start, isRunning } = useTour();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>Home</Text>
      <TourTarget id="home.search">
        <TextInput
          style={styles.searchBar}
          placeholder="Search..."
          placeholderTextColor="#999"
        />
      </TourTarget>
      {!isRunning && (
        <TouchableOpacity
          style={styles.button}
          onPress={() => start(onboardingTour.id)}
        >
          <Text style={styles.buttonText}>Start Tour</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={styles.buttonSecondary}
        onPress={() => router.push('/settings')}
      >
        <Text style={styles.buttonText}>Settings</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 16 },
  heading: { fontSize: 24, fontWeight: '700' },
  searchBar: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
  buttonSecondary: {
    marginTop: 8,
    backgroundColor: '#64748b',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  button: {
    marginTop: 8,
    backgroundColor: '#6366f1',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
