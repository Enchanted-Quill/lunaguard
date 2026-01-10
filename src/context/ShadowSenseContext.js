// context/ShadowSenseContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import {
  startShadowSense,
  stopShadowSense,
  getCurrentRiskScore,
  startBackgroundTracking,
  stopBackgroundTracking
} from '../utils/shadowSense';

const ShadowSenseContext = createContext();

export const ShadowSenseProvider = ({ children }) => {
  const [isActive, setIsActive] = useState(false);
  const [riskScore, setRiskScore] = useState(0);
  const [riskLevel, setRiskLevel] = useState('SAFE');

  // Update risk score every 3 seconds when active
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      const { score, level } = getCurrentRiskScore();
      setRiskScore(score);
      setRiskLevel(level);
    }, 3000);

    return () => clearInterval(interval);
  }, [isActive]);

  const activateShadowSense = async () => {
    try {
      await startShadowSense();
      await startBackgroundTracking();
      setIsActive(true);
      return true;
    } catch (error) {
      console.error('Failed to activate ShadowSense:', error);
      return false;
    }
  };

  const deactivateShadowSense = async () => {
    try {
      stopShadowSense();
      await stopBackgroundTracking();
      setIsActive(false);
      setRiskScore(0);
      setRiskLevel('SAFE');
      return true;
    } catch (error) {
      console.error('Failed to deactivate ShadowSense:', error);
      return false;
    }
  };

  const value = {
    isActive,
    riskScore,
    riskLevel,
    activateShadowSense,
    deactivateShadowSense,
  };

  return (
    <ShadowSenseContext.Provider value={value}>
      {children}
    </ShadowSenseContext.Provider>
  );
};

export const useShadowSense = () => {
  const context = useContext(ShadowSenseContext);
  if (!context) {
    throw new Error('useShadowSense must be used within a ShadowSenseProvider');
  }
  return context;
};