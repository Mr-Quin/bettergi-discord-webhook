export namespace BetterGI {
  export enum TaskEvent {
    GeniusInvocation = 'GeniusInvocation',
    Domain = 'Domain',
  }

  export enum LifecycleEvent {
    Test = 'Test',
  }

  export enum TaskAction {
    Started = 'Started',
    Completed = 'Completed',
    Progress = 'Progress',
  }

  export enum TaskConclusion {
    Success = 'Success',
    Failure = 'Failure',
    Cancelled = 'Cancelled',
  }

  export type TaskNotification = {
    event: TaskEvent
    action?: TaskAction
    conclusion?: TaskConclusion
    // base64 encoded image
    screenshot?: string
    task: unknown
  }

  export type LifecycleNotification = {
    event: LifecycleEvent
    payload: unknown
  }

  export type Notification = TaskNotification | LifecycleNotification
}
