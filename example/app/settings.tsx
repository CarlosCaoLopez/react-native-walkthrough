import { View, Text, Switch, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TourTarget } from 'react-native-walkthrough';

export default function SettingsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>Settings</Text>
      <TourTarget id="settings.notifs">
        <View style={styles.row}>
          <Text style={styles.label}>Notifications</Text>
          <Switch />
        </View>
      </TourTarget>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  heading: { fontSize: 24, fontWeight: '700', marginBottom: 24 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
  },
  label: { fontSize: 16 },
});
