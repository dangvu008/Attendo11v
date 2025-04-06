# Hướng dẫn tích hợp AlarmManager

Chúng tôi đã tạo một module quản lý thông báo mới để giải quyết các vấn đề với hệ thống thông báo hiện tại. Dưới đây là cách tích hợp module mới vào ứng dụng của bạn.

## Vấn đề đã xác định

1. **Thông báo bị lặp vô hạn (spam notification)**: Nhiều thông báo giống hệt nhau tại cùng một thời điểm.
2. **Thời gian thông báo sai**: Có thể do tính sai giờ hoặc múi giờ không đúng.
3. **Nút xác nhận không hủy được thông báo**: Do không lưu ID thông báo hoặc logic xử lý sai.

## Giải pháp

Module `alarmManager.js` mới được thiết kế để:

1. **Ngăn chặn trùng lặp thông báo** bằng cách lưu ID và kiểm tra trước khi tạo mới.
2. **Quản lý ID thông báo** để dễ dàng hủy.
3. **Đảm bảo thời gian thông báo chính xác**, bao gồm cả xử lý ca làm việc qua ngày mới.
4. **Cung cấp API đơn giản** cho việc tạo và hủy thông báo.

## Cách tích hợp

### Bước 1: Khởi tạo AlarmManager

Thay thế việc khởi tạo hệ thống thông báo cũ bằng AlarmManager mới:

```javascript
import { initializeAlarmManager } from "./utils/alarmManager";

// Trong hàm khởi tạo ứng dụng hoặc useEffect
await initializeAlarmManager();
```

### Bước 2: Tạo thông báo

Sử dụng API mới để lên lịch thông báo:

```javascript
import {
  scheduleAllAlarmsForShift,
  scheduleDepartureAlarm,
  scheduleCheckInAlarm,
  scheduleCheckOutAlarm,
} from "./utils/alarmManager";

// Lên lịch tất cả thông báo cho một ca làm việc
await scheduleAllAlarmsForShift(shift);

// Hoặc lên lịch từng thông báo riêng biệt
await scheduleDepartureAlarm(shift);
await scheduleCheckInAlarm(shift);
await scheduleCheckOutAlarm(shift);
```

### Bước 3: Hủy thông báo

Sử dụng API để hủy thông báo:

```javascript
import {
  cancelAlarm,
  cancelAllAlarms,
  ALARM_TYPES,
} from "./utils/alarmManager";

// Hủy một loại thông báo cụ thể
await cancelAlarm(ALARM_TYPES.DEPARTURE);
await cancelAlarm(ALARM_TYPES.CHECK_IN);
await cancelAlarm(ALARM_TYPES.CHECK_OUT);

// Hoặc hủy tất cả thông báo
await cancelAllAlarms();
```

### Bước 4: Xử lý các sự kiện thông báo

Thêm xử lý thông báo vào Notification listeners của ứng dụng:

```javascript
import { handleAlarmNotification } from "./utils/alarmManager";
import * as Notifications from "expo-notifications";

// Đăng ký listeners
const setupNotificationListeners = () => {
  const foregroundSubscription = Notifications.addNotificationReceivedListener(
    (notification) => {
      handleAlarmNotification(notification);
    }
  );

  const responseSubscription =
    Notifications.addNotificationResponseReceivedListener((response) => {
      handleAlarmNotification(response.notification);
    });

  return () => {
    foregroundSubscription.remove();
    responseSubscription.remove();
  };
};
```

### Bước 5: Cập nhật AlarmModal

Cập nhật component AlarmModal để thêm hành động hủy thông báo khi người dùng xác nhận:

```javascript
import { cancelAlarm, ALARM_TYPES } from "../utils/alarmManager";

// Trong component AlarmModal
const handleDismiss = async () => {
  // Dừng rung và cho phép màn hình tắt
  stopVibration();
  KeepAwake.deactivateKeepAwake();

  // Hủy thông báo nếu biết loại thông báo
  if (alarmType) {
    await cancelAlarm(alarmType);
  }

  onDismiss();
};
```

## Các tính năng bổ sung

### Liệt kê tất cả thông báo đã lên lịch

```javascript
import { listScheduledAlarms } from "./utils/alarmManager";

const alarms = await listScheduledAlarms();
console.log("Scheduled alarms:", alarms);
```

### Kiểm tra xem thông báo đã tồn tại chưa

```javascript
import { isAlarmScheduled, ALARM_TYPES } from "./utils/alarmManager";

const hasDepartureAlarm = await isAlarmScheduled(ALARM_TYPES.DEPARTURE);
if (hasDepartureAlarm) {
  console.log("Departure alarm already scheduled");
}
```

## Xử lý ca làm việc qua ngày

Module mới xử lý tự động ca làm việc qua ngày:

```javascript
// Trích từ scheduleCheckOutAlarm
if (hours < 12 && new Date().getHours() > 12) {
  // Giả sử ca đêm kết thúc vào sáng hôm sau
  endTime.setDate(endTime.getDate() + 1);
}
```

## Kiểm thử

Sau khi tích hợp, hãy kiểm tra:

1. Thông báo không bị trùng lặp khi khởi động ứng dụng nhiều lần.
2. Nút xác nhận thông báo hoạt động chính xác và hủy được thông báo.
3. Thời gian thông báo chính xác cho tất cả các ca làm việc.

## Gỡ rối

Khi gặp vấn đề, bạn có thể kiểm tra danh sách thông báo đã lên lịch:

```javascript
const alarms = await listScheduledAlarms();
console.log("Current alarms:", JSON.stringify(alarms, null, 2));
```

Và xóa tất cả thông báo để bắt đầu lại:

```javascript
await cancelAllAlarms();
```

Nếu còn bất kỳ vấn đề nào, vui lòng liên hệ với chúng tôi để được hỗ trợ thêm.
