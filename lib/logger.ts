type LogPayload = {
  message: string;
  [key: string]: unknown;
};

const writeLog = (level: 'info' | 'error', payload: LogPayload): void => {
  const entry = {
    level,
    ...payload,
  };

  if (level === 'error') {
    console.error(entry);
    return;
  }

  console.info(entry);
};

export const logger = {
  info: (payload: LogPayload): void => writeLog('info', payload),
  error: (payload: LogPayload): void => writeLog('error', payload),
};

