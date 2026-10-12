import { TaskSimulation, TaskSimulationResult } from './priority.js';

/**
 * Shortest Job First (SJF) Scheduling Simulation (Non-Preemptive)
 * Orders tasks by shortest burst time (duration) first, then arrival time.
 */
export function simulateSJFScheduling(
  tasks: TaskSimulation[]
): TaskSimulationResult[] {
  const sorted = [...tasks].sort(
    (a, b) => a.burstTime - b.burstTime || a.arrivalTime - b.arrivalTime
  );

  let currentTime = 0;
  return sorted.map((task) => {
    if (currentTime < task.arrivalTime) {
      currentTime = task.arrivalTime;
    }
    const startTime = currentTime;
    const completionTime = startTime + task.burstTime;
    const turnaroundTime = completionTime - task.arrivalTime;
    const waitingTime = startTime - task.arrivalTime;

    currentTime = completionTime;

    return {
      ...task,
      startTime,
      completionTime,
      waitingTime,
      turnaroundTime,
    };
  });
}

