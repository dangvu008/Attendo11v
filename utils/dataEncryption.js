/**
 * Data Encryption Utilities
 *
 * This module provides functions for encrypting and decrypting sensitive data.
 * It uses a simple encryption method for demonstration purposes.
 * In a production app, you would use a more robust encryption library.
 */

import AsyncStorage from "@react-native-async-storage/async-storage"
import { generateId } from "./idGenerator"

// Encryption key storage
const ENCRYPTION_KEY_STORAGE = "encryption_key"

/**
 * Get or generate encryption key
 *
 * @returns {Promise<string>} - Encryption key
 */
const getEncryptionKey = async () => {
  try {
    // Try to get existing key
    let key = await AsyncStorage.getItem(ENCRYPTION_KEY_STORAGE)

    // If no key exists, generate a new one
    if (!key) {
      key = generateId() + generateId() + generateId()
      await AsyncStorage.setItem(ENCRYPTION_KEY_STORAGE, key)
    }

    return key
  } catch (error) {
    console.error("Error getting encryption key:", error)
    // Fallback to a default key (not secure, but better than nothing)
    return "attendo11_default_encryption_key"
  }
}

/**
 * Simple XOR encryption/decryption
 * Note: This is a simple implementation for demonstration.
 * In a real app, use a proper encryption library.
 *
 * @param {string} text - Text to encrypt/decrypt
 * @param {string} key - Encryption key
 * @returns {string} - Encrypted/decrypted text
 */
const xorCipher = (text, key) => {
  let result = ""

  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    result += String.fromCharCode(charCode)
  }

  return result
}

/**
 * Encrypt sensitive data
 *
 * @param {string} data - Data to encrypt
 * @returns {Promise<string>} - Encrypted data
 */
export const encryptData = async (data) => {
  try {
    if (!data) return ""

    const key = await getEncryptionKey()
    const encrypted = xorCipher(data, key)

    // Convert to base64 for safe storage
    return Buffer.from(encrypted, "utf8").toString("base64")
  } catch (error) {
    console.error("Error encrypting data:", error)
    return ""
  }
}

/**
 * Decrypt sensitive data
 *
 * @param {string} encryptedData - Encrypted data to decrypt
 * @returns {Promise<string>} - Decrypted data
 */
export const decryptData = async (encryptedData) => {
  try {
    if (!encryptedData) return ""

    // Convert from base64
    const data = Buffer.from(encryptedData, "base64").toString("utf8")

    const key = await getEncryptionKey()
    return xorCipher(data, key)
  } catch (error) {
    console.error("Error decrypting data:", error)
    return ""
  }
}

/**
 * Store sensitive data securely
 *
 * @param {string} key - Storage key
 * @param {string} value - Value to store
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
export const secureStore = async (key, value) => {
  try {
    if (!key || !value) return false

    const encryptedValue = await encryptData(value)
    await AsyncStorage.setItem(key, encryptedValue)
    return true
  } catch (error) {
    console.error("Error storing secure data:", error)
    return false
  }
}

/**
 * Retrieve sensitive data securely
 *
 * @param {string} key - Storage key
 * @returns {Promise<string|null>} - Retrieved value or null if not found
 */
export const secureRetrieve = async (key) => {
  try {
    if (!key) return null

    const encryptedValue = await AsyncStorage.getItem(key)
    if (!encryptedValue) return null

    return await decryptData(encryptedValue)
  } catch (error) {
    console.error("Error retrieving secure data:", error)
    return null
  }
}

