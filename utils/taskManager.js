/**
 * Task Manager Utilities
 *
 * This module provides functions for safely managing background tasks in the Attendo app.
 * It handles task registration and unregistration with proper error handling.
 */

import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";

/**
 * Safely unregister a background task
 *
 * This function attempts to unregister a task and handles the case where the task
 * doesn't exist, preventing unhandled promise rejections.
 *
 * @param {string} taskName - The name of the task to unregister
 * @returns {Promise<boolean>} - True if successful or if task didn't exist
 */
export const safelyUnregisterTask = async (taskName) => {
  try {
    // First check if the task is registered
    const isRegistered = await TaskManager.isTaskRegisteredAsync(taskName);

    // Only attempt to unregister if it's actually registered
    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(taskName);
      console.log(`Successfully unregistered task: ${taskName}`);
      return true;
    } else {
      console.log(`Task ${taskName} not registered, no need to unregister`);
      return true;
    }
  } catch (error) {
    // Log the error but don't throw it further
    console.error(`Error safely unregistering task ${taskName}:`, error);
    return false;
  }
};

/**
 * Check if a task is registered
 *
 * @param {string} taskName - The name of the task to check
 * @returns {Promise<boolean>} - True if the task is registered
 */
export const isTaskRegistered = async (taskName) => {
  try {
    return await TaskManager.isTaskRegisteredAsync(taskName);
  } catch (error) {
    console.error(`Error checking if task ${taskName} is registered:`, error);
    return false;
  }
};
