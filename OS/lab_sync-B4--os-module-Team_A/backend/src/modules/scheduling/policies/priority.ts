export interface TaskSimulation {
  id: string;
  name: string;
  burstTime: number; // Duration in minutes/time-units
  priority: number;  // Lower number = higher priority (0 = Admin, 1 = Faculty, 2 = Student)
  arrivalTime: number;
}

export interface TaskSimulationResult extends TaskSimulation {
  startTime: number;
  completionTime: number;
  waitingTime: number;
  turnaroundTime: number;
}

/**
 * Priority Scheduling Simulation (Non-Preemptive)
 * Orders tasks by priority first, then arrival time as tie-breaker.
 */
export function simulatePriorityScheduling(
  tasks: TaskSimulation[]
): TaskSimulationResult[] {
  const sorted = [...tasks].sort(
    (a, b) => a.priority - b.priority || a.arrivalTime - b.arrivalTime
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

