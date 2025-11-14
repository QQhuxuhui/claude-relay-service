function classifyAbortReason({ clientDisconnected, error }) {
  if (clientDisconnected) {
    return { reason: 'client', fallback: false }
  }

  const isTimeout = error?.code === 'ECONNABORTED' && error?.message?.includes('timeout')
  if (isTimeout) {
    return { reason: 'timeout', fallback: false }
  }

  return { reason: 'client', fallback: true }
}

module.exports = {
  classifyAbortReason
}
