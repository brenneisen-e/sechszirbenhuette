'use client';

import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Catches the specific "removeChild"/"insertBefore" DOM errors caused by
 * React 19's fiber reconciliation conflicting with Next.js client-side
 * navigation, and auto-recovers after a brief delay.
 *
 * See: https://medium.com/@fabrizio.azzarri/fixing-the-next-js-15-react-19-removechild-dom-error-a33b57cbc3b1
 */
export class DomErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State | null {
    if (
      error.name === 'NotFoundError' ||
      error.message?.includes('removeChild') ||
      error.message?.includes('insertBefore')
    ) {
      return { hasError: true };
    }
    // Let other errors bubble up
    throw error;
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn('[DomErrorBoundary] Caught DOM reconciliation error, auto-recovering...', error.message);
    // Auto-recover after a brief delay
    setTimeout(() => {
      this.setState({ hasError: false });
    }, 100);
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}
