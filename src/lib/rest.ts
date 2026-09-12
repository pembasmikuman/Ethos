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

/** Copy `src` into Library/Sounds as `name`. Returns `name`, or null if it could not be
 *  placed. `reuse` skips the copy when a file of the same size is already there, which is
 *  safe for the one bundled bell but not for a slot that different sounds take turns in. */
async function place(src: File, name: string, reuse = false): Promise<string | null> {
  try {
    const dir = soundsDir();
    if (!dir.exists) dir.create({ intermediates: true });
    const dest = new File(dir, name);
    if (reuse && dest.exists && dest.size === src.size) return name;
    await src.copy(dest, { overwrite: true });
    return name;
  } catch {
    return null;
  }
}

export type Tone = { file: string; label: string; kind: 'alert' | 'ringtone' };

// The device's own sounds. Both folders are readable from the sandbox, so a tone can be
// copied into Library/Sounds and then asked for by name, which is the only way to get one
// of these onto a notification: iOS exposes no picker and no list of its own.
const TONE_DIRS: { uri: string; kind: Tone['kind'] }[] = [
  { uri: 'file:///System/Library/Audio/UISounds/New/', kind: 'alert' },
  { uri: 'file:///Library/Ringtones/', kind: 'ringtone' },
];
/** Names iOS shows for the older text tones, which sit on disk as sms-receivedN.caf. */
const CLASSIC: Record<string, string> = {
  'sms-received1.caf': 'Tri-tone',
  'sms-received2.caf': 'Chime',
  'sms-received3.caf': 'Glass',
  'sms-received4.caf': 'Horn',
  'sms-received5.caf': 'Bell',
  'sms-received6.caf': 'Electronic',
};

function label(file: string): string {
  // Several ringtones ship as -EncoreInfinitum / -EncoreRemix variants of the same name.
  return file.replace(/\.(caf|m4r)$/, '').replace(/-Encore\w+$/, '').replace(/_/g, ' ');
}

/** Every tone on the device, alert tones first. Empty on anything but iOS. */
export function systemTones(): Tone[] {
  if (Platform.OS !== 'ios') return [];
  const out: Tone[] = [];
  const seen = new Set<string>();
  const add = (file: string, uri: string, kind: Tone['kind'], name: string) => {
    if (seen.has(name)) return;
    seen.add(name);
    out.push({ file: `${uri}${file}`, label: name, kind });
  };
  for (const [file, name] of Object.entries(CLASSIC)) add(file, 'file:///System/Library/Audio/UISounds/', 'alert', name);
  for (const { uri, kind } of TONE_DIRS) {
    try {
      for (const f of new Directory(uri).list()) {
        if (/\.(caf|m4r)$/.test(f.name)) add(f.name, uri, kind, label(f.name));
      }
    } catch {
      // Folder not readable on this device or OS version. Skip it.
    }
  }
  return out.sort((a, b) => (a.kind === b.kind ? a.label.localeCompare(b.label) : a.kind === 'alert' ? -1 : 1));
}

/** Make one of the device's own tones the rest alert. Throws if it cannot be copied. */
export async function useSystemTone(tone: Tone): Promise<void> {
  const src = new File(tone.file);
  const ext = tone.file.endsWith('.m4r') ? 'm4r' : 'caf';
  if (!(await place(src, `${CUSTOM}.${ext}`, false))) throw new Error('Could not copy that tone into place');
  useUi.getState().setCustomSound(`${CUSTOM}.${ext}`, tone.label);
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

