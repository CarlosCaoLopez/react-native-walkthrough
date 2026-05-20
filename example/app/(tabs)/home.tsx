import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { TourTarget, useTour } from 'react-native-walkthrough';
import { onboardingTour } from '../../src/tours/onboarding';

export default function HomeScreen() {
  const { start, isRunning } = useTour();

  return (
    <View style={styles.container}>
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
    </View>
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
  button: {
    marginTop: 8,
    backgroundColor: '#6366f1',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
