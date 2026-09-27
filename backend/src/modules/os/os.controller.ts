type Request = any;
type Response = any;
import { OSService } from './os.service';

export const handleOSSchedule = async (req: Request, res: Response): Promise<void> => {
    try {
        const { tasks, algorithm } = req.body;

        if (!tasks || !Array.isArray(tasks)) {
            res.status(400).json({ error: 'Tasks array is required.' });
            return;
        }

        let result;
        if (algorithm === 'PRIORITY') {
            result = OSService.schedulePriority(tasks);
        } else {
            result = OSService.scheduleFCFS(tasks);
        }

        res.status(200).json({
            success: true,
            algorithm: algorithm || 'FCFS',
            data: result,
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to execute OS algorithm.' });
    }
};
