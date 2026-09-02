import type { TaskCategory } from './types';

export type AuthStackParams = {
  Login: undefined;
  Register: undefined;
};

export type TasksStackParams = {
  TasksList: undefined;
  TaskEdit: { taskId?: string; category?: TaskCategory };
};

export type ScheduleStackParams = {
  ScheduleWeek: undefined;
  ShiftEdit: { shiftId?: string; date?: string };
};

export type TeamStackParams = {
  TeamList: undefined;
  EmployeeEdit: { employeeId?: string };
};

export type ProfileStackParams = {
  ProfileMain: undefined;
  ProfileSettings: undefined;
};
