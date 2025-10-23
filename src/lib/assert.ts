export const ok = (condition: unknown, message: string) => {
  if (!condition) {
    throw new Error(message)
  }
}
