export const PORT: number = (() => {
  const { PORT } = process.env
  if (!PORT) {
    throw new Error('PORT is not set')
  }
  if (isNaN(parseInt(PORT, 10))) {
    throw new Error('PORT is not a valid number')
  }
  return parseInt(PORT, 10)
})()
