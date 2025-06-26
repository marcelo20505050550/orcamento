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

// Configuração de transports baseada no ambiente
const getTransports = () => {
  const logTransports: winston.transport[] = [
    // Console sempre ativo para permitir visualização dos logs no Vercel
    new transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
      ),
    })
  ];

  // Em desenvolvimento local, adiciona arquivos de log
  // No Vercel (produção), não adiciona file transports pois o sistema de arquivos é readonly
  if (process.env.NODE_ENV !== 'production' || process.env.VERCEL !== '1') {
    try {
      logTransports.push(
        new transports.File({ filename: 'logs/error.log', level: 'error' }),
        new transports.File({ filename: 'logs/combined.log' })
      );
    } catch (error) {
      // Se não conseguir criar os arquivos, continua apenas com console
      console.warn('Não foi possível criar arquivos de log, usando apenas console:', error);
    }
  }

  return logTransports;
};

// Cria a instância do logger com configurações personalizadas
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  transports: getTransports(),
});

// Funções para registro de diferentes níveis de log
export const logDebug = (message: string, meta?: any) => {
  try {
    logger.debug(meta ? `${message} ${JSON.stringify(meta)}` : message);
  } catch (error) {
    console.debug(message, meta);
  }
};

export const logInfo = (message: string, meta?: any) => {
  try {
    logger.info(meta ? `${message} ${JSON.stringify(meta)}` : message);
  } catch (error) {
    console.info(message, meta);
  }
};

export const logWarn = (message: string, meta?: any) => {
  try {
    logger.warn(meta ? `${message} ${JSON.stringify(meta)}` : message);
  } catch (error) {
    console.warn(message, meta);
  }
};

export const logError = (message: string, error?: any) => {
  try {
    if (error instanceof Error) {
      logger.error(`${message}: ${error.message}`, { stack: error.stack });
    } else if (error) {
      logger.error(`${message}: ${JSON.stringify(error)}`);
    } else {
      logger.error(message);
    }
  } catch (loggerError) {
    // Fallback para console se o logger falhar
    console.error(message, error);
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
    logInfo(`[Performance] ${operationName} concluído em ${endTime - startTime}ms`);
    return result;
  } catch (error) {
    const endTime = Date.now();
    logError(
      `[Performance] ${operationName} falhou após ${endTime - startTime}ms`,
      error
    );
    throw error;
  }
};

// Exporta o logger para casos mais específicos
export default logger; 