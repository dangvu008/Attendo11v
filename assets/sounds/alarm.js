// This is a placeholder for the alarm sound
// In a real app, you would have an actual MP3 file here
// For now, we'll modify the alarmUtils.js to use a different approach

// Khai báo file âm thanh chuông
// Sử dụng để phát âm thanh khi có thông báo thời tiết
import { Audio } from "expo-av";

export const ALARM_SOUND_AVAILABLE = true;
export const ALARM_SOUND = require("./chuong.mp3");

// Đối tượng để lưu trữ tham chiếu đến âm thanh đang phát
let soundInstance = null;

// Phát âm thanh chuông
export const playAlarm = async (volume = 1.0) => {
  try {
    // Dừng âm thanh đang phát (nếu có)
    await stopAlarm();

    // Tạo và phát âm thanh mới
    const { sound } = await Audio.Sound.createAsync(ALARM_SOUND, {
      shouldPlay: true,
      volume: volume,
    });

    soundInstance = sound;

    // Xử lý khi âm thanh phát xong
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.didJustFinish) {
        sound.unloadAsync();
        soundInstance = null;
      }
    });

    return sound;
  } catch (error) {
    console.error("Error playing alarm sound:", error);
    return null;
  }
};

// Dừng âm thanh đang phát
export const stopAlarm = async () => {
  if (soundInstance) {
    try {
      await soundInstance.stopAsync();
      await soundInstance.unloadAsync();
      soundInstance = null;
    } catch (error) {
      console.error("Error stopping alarm sound:", error);
    }
  }
};
