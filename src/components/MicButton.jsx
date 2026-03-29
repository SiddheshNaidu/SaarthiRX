import { triggerHaptic } from '../utils/haptics';

const MicButton = ({ onClick, isListening }) => {
    const handleClick = () => {
        triggerHaptic();
        onClick();
    };

    return (
        <button
            onClick={handleClick}
            className={`
        w-xl-touch h-xl-touch rounded-full
        flex items-center justify-center
        shadow-2xl transform transition-all duration-300
        ${isListening
                    ? 'bg-primary animate-pulse scale-110'
                    : 'bg-gray-600 hover:bg-gray-700 hover:scale-105'
                }
      `}
            aria-label={isListening ? 'Stop listening' : 'Start voice input'}
        >
            <svg
                className="w-20 h-20 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
            >
                {isListening ? (
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                ) : (
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1 1.93c-3.94-.49-7-3.85-7-7.93h2c0 3.31 2.69 6 6 6s6-2.69 6-6h2c0 4.08-3.05 7.44-7 7.93V19h4v2H8v-2h4v-3.07z" />
                )}
            </svg>

            
        </button>
    );
};

export default MicButton;
