export interface TaskRequest {
    id: string;
    taskName: string;
    burstTime: number; // Duration needed
    priority: number;  // 1 = High, 5 = Low
    arrivalTime: number;
}

export interface ScheduledTask extends TaskRequest {
    startTime: number;
    completionTime: number;
    waitingTime: number;
    turnaroundTime: number;
}

export class OSService {
    // First-Come, First-Served (FCFS) Scheduling
    static scheduleFCFS(tasks: TaskRequest[]): ScheduledTask[] {
        const sorted = [...tasks].sort((a, b) => a.arrivalTime - b.arrivalTime);
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

            return { ...task, startTime, completionTime, waitingTime, turnaroundTime };
        });
    }

    // Priority Scheduling
    static schedulePriority(tasks: TaskRequest[]): ScheduledTask[] {
        const sorted = [...tasks].sort((a, b) => a.priority - b.priority || a.arrivalTime - b.arrivalTime);
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

            return { ...task, startTime, completionTime, waitingTime, turnaroundTime };
        });
    }
}
