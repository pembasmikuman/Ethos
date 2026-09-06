import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let permissionAsked = false;

/** Schedule a local notification `seconds` from now. Returns notification id. */
export async function scheduleRestDone(seconds: number, body: string): Promise<string | null> {
  if (!permissionAsked) {
    permissionAsked = true;
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') await Notifications.requestPermissionsAsync();
  }
  if (seconds < 1) return null;
  try {
    return await Notifications.scheduleNotificationAsync({
      content: { title: 'Rest done', body, sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds },
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
