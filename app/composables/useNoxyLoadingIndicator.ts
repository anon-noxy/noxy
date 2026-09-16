export const useNoxyLoadingIndicator = () => {
  const indicator = useLoadingIndicator({
    duration: 3000,
    throttle: 120,
    estimatedProgress: (duration, elapsed) => {
      const completion = elapsed / duration

      return (2 / Math.PI) * 100 * Math.atan((completion * 100) / 50)
    },
  })

  const runWithLoading = async <T>(callback: () => Promise<T>) => {
    indicator.start()

    try {
      return await callback()
    } finally {
      indicator.finish()
    }
  }

  return {
    ...indicator,
    runWithLoading,
  }
}
