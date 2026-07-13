import { useEffect, useState } from "react";

export function useTelegram() {
  const [tgUser, setTgUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const WebApp = window.Telegram?.WebApp;

    if (!WebApp) {
      console.error("Telegram WebApp SDK not found");

      // Development fallback
      setTgUser({
        id: 123456789,
        first_name: "Test",
        last_name: "User",
        username: "testuser",
      });

      setReady(true);
      return;
    }

    // Initialize Telegram Mini App
    WebApp.ready();
    WebApp.expand();

    // Theme
    try {
      WebApp.setHeaderColor("#0E1912");
      WebApp.setBackgroundColor("#0E1912");
    } catch (e) {
      console.warn("Unable to set Telegram colors:", e);
    }

    console.log("Telegram User:", WebApp.initDataUnsafe?.user);

    setTgUser(WebApp.initDataUnsafe?.user || null);

    setReady(true);
  }, []);

  const WebApp = window.Telegram?.WebApp;

  const haptic = (style = "light") => {
    WebApp?.HapticFeedback?.impactOccurred(style);
  };

  const close = () => {
    WebApp?.close();
  };

  const showAlert = (message) => {
    WebApp?.showAlert(message);
  };

  const showConfirm = (message, callback) => {
    WebApp?.showConfirm(message, callback);
  };

  return {
    tgUser,
    ready,
    haptic,
    close,
    showAlert,
    showConfirm,
    WebApp,
  };
}

/*
import { useEffect, useState } from 'react';
import * as Twa from "@twa-dev/sdk";

const WebApp = Twa.default;

console.log("WebApp =", WebApp);
console.log("Keys =", Object.keys(WebApp));

// ─────────────────────────────────────────────
// useTelegram — exposes Telegram Web App data
// and utility functions throughout the app
// ─────────────────────────────────────────────
export function useTelegram() {
  const [tgUser, setTgUser] = useState(null);
  const [ready, setReady]   = useState(false);

  useEffect(() => {
    // Tell Telegram the app is ready (removes loading screen)
    WebApp.ready();
    WebApp.expand(); // expand to full screen

    // Set Telegram colour theme
    WebApp.setHeaderColor('#0E1912');
    WebApp.setBackgroundColor('#0E1912');

    const user = WebApp.initDataUnsafe?.user;
    if (user) {
      setTgUser(user);
    } else {
      // Fallback for testing outside Telegram
      setTgUser({
        id:         123456789,
        first_name: 'Test',
        last_name:  'User',
        username:   'testuser',
      });
    }
    setReady(true);
  }, []);

  const haptic = (style = 'light') => {
    WebApp.HapticFeedback?.impactOccurred(style);
  };

  const close = () => WebApp.close();

  const showAlert = (msg) => WebApp.showAlert(msg);

  const showConfirm = (msg, cb) => WebApp.showConfirm(msg, cb);

  return { tgUser, ready, haptic, close, showAlert, showConfirm, WebApp };
}*/