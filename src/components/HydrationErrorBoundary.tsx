'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Este componente captura erros de hidratação e impede que eles 
 * interrompam a renderização da aplicação. Após a primeira renderização,
 * os erros de hidratação geralmente desaparecem.
 */
class HydrationErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Verificamos se é um erro de hidratação e logamos apenas para desenvolvimento
    if (error.message.includes('Hydration failed')) {
      console.log('Erro de hidratação capturado e suprimido. Isso geralmente é causado por extensões do navegador.');
    } else {
      console.error('Erro capturado no ErrorBoundary:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      // Forçamos uma nova renderização quando ocorre um erro de hidratação
      setTimeout(() => {
        this.setState({ hasError: false });
      }, 0);
      
      // Retornamos um elemento vazio durante a nova renderização
      return <div suppressHydrationWarning>{this.props.children}</div>;
    }

    return <div suppressHydrationWarning>{this.props.children}</div>;
  }
}

export default HydrationErrorBoundary; 