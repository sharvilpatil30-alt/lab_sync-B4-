import { TaskSimulation } from './priority.js';

export interface RoundRobinExecutionSlice {
  taskId: string;
  taskName: string;
  startTime: number;
  endTime: number;
  remainingBurst: number;
}

export interface RoundRobinResult {
  slices: RoundRobinExecutionSlice[];
  completedTasks: {
    id: string;
    taskName: string;
    completionTime: number;
    turnaroundTime: number;
    waitingTime: number;
  }[];
}

/**
 * Round Robin (RR) Scheduling Simulation (Preemptive with Time Quantum)
 */
export function simulateRoundRobinScheduling(
  tasks: TaskSimulation[],
  timeQuantum: number = 2
): RoundRobinResult {
  const queue = tasks.map((t) => ({ ...t, remaining: t.burstTime }));
  const slices: RoundRobinExecutionSlice[] = [];
  const completed: RoundRobinResult['completedTasks'] = [];

  let currentTime = 0;

  while (queue.length > 0) {
    const task = queue.shift()!;
    if (currentTime < task.arrivalTime) {
      currentTime = task.arrivalTime;
    }

    const execTime = Math.min(task.remaining, timeQuantum);
    const start = currentTime;
    currentTime += execTime;
    task.remaining -= execTime;

    slices.push({
      taskId: task.id,
      taskName: task.name,
      startTime: start,
      endTime: currentTime,
      remainingBurst: task.remaining,
    });

    if (task.remaining > 0) {
      queue.push(task);
    } else {
      const completionTime = currentTime;
      const turnaroundTime = completionTime - task.arrivalTime;
      const waitingTime = turnaroundTime - task.burstTime;

      completed.push({
        id: task.id,
        taskName: task.name,
        completionTime,
        turnaroundTime,
        waitingTime,
      });
    }
  }

  return { slices, completedTasks: completed };
}

