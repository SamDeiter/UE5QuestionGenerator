import React from 'react';
import Icon from './Icon';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    handleReload = () => {
        window.location.reload();
    };

    handleClearCache = () => {
        localStorage.clear();
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            // Fallback UI
            return (
                <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans text-slate-200">
                    <div className="max-w-md w-full bg-slate-900 border border-red-900/50 rounded-lg shadow-2xl p-8 text-center">
                        <div className="w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Icon name="alert-triangle" size={32} className="text-red-500" />
                        </div>

                        <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
                        <p className="text-slate-400 mb-6">
                            The application encountered an unexpected error.
                        </p>

                        <div className="bg-slate-950 rounded p-4 mb-6 text-left overflow-auto max-h-48 border border-slate-800">
                            <p className="text-red-400 font-mono text-xs break-words">
                                {this.state.error && this.state.error.toString()}
                            </p>
                            {this.state.errorInfo && (
                                <details className="mt-2 text-slate-500 text-[10px] font-mono cursor-pointer">
                                    <summary>Stack Trace</summary>
                                    <pre className="mt-2 whitespace-pre-wrap">
                                        {this.state.errorInfo.componentStack}
                                    </pre>
                                </details>
                            )}
                        </div>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={this.handleReload}
                                className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                <Icon name="refresh-cw" size={16} />
                                Reload Application
                            </button>

                            <button
                                onClick={this.handleClearCache}
                                className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-medium transition-colors text-sm"
                            >
                                Clear Cache & Reload
                            </button>
                        </div>

                        <p className="mt-6 text-xs text-slate-600">
                            If this persists, please contact the developer.
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
