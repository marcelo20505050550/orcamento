import React from 'react';

/**
 * Componente que suprime avisos de hidratação para seus filhos
 * Útil para evitar erros quando extensões de navegador modificam o DOM
 */
export function HydrationSuppressor({ 
  children,
  className = ""
}: { 
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className} suppressHydrationWarning>
      {children}
    </div>
  );
}

/**
 * Versão específica para envolver elementos flex
 */
export function FlexHydrationSuppressor({
  children,
  className = ""
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex ${className}`} suppressHydrationWarning>
      {children}
    </div>
  );
}

/**
 * Versão específica para envolver contêineres principais com espaçamento
 */
export function SpaceYHydrationSuppressor({
  children,
  className = "",
  spacing = 6
}: {
  children: React.ReactNode;
  className?: string;
  spacing?: number;
}) {
  return (
    <div className={`space-y-${spacing} ${className}`} suppressHydrationWarning>
      {children}
    </div>
  );
}

export default HydrationSuppressor; 