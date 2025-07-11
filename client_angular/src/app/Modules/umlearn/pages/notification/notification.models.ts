export interface INotification {
  message: string;
  type: NotificationType;
  duration: number;
}

export enum NotificationType {
  Success = 'success',
  Warning = 'warning',
  Error = 'error',
  Info = 'info',
}
