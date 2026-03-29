import { useReminderScheduler } from '../hooks/useReminderScheduler';

/**
 * Component that runs the reminder scheduler in the background
 * Must be used inside a Router component
 */
const ReminderScheduler = ({ children }) => {
    // Run the scheduler
    useReminderScheduler(true);

    return children;
};

export default ReminderScheduler;
