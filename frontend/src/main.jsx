/**
 * Application Entry Point
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { UIProvider } from './context/UIContext';
import { SettingsProvider } from './context/SettingsContext';
import { GamificationProvider } from './context/GamificationContext';
import App from './App';
import './styles/index.css';

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <BrowserRouter>
            <UIProvider>
                <SettingsProvider>
                    <AuthProvider>
                        <GamificationProvider>
                            <App />
                        </GamificationProvider>
                    </AuthProvider>
                </SettingsProvider>
            </UIProvider>
        </BrowserRouter>
    </StrictMode>
);
