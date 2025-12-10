import React from 'react';
import Icon from './Icon';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(_error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ error, errorInfo });
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center h-screen bg-slate-950 text-slate-200 p-8 text-center">
                    <div className="bg-red-900/20 p-6 rounded-xl border border-red-800/50 max-w-2xl">
                        <Icon name="alert-triangle" size={48} className="text-red-500 mb-4 mx-auto" />
                        <h1 className="text-2xl font-bold text-red-400 mb-2">Something went wrong.</h1>
                        <p className="text-slate-400 mb-6">
                            The application encountered an unexpected error. Please try reloading the page.
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition-colors flex items-center gap-2 mx-auto"
                        >
                            <Icon name="refresh-cw" size={20} />
                            Reload Application
                        </button>
                        {this.state.error && (
                            <details className="mt-6 text-left bg-slate-900 p-4 rounded text-xs text-slate-500 overflow-auto max-h-48">
                                <summary className="cursor-pointer hover:text-slate-300 mb-2">Error Details</summary>
                                <pre>{this.state.error.toString()}</pre>
                                <pre>{this.state.errorInfo.componentStack}</pre>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
