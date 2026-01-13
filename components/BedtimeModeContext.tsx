import React, { createContext, useContext, useState, useCallback } from 'react';

type BedtimeModeContextType = {
    isActive: boolean;
    controlsVisible: boolean;
    sleepTimer: number | null; // minutes: 15, 30, or 60
    sleepTimerRemaining: number | null; // seconds remaining
    activateBedtimeMode: () => void;
    deactivateBedtimeMode: () => void;
    showControls: () => void;
    hideControls: () => void;
    setSleepTimer: (minutes: number | null) => void;
    updateTimerRemaining: (seconds: number) => void;
};

const BedtimeModeContext = createContext<BedtimeModeContextType | undefined>(undefined);

export function BedtimeModeProvider({ children }: { children: React.ReactNode }) {
    const [isActive, setIsActive] = useState(false);
    const [controlsVisible, setControlsVisible] = useState(false);
    const [sleepTimer, setSleepTimerState] = useState<number | null>(null);
    const [sleepTimerRemaining, setSleepTimerRemaining] = useState<number | null>(null);

    const activateBedtimeMode = useCallback(() => {
        setIsActive(true);
    }, []);

    const deactivateBedtimeMode = useCallback(() => {
        setIsActive(false);
        setControlsVisible(false);
        setSleepTimerState(null);
        setSleepTimerRemaining(null);
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

    return (
        <BedtimeModeContext.Provider
            value={{
                isActive,
                controlsVisible,
                sleepTimer,
                sleepTimerRemaining,
                activateBedtimeMode,
                deactivateBedtimeMode,
                showControls,
                hideControls,
                setSleepTimer,
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
