import React from 'react';
import ErrorState from './ErrorState.jsx';

export default class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() { return { hasError: true }; }

  render() {
    if (this.state.hasError) return <ErrorState message="The page could not be displayed. Refresh and try again." onRetry={() => window.location.reload()} />;
    return this.props.children;
  }
}
