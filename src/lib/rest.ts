import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { Asset } from 'expo-asset';
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

const BELL = 'bell.wav';
let bell: Promise<string | null> | null = null;

/** iOS looks up a notification sound name in the app bundle and in `Library/Sounds`
 *  inside the app's own container. The bundle is out of reach under Expo Go, but the
 *  container folder is writable, so copy the bell there on first use and refer to it
 *  by name. Resolves to null if anything fails, and the caller falls back to the
 *  system sound. */
function installBell(): Promise<string | null> {
  bell ??= (async () => {
    try {
      if (Platform.OS !== 'ios') return null;
      const dir = new Directory(Paths.document.uri.replace(/\/Documents\/.*$/, '/Library/Sounds/'));
      if (!dir.exists) dir.create({ intermediates: true });
      const dest = new File(dir, BELL);
      const asset = Asset.fromModule(require('../../assets/bell.wav'));
      await asset.downloadAsync();
      if (!asset.localUri) return null;
      const src = new File(asset.localUri);
      if (dest.exists && dest.size === src.size) return BELL;
      await src.copy(dest, { overwrite: true });
      return BELL;
    } catch {
      return null;
    }
  })();
  return bell;
}

// Warm the copy at startup so the first completed set doesn't wait on it.
installBell();

let permissionAsked = false;

/** Schedule a local notification `seconds` from now. Returns notification id. */
export async function scheduleRestDone(seconds: number, body: string): Promise<string | null> {
  if (!permissionAsked) {
    permissionAsked = true;
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') await Notifications.requestPermissionsAsync();
  }
  if (seconds < 1) return null;
  const sound = (await installBell()) ?? true;
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

