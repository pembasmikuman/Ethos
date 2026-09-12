import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Android plays sound and shows a heads-up banner only on a high-importance channel.
if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('rest', {
    name: 'Rest timer',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 150, 250],
  }).catch(() => {});
}

// iOS looks up a notification sound name in the app bundle and in `Library/Sounds` inside
// the app's own container. The bundle is out of reach under Expo Go, but that folder is
// writable and the phone's own sounds are readable, so Glass gets copied across and is
// then asked for by name. The folder belongs to Expo Go and is shared with every project
// it runs, hence the prefix on the copy.
const GLASS_SRC = 'file:///System/Library/Audio/UISounds/sms-received3.caf';
const GLASS = 'ethos-glass.caf';
let glass: Promise<string | null> | null = null;

/** Resolves to the sound name to ask for, or null if the copy failed and the caller
 *  should fall back to the system alert. */
function installGlass(): Promise<string | null> {
  glass ??= (async () => {
    if (Platform.OS !== 'ios') return null;
    try {
      const dir = new Directory(Paths.document.uri.replace(/\/Documents\/.*$/, '/Library/Sounds/'));
      if (!dir.exists) dir.create({ intermediates: true });
      const dest = new File(dir, GLASS);
      const src = new File(GLASS_SRC);
      if (!dest.exists || dest.size !== src.size) await src.copy(dest, { overwrite: true });
      return GLASS;
    } catch {
      return null;
    }
  })();
  return glass;
}

// Warm the copy at startup so the first completed set doesn't wait on it.
installGlass();

let permissionAsked = false;

/** Schedule a local notification `seconds` from now. Returns notification id. */
export async function scheduleRestDone(seconds: number, body: string): Promise<string | null> {
  if (!permissionAsked) {
    permissionAsked = true;
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') await Notifications.requestPermissionsAsync();
  }
  if (seconds < 1) return null;
  const sound = (await installGlass()) ?? true;
  try {
    return await Notifications.scheduleNotificationAsync({
      content: { title: 'Rest done', body, sound },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds, channelId: 'rest' },
    });
  } catch {
    return null;
  }
}

export async function cancelRestDone(id: string | null): Promise<void> {
  if (id) await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
}

export function tapHaptic(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function doneHaptic(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

