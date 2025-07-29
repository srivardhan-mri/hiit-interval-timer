
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { TimerStatus, IntervalType } from './types';
import { audioService } from './services/audioService';

// --- HELPER COMPONENTS ---

interface InputFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled: boolean;
}

const InputField: React.FC<InputFieldProps> = ({ label, value, onChange, disabled }) => (
  <div className="flex flex-col items-center gap-2">
    <label htmlFor={label} className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
      {label}
    </label>
    <input
      id={label}
      type="number"
      value={value}
      onChange={(e) => onChange(Math.max(1, parseInt(e.target.value, 10) || 1))}
      disabled={disabled}
      className="w-24 p-2 text-center bg-gray-700/50 border border-gray-600 rounded-md text-white text-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
    />
  </div>
);

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
};

const formatTimeOfDay = (date: Date | null): string => {
    if (!date) return '--:--:--';
    return date.toLocaleTimeString('en-US');
};


// --- MAIN APP COMPONENT ---

export default function App() {
  const [moveTime, setMoveTime] = useState(30);
  const [restTime, setRestTime] = useState(15);
  const [repetitions, setRepetitions] = useState(8);

  const [status, setStatus] = useState<TimerStatus>(TimerStatus.Ready);
  const [intervalType, setIntervalType] = useState<IntervalType>(IntervalType.Move);
  const [currentRep, setCurrentRep] = useState(1);
  const [timeLeft, setTimeLeft] = useState(moveTime);
  
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [timeElapsed, setTimeElapsed] = useState(0);

  const isRunning = status === TimerStatus.Running;
  const isIdle = status === TimerStatus.Ready || status === TimerStatus.Done;

  // Track previous status to detect state transitions
  const prevStatusRef = useRef<TimerStatus | undefined>(undefined);
  useEffect(() => {
    prevStatusRef.current = status;
  });
  const prevStatus = prevStatusRef.current;

  const totalWorkoutTime = useMemo(() => {
    if (repetitions <= 0) return 0;
    return moveTime * repetitions + restTime * (repetitions - 1);
  }, [moveTime, restTime, repetitions]);

  const remainingWorkoutTime = useMemo(() => {
    if (isIdle) return totalWorkoutTime;
    return Math.max(0, totalWorkoutTime - timeElapsed);
  }, [isIdle, totalWorkoutTime, timeElapsed]);

  // Effect to update timeLeft when settings change while timer is ready
  useEffect(() => {
    if (status === TimerStatus.Ready) {
      setTimeLeft(moveTime);
    }
  }, [moveTime, status]);
  
  // Effect for the live clock
  useEffect(() => {
    const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(clockInterval);
  }, []);

  // Effect for the main workout timer logic
  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const timer = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
      setTimeLeft(prev => {
        const newTimeLeft = prev - 1;
        if (newTimeLeft > 0 && newTimeLeft <= 3) {
            audioService.playCountdownBeep();
        }
        
        if (newTimeLeft === 0) {
          if (intervalType === IntervalType.Move) {
            if (currentRep === repetitions) {
              setStatus(TimerStatus.Done);
              audioService.playFinishedSound();
              return 0;
            }
            setIntervalType(IntervalType.Rest);
            audioService.playRestSound();
            return restTime;
          } else { // IntervalType.Rest
            setCurrentRep(rep => rep + 1);
            setIntervalType(IntervalType.Move);
            audioService.playMoveSound();
            return moveTime;
          }
        }
        return newTimeLeft;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning, currentRep, repetitions, intervalType, moveTime, restTime, setStatus, setIntervalType]);

  const handleReset = useCallback(() => {
    setStatus(TimerStatus.Ready);
    setIntervalType(IntervalType.Move);
    setCurrentRep(1);
    setTimeLeft(moveTime);
    setTimeElapsed(0);
  }, [moveTime]);

  // Effect to handle side-effects of starting a workout
  useEffect(() => {
    if (status === TimerStatus.Running && (prevStatus === TimerStatus.Ready || prevStatus === TimerStatus.Done)) {
      setTimeElapsed(0); // Reset elapsed time at the beginning of a run

      if (prevStatus === TimerStatus.Ready) {
        audioService.playMoveSound();
      }
    }
  }, [status]);


  const handleStartPause = useCallback(async () => {
    await audioService.startAudioContext();

    if (status === TimerStatus.Running) {
      setStatus(TimerStatus.Paused);
    } else { // Paused, Ready, or Done
      if (status === TimerStatus.Done) {
        handleReset(); // Reset first, the effect will handle the rest
      }
      setStatus(TimerStatus.Running);
    }
  }, [status, handleReset]);

  const backgroundClass = useMemo(() => {
    if (status === TimerStatus.Running) {
      return intervalType === IntervalType.Move 
        ? 'bg-emerald-900/60' 
        : 'bg-sky-900/60';
    }
    return 'bg-gray-900';
  }, [status, intervalType]);

  const statusText = useMemo(() => {
    if (status === TimerStatus.Done) return "DONE!";
    if (status === TimerStatus.Ready) return "READY";
    if (status === TimerStatus.Paused) return "PAUSED";
    return intervalType === IntervalType.Move ? "MOVE" : "REST";
  }, [status, intervalType]);


  return (
    <main className={`flex flex-col items-center justify-center min-h-screen w-full font-sans text-white transition-all duration-500 ${backgroundClass} p-4`}>
      <div className="w-full max-w-md md:max-w-4xl lg:max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-200 text-center mb-6">HIIT Interval Timer</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
          
          {/* --- LEFT/TOP COLUMN (TIMER & CONTROLS) --- */}
          <div className="flex flex-col items-center justify-center space-y-6">
            {/* --- TIMER DISPLAY --- */}
            <div className="relative flex items-center justify-center w-64 h-64 sm:w-72 sm:h-72 lg:w-80 lg:h-80 rounded-full border-8 border-gray-700/50">
              <div className="absolute flex flex-col items-center text-center">
                <span className="text-5xl sm:text-6xl font-bold tracking-widest text-teal-300 uppercase">
                  {statusText}
                </span>
                <span className="text-7xl sm:text-8xl font-mono font-bold text-white">
                  {timeLeft}
                </span>
                {status !== TimerStatus.Ready && (
                  <span className="text-2xl font-semibold text-gray-400">
                    Rep {currentRep} / {repetitions}
                  </span>
                )}
              </div>
            </div>

            {/* --- CONTROLS --- */}
            <div className="w-full max-w-xs flex flex-col space-y-4">
                <button
                  onClick={handleStartPause}
                  className={`w-full p-4 rounded-lg text-2xl font-bold uppercase tracking-wider transition-colors duration-200 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-offset-gray-900 
                    ${status === TimerStatus.Running ? 'bg-yellow-500 hover:bg-yellow-600 text-black focus:ring-yellow-400' : 'bg-green-500 hover:bg-green-600 text-white focus:ring-green-400'}
                    ${status === TimerStatus.Done ? 'bg-blue-500 hover:bg-blue-600 text-white focus:ring-blue-400' : ''}`}
                >
                  {status === TimerStatus.Running ? "Pause" : status === TimerStatus.Paused ? "Resume" : status === TimerStatus.Done ? "New Workout" : "Start"}
                </button>
                <button
                    onClick={handleReset}
                    disabled={isIdle}
                    className="w-full p-3 rounded-lg text-lg font-semibold bg-gray-600 hover:bg-gray-700 text-gray-300 transition-colors duration-200 disabled:bg-gray-700/50 disabled:text-gray-500 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                >
                    Reset
                </button>
            </div>
          </div>

          {/* --- RIGHT/BOTTOM COLUMN (SETTINGS & STATS) --- */}
          <div className="flex flex-col space-y-6">
            {/* --- INPUTS --- */}
            <div className="w-full p-4 bg-gray-800/50 rounded-lg">
                <div className="flex justify-around">
                    <InputField label="Move" value={moveTime} onChange={setMoveTime} disabled={!isIdle} />
                    <InputField label="Rest" value={restTime} onChange={setRestTime} disabled={!isIdle} />
                    <InputField label="Reps" value={repetitions} onChange={setRepetitions} disabled={!isIdle} />
                </div>
            </div>

            {/* --- TIME STATS --- */}
            <div className="w-full text-center p-4 bg-gray-800/50 rounded-lg space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <div className="text-gray-400 text-right">Current Time</div>
                <div className="text-white font-mono text-left">{formatTimeOfDay(currentTime)}</div>

                <div className="text-gray-400 text-right">Time Remaining</div>
                <div className="text-white font-mono text-left">{formatTime(remainingWorkoutTime)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
