
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { TimerStatus, IntervalType } from './types';
import { audioService } from './services/audioService';

// --- HELPER COMPONENTS (defined outside the main App component) ---

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

// --- MAIN APP COMPONENT ---

export default function App() {
  const [moveTime, setMoveTime] = useState(150);
  const [restTime, setRestTime] = useState(60);
  const [repetitions, setRepetitions] = useState(15);

  const [status, setStatus] = useState<TimerStatus>(TimerStatus.Ready);
  const [intervalType, setIntervalType] = useState<IntervalType>(IntervalType.Move);
  const [currentRep, setCurrentRep] = useState(1);
  const [timeLeft, setTimeLeft] = useState(moveTime);
  
  const isRunning = status === TimerStatus.Running;
  const isIdle = status === TimerStatus.Ready || status === TimerStatus.Done;

  const totalWorkoutTime = useMemo(() => {
    if (repetitions <= 0) return 0;
    return moveTime * repetitions + restTime * (repetitions - 1);
  }, [moveTime, restTime, repetitions]);

  useEffect(() => {
    if (status === TimerStatus.Ready) {
      setTimeLeft(moveTime);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moveTime]);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const timer = setInterval(() => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, currentRep, repetitions, intervalType, moveTime, restTime]);

  const handleStartPause = useCallback(async () => {
    await audioService.startAudioContext();

    if (status === TimerStatus.Running) {
      setStatus(TimerStatus.Paused);
    } else if (status === TimerStatus.Ready){
      setStatus(TimerStatus.Running);
      audioService.playMoveSound();
    } else { // Paused or Done
      if(status === TimerStatus.Done) handleReset();
      setStatus(TimerStatus.Running);
    }
  }, [status]);

  const handleReset = useCallback(() => {
    setStatus(TimerStatus.Ready);
    setIntervalType(IntervalType.Move);
    setCurrentRep(1);
    setTimeLeft(moveTime);
  }, [moveTime]);

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
      <div className="w-full max-w-sm flex flex-col items-center text-center space-y-6">
        <h1 className="text-3xl font-bold text-gray-200">HIIT Interval Timer</h1>

        {/* --- INPUTS --- */}
        <div className="flex justify-around w-full p-4 bg-gray-800/50 rounded-lg">
          <InputField label="Move" value={moveTime} onChange={setMoveTime} disabled={!isIdle} />
          <InputField label="Rest" value={restTime} onChange={setRestTime} disabled={!isIdle} />
          <InputField label="Reps" value={repetitions} onChange={setRepetitions} disabled={!isIdle} />
        </div>

        {/* --- TIMER DISPLAY --- */}
        <div className="relative flex items-center justify-center w-64 h-64 sm:w-72 sm:h-72 rounded-full border-8 border-gray-700/50">
          <div className="absolute flex flex-col">
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
        <div className="w-full flex flex-col space-y-4">
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

        {/* --- TOTAL TIME --- */}
        <div className="text-gray-400 font-semibold">
          Total Workout Time: <span className="text-white">{formatTime(totalWorkoutTime)}</span>
        </div>
      </div>
    </main>
  );
}
