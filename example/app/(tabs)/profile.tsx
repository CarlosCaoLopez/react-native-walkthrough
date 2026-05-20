import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TourTarget } from 'react-native-walkthrough';

export default function ProfileScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <TourTarget id="profile.avatar">
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>JD</Text>
        </View>
      </TourTarget>
      <Text style={styles.name}>John Doe</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', paddingTop: 48 },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '700' },
  name: { marginTop: 16, fontSize: 20, fontWeight: '600' },
});
