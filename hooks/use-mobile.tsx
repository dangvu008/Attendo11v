"use client"

import { useState, useEffect } from "react"
import { Dimensions } from "react-native"

export function useMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const { width } = Dimensions.get("window")
    setIsMobile(width < 768)

    const handleResize = () => {
      const { width } = Dimensions.get("window")
      setIsMobile(width < 768)
    }

    Dimensions.addEventListener("change", handleResize)

    return () => {
      // Clean up event listener
      // Note: In newer versions of React Native, this might not be necessary
    }
  }, [])

  return isMobile
}

export default useMobile

