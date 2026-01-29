import React, { createContext, useContext, useState, useCallback } from 'react';

type BedtimeModeContextType = {
    isActive: boolean;
    controlsVisible: boolean;
    sleepTimer: number | null; // minutes: 15, 30, or 60
    sleepTimerRemaining: number | null; // seconds remaining
    wakeUpTime: Date | null;
    dimmingLevel: number; // 0.0 to 1.0 (additional overlay opacity)
    smartLoopPhase: 'entry' | 'transition' | 'deep' | 'wakeup';
    startSmartLoop: () => void;
    setSmartLoopPhase: (phase: 'entry' | 'transition' | 'deep' | 'wakeup') => void;
    activateBedtimeMode: () => void;
    deactivateBedtimeMode: () => void;
    showControls: () => void;
    hideControls: () => void;
    setSleepTimer: (minutes: number | null) => void;
    setWakeUpTime: (time: Date | null) => void;
    updateTimerRemaining: (seconds: number) => void;
};

const BedtimeModeContext = createContext<BedtimeModeContextType | undefined>(undefined);

export function BedtimeModeProvider({ children }: { children: React.ReactNode }) {
    const [isActive, setIsActive] = useState(false);
    const [controlsVisible, setControlsVisible] = useState(false);
    const [sleepTimer, setSleepTimerState] = useState<number | null>(null);
    const [sleepTimerRemaining, setSleepTimerRemaining] = useState<number | null>(null);
    const [wakeUpTime, setWakeUpTime] = useState<Date | null>(null);
    const [dimmingLevel, setDimmingLevel] = useState(0);
    const [smartLoopPhase, setSmartLoopPhase] = useState<'entry' | 'transition' | 'deep' | 'wakeup'>('entry');

    const activateBedtimeMode = useCallback(() => {
        setIsActive(true);
        setSmartLoopPhase('entry');
        setDimmingLevel(0);
    }, []);

    const deactivateBedtimeMode = useCallback(() => {
        setIsActive(false);
        setControlsVisible(false);
        setSleepTimerState(null);
        setSleepTimerRemaining(null);
        setWakeUpTime(null);
        setSmartLoopPhase('entry');
        setDimmingLevel(0);
    }, []);

    const showControls = useCallback(() => {
        setControlsVisible(true);
    }, []);

    const hideControls = useCallback(() => {
        setControlsVisible(false);
    }, []);

    const setSleepTimer = useCallback((minutes: number | null) => {
        setSleepTimerState(minutes);
        if (minutes !== null) {
            setSleepTimerRemaining(minutes * 60);
        } else {
            setSleepTimerRemaining(null);
        }
    }, []);

    const updateTimerRemaining = useCallback((seconds: number) => {
        setSleepTimerRemaining(seconds);
    }, []);

    const startSmartLoop = useCallback(() => {
        // Logic to transition phases could be handled here or in a separate hook/effect inside the provider
        // For now, we just expose the setter indirectly or rely on the logic in Sleep.tsx to drive it via a new function if needed
        // Actually, let's expose setSmartLoopPhase if we need fine grained control, or just use this for the initial trigger
    }, []);

    // Effect to handle Adaptive Dimming (Sunset)
    React.useEffect(() => {
        if (!isActive) return;

        // Start fading in the dimming overlay over 15 minutes (900 seconds)
        // We update dimmingLevel from 0 to 0.8 (simulating very dark)
        let startTime = Date.now();
        const duration = 15 * 60 * 1000; // 15 mins

        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            setDimmingLevel(progress * 0.8); // Cap at 80% extra darkness

            if (progress >= 1) clearInterval(interval);
        }, 1000);

        return () => clearInterval(interval);
    }, [isActive]);

    return (
        <BedtimeModeContext.Provider
            value={{
                isActive,
                controlsVisible,
                sleepTimer,
                sleepTimerRemaining,
                wakeUpTime,
                dimmingLevel,
                smartLoopPhase,
                startSmartLoop,
                setSmartLoopPhase,
                activateBedtimeMode,
                deactivateBedtimeMode,
                showControls,
                hideControls,
                setSleepTimer,
                setWakeUpTime,
                updateTimerRemaining,
            }}
        >
            {children}
        </BedtimeModeContext.Provider>
    );
}

export function useBedtimeMode() {
    const context = useContext(BedtimeModeContext);
    if (!context) {
        throw new Error('useBedtimeMode must be used within BedtimeModeProvider');
    }
    return context;
}
