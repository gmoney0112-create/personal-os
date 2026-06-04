import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center text-white">
          <div className="text-center border border-red-900 rounded-lg p-10 max-w-md">
            <h2 className="text-xl font-bold text-red-500 mb-3 uppercase tracking-widest">System Failure</h2>
            <p className="text-gray-500 text-sm mb-6">{this.state.error.message}</p>
            <button
              onClick={() => this.setState({ error: null })}
              className="text-xs uppercase tracking-widest px-4 py-2 border border-gray-700 text-gray-400 hover:text-white rounded"
            >
              Attempt Recovery
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
