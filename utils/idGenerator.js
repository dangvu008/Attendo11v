// Generate a random ID
export const generateId = () => {
  const timestamp = new Date().getTime().toString(36)
  const randomStr = Math.random().toString(36).substring(2, 8)
  return `${timestamp}${randomStr}`
}

