"use client"

import { createContext, useState, useContext, useEffect } from "react"
import { format } from "date-fns"
import { getShifts } from "../utils/database"

// Create context
const ShiftContext = createContext()

// Shift provider component
export function ShiftProvider({ children }) {
  const [shifts, setShifts] = useState([])
  const [currentShift, setCurrentShift] = useState(null)
  const [loading, setLoading] = useState(true)

  // Load shifts
  useEffect(() => {
    loadShifts()
  }, [])

  const loadShifts = async () => {
    try {
      setLoading(true)
      const savedShifts = await getShifts()
      setShifts(savedShifts)

      // Find current shift for today
      const today = new Date()
      const dayOfWeek = format(today, "EEE")

      const todayShift = savedShifts.find((shift) => shift.days && shift.days.includes(dayOfWeek))

      setCurrentShift(todayShift || null)
    } catch (error) {
      console.error("Failed to load shifts:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ShiftContext.Provider
      value={{
        shifts,
        currentShift,
        loading,
        refreshShifts: loadShifts,
      }}
    >
      {children}
    </ShiftContext.Provider>
  )
}

// Custom hook for using shifts
export function useShift() {
  const context = useContext(ShiftContext)
  if (!context) {
    throw new Error("useShift must be used within a ShiftProvider")
  }
  return context
}

