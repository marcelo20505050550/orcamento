/**
 * Sistema de logs para a aplicação usando Winston
 * Permite registrar eventos, erros e ações no sistema para monitoramento e depuração
 */
import winston from 'winston';

// Configuração personalizada para formatação de logs
const { format, transports } = winston;
const { combine, timestamp, printf, colorize } = format;

// Formata o log no padrão: [timestamp] nível: mensagem
const logFormat = printf(({ level, message, timestamp }) => {
  return `[${timestamp}] ${level}: ${message}`;
});

// Cria a instância do logger com configurações personalizadas
// No Vercel, usamos apenas console pois o sistema de arquivos é somente leitura
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  transports: [
    // Logs no console (funciona tanto em desenvolvimento quanto em produção/Vercel)
    new transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
      ),
    }),
    // Logs em arquivo apenas para desenvolvimento local
    // No Vercel (produção), não tentamos escrever arquivos pois o FS é read-only
    ...(process.env.NODE_ENV === 'production' && !process.env.VERCEL
      ? [
          new transports.File({ filename: 'logs/error.log', level: 'error' }),
          new transports.File({ filename: 'logs/combined.log' }),
        ]
      : []),
  ],
});

// Funções para registro de diferentes níveis de log
export const logDebug = (message: string, meta?: any) => {
  logger.debug(meta ? `${message} ${JSON.stringify(meta)}` : message);
};

export const logInfo = (message: string, meta?: any) => {
  logger.info(meta ? `${message} ${JSON.stringify(meta)}` : message);
};

export const logWarn = (message: string, meta?: any) => {
  logger.warn(meta ? `${message} ${JSON.stringify(meta)}` : message);
};

export const logError = (message: string, error?: any) => {
  if (error instanceof Error) {
    logger.error(`${message}: ${error.message}`, { stack: error.stack });
  } else if (error) {
    logger.error(`${message}: ${JSON.stringify(error)}`);
  } else {
    logger.error(message);
  }
};

// Wrapper para monitorar o tempo de execução de funções
export const logPerformance = async <T>(
  operationName: string,
  operation: () => Promise<T>
): Promise<T> => {
  const startTime = Date.now();
  try {
    const result = await operation();
    const endTime = Date.now();
    logger.info(`[Performance] ${operationName} concluído em ${endTime - startTime}ms`);
    return result;
  } catch (error) {
    const endTime = Date.now();
    logger.error(
      `[Performance] ${operationName} falhou após ${endTime - startTime}ms`,
      { error }
    );
    throw error;
  }
};

// Exporta o logger para casos mais específicos
export default logger; 