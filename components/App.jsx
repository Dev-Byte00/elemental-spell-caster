'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ScreenFrame } from './ScreenFrame.jsx';
import { SetupScreen } from './SetupScreen.jsx';
import { GameScreen } from './GameScreen.jsx';
import {
  PauseOverlay,
  GameOverOverlay,
  VictoryOverlay,
  StageClearOverlay
} from './Overlays.jsx';

import { CONFIG } from '../game/config.jsx';
import { ASSETS } from '../game/assets.jsx';
import { AudioManager } from '../game/audio.jsx';
import { AIDetector } from '../game/ai.jsx';
import { GameState } from '../game/state.jsx';
import { WaveManager } from '../game/wave.jsx';
import { Renderer } from '../game/renderer.jsx';
import { GameLoop } from '../game/loop.jsx';

export function App() {
  const [screen, setScreen] = useState('setup'); // 'setup' | 'playing'
  const [activeOverlay, setActiveOverlay] = useState(null); // null | 'pause' | 'gameOver' | 'victory' | 'stageClear'
  const [overlayData, setOverlayData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [modelType, setModelType] = useState('pose');
  const [fps, setFps] = useState(60);

  // Core Game State and Engine Refs
  const gameStateRef = useRef(new GameState());
  const audioManagerRef = useRef(new AudioManager());
  const aiDetectorRef = useRef(null);
  const gameLoopRef = useRef(null);
  const rendererRef = useRef(null);
  const waveManagerRef = useRef(null);

  // DOM Refs in GameScreen
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const poseCanvasRef = useRef(null);

  // State snapshot for HUD re-renders
  const [uiState, setUiState] = useState({ ...gameStateRef.current });

  // Preload game static images
  useEffect(() => {
    ASSETS.loadAll().catch(e => console.warn("Asset preloader:", e));
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (screen !== 'playing') return;

      if (e.key === 'Escape') {
        e.preventDefault();
        togglePause();
        return;
      }

      // Keys 1 - 6 for manual spell casting (ONLY when cheatMode is enabled)
      const keyMap = {
        '1': 'Ice',
        '2': 'Fire',
        '3': 'Lightning',
        '4': 'Earth',
        '5': 'Water',
        '6': 'Wind'
      };

      const elem = keyMap[e.key];
      if (elem) {
        e.preventDefault();
        // If normal mode (cheatMode is false), silently ignore
        if (!gameStateRef.current.cheatMode) {
          return;
        }
        if (gameLoopRef.current) {
          gameLoopRef.current.castManualSpell(elem);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [screen, activeOverlay]);

  const togglePause = () => {
    if (screen !== 'playing') return;
    const s = gameStateRef.current;
    if (activeOverlay === 'pause') {
      s.paused = false;
      setActiveOverlay(null);
    } else if (!activeOverlay) {
      s.paused = true;
      setActiveOverlay('pause');
    }
  };

  const handleStartGame = async ({ modelUrl, modelType: chosenModelType, gameMode, cheatMode }) => {
    setIsLoading(true);
    setErrorMessage(null);
    setModelType(chosenModelType);

    // Audio unlock on user interaction
    audioManagerRef.current.init();

    const isMock = cheatMode || !modelUrl || modelUrl.toLowerCase().includes('cheat') || modelUrl.toLowerCase().includes('mock');

    try {
      const detector = new AIDetector(modelUrl, chosenModelType, isMock);
      aiDetectorRef.current = detector;

      await detector.init(null, null);

      // Reset state for new battle
      const s = gameStateRef.current;
      s.reset();
      s.mode = gameMode;
      s.cheatMode = isMock || cheatMode;
      s.availableElements = detector.availableElements;
      s.lockedElements = detector.lockedElements;
      s.screen = 'playing';

      setUiState({ ...s });
      setIsLoading(false);
      setScreen('playing');
      setActiveOverlay(null);

      // Initialize game loop after DOM mounts canvas
      setTimeout(() => {
        if (canvasRef.current) {
          rendererRef.current = new Renderer(canvasRef.current, s);
          waveManagerRef.current = new WaveManager(s);

          // Connect video/canvas to AI detector
          if (videoRef.current || poseCanvasRef.current) {
            detector.onGameScreenVisible(videoRef.current, poseCanvasRef.current);
          }

          gameLoopRef.current = new GameLoop({
            state: s,
            waveManager: waveManagerRef.current,
            renderer: rendererRef.current,
            audio: audioManagerRef.current,
            ai: detector,
            onStateUpdate: (updatedState) => {
              setUiState({ ...updatedState });
            },
            onFPSUpdate: (currentFps) => {
              setFps(currentFps);
            },
            onGameOver: (data) => {
              setOverlayData(data);
              setActiveOverlay('gameOver');
            },
            onVictory: (data) => {
              setOverlayData(data);
              setActiveOverlay('victory');
            },
            onStageClear: (nextStage) => {
              setOverlayData(nextStage);
              setActiveOverlay('stageClear');
            }
          });

          gameLoopRef.current.start();
        }
      }, 50);

    } catch (err) {
      console.error("Start Game Error:", err);
      setIsLoading(false);
      setErrorMessage(
        err.message || 'ไม่สามารถโหลดโมเดล AI ได้ — กรุณาตรวจสอบลิงก์ URL และการอนุญาตกล้อง/ไมค์'
      );
    }
  };

  const handleManualCast = (element) => {
    if (gameLoopRef.current) {
      gameLoopRef.current.castManualSpell(element);
    }
  };

  const handleResume = () => {
    const s = gameStateRef.current;
    s.paused = false;
    setActiveOverlay(null);
  };

  const handleRestart = () => {
    setActiveOverlay(null);
    const s = gameStateRef.current;
    s.reset();
    s.screen = 'playing';
    s.cheatMode = aiDetectorRef.current?.isMock || s.cheatMode;
    s.availableElements = aiDetectorRef.current?.availableElements || [...CONFIG.ELEMENTS];
    s.lockedElements = aiDetectorRef.current?.lockedElements || [];

    if (gameLoopRef.current) {
      gameLoopRef.current.stop();
      gameLoopRef.current.start();
    }
  };

  const handleQuitToMenu = () => {
    if (gameLoopRef.current) {
      gameLoopRef.current.stop();
      gameLoopRef.current = null;
    }
    if (aiDetectorRef.current) {
      aiDetectorRef.current.cleanup();
      aiDetectorRef.current = null;
    }
    gameStateRef.current.reset();
    setActiveOverlay(null);
    setScreen('setup');
  };

  const handleContinueStage = () => {
    setActiveOverlay(null);
    if (gameLoopRef.current) {
      gameLoopRef.current.resumeFromStageClear();
    }
  };

  return (
    <div className="relative w-full h-full min-h-screen overflow-hidden bg-dark-base">
      {/* Screen Frame Border */}
      <ScreenFrame />

      {/* Screen 1: Setup Screen */}
      {screen === 'setup' && (
        <SetupScreen
          onStartGame={handleStartGame}
          isLoading={isLoading}
          errorMessage={errorMessage}
        />
      )}

      {/* Screen 2: Game Screen */}
      {screen === 'playing' && (
        <GameScreen
          state={uiState}
          fps={fps}
          modelType={modelType}
          canvasRef={canvasRef}
          videoRef={videoRef}
          poseCanvasRef={poseCanvasRef}
          onPause={togglePause}
          onCastSpell={handleManualCast}
        />
      )}

      {/* Overlays */}
      {activeOverlay === 'pause' && (
        <PauseOverlay
          onResume={handleResume}
          onQuit={handleQuitToMenu}
        />
      )}

      {activeOverlay === 'gameOver' && overlayData && (
        <GameOverOverlay
          data={overlayData}
          onRestart={handleRestart}
          onQuit={handleQuitToMenu}
        />
      )}

      {activeOverlay === 'victory' && overlayData && (
        <VictoryOverlay
          data={overlayData}
          onPlayAgain={handleRestart}
          onQuit={handleQuitToMenu}
        />
      )}

      {activeOverlay === 'stageClear' && overlayData && (
        <StageClearOverlay
          nextStage={overlayData}
          onContinue={handleContinueStage}
        />
      )}
    </div>
  );
}
