"use client";

import { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const DatabaseContext = createContext();

export function DatabaseProvider({ children }) {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        // Kiểm tra và khởi tạo cấu trúc database nếu cần
        const dbVersion = await AsyncStorage.getItem("attendo_db_version");
        if (!dbVersion) {
          // Khởi tạo các key cần thiết
          await AsyncStorage.multiSet([
            ["attendo_db_version", "1.0"],
            ["attendo_user_settings", JSON.stringify({})],
            ["attendo_work_logs", JSON.stringify([])],
            ["attendo_notes", JSON.stringify([])],
            [
              "attendo_weather_settings",
              JSON.stringify({
                enabled: true,
                alertRain: true,
                alertCold: true,
                alertHeat: true,
                alertStorm: true,
                soundEnabled: true,
              }),
            ],
          ]);
        }
        setIsInitialized(true);
      } catch (error) {
        console.error("Failed to initialize database:", error);
      }
    };

    initializeDatabase();
  }, []);

  const clearDatabase = async () => {
    try {
      await AsyncStorage.clear();
      setIsInitialized(false);
    } catch (error) {
      console.error("Failed to clear database:", error);
    }
  };

  return (
    <DatabaseContext.Provider value={{ isInitialized, clearDatabase }}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase() {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error("useDatabase must be used within a DatabaseProvider");
  }
  return context;
}
