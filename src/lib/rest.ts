import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { Asset } from 'expo-asset';
import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';
import { useUi } from '../store/ui';

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

// iOS looks up a notification sound name in the app bundle and in `Library/Sounds`
// inside the app's own container. The bundle is out of reach under Expo Go, but that
// folder is writable, so sounds are copied there and referred to by name. The folder
// belongs to Expo Go and is shared with every project it runs, hence the prefix.
const BELL = 'ethos-bell.wav';
const CUSTOM = 'ethos-custom';
// iOS plays aiff, wav and caf only, under 30 seconds. Anything else falls back to the
// system sound with no error, which is why the settings screen has a Test button.
const AUDIO_TYPES = ['audio/wav', 'audio/x-wav', 'audio/aiff', 'audio/x-aiff', 'audio/x-caf'];

function soundsDir(): Directory {
  return new Directory(Paths.document.uri.replace(/\/Documents\/.*$/, '/Library/Sounds/'));
}

/** Copy `src` into Library/Sounds as `name`, skipping the copy if an identical one is
 *  already there. Returns `name`, or null if it could not be placed. */
async function place(src: File, name: string): Promise<string | null> {
  try {
    const dir = soundsDir();
    if (!dir.exists) dir.create({ intermediates: true });
    const dest = new File(dir, name);
    if (dest.exists && dest.size === src.size) return name;
    await src.copy(dest, { overwrite: true });
    return name;
  } catch {
    return null;
  }
}

async function installBell(): Promise<string | null> {
  try {
    const asset = Asset.fromModule(require('../../assets/bell.wav'));
    await asset.downloadAsync();
    return asset.localUri ? await place(new File(asset.localUri), BELL) : null;
  } catch {
    return null;
  }
}

/** Let the user pick an audio file and make it the rest alert. Returns its name, or
 *  null if they cancelled. Throws if the file could not be installed. */
export async function pickRestSound(): Promise<string | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: AUDIO_TYPES, copyToCacheDirectory: true });
  const picked = res.assets?.[0];
  if (!picked) return null;
  const ext = (picked.name.split('.').pop() ?? 'wav').toLowerCase();
  // Copy under a fixed name so iOS never has to resolve spaces or accents in a path.
  const file = `${CUSTOM}.${ext}`;
  if (!(await place(new File(picked.uri), file))) throw new Error('Could not copy that file into place');
  useUi.getState().setCustomSound(file, picked.name);
  return picked.name;
}

/** What to pass as the notification's `sound`: a filename in Library/Sounds, or true for
 *  the system sound. Android always gets the system sound, because a channel's sound is
 *  fixed when the channel is created. */
async function alertSound(): Promise<string | true> {
  if (Platform.OS !== 'ios') return true;
  const { restSound, customSound } = useUi.getState();
  if (restSound === 'system') return true;
  if (restSound === 'custom') {
    try {
      return customSound && new File(soundsDir(), customSound).exists ? customSound : true;
    } catch {
      return true;
    }
  }
  return (await installBell()) ?? true;
}

// Warm the copy at startup so the first completed set doesn't wait on it.
if (useUi.getState().restSound === 'bell') installBell();

let permissionAsked = false;

/** Schedule a local notification `seconds` from now. Returns notification id. */
export async function scheduleRestDone(seconds: number, body: string): Promise<string | null> {
  if (!permissionAsked) {
    permissionAsked = true;
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') await Notifications.requestPermissionsAsync();
  }
  if (seconds < 1) return null;
  const sound = await alertSound();
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

