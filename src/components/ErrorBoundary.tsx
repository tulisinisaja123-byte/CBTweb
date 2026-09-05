import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { safeStorageRemove } from '../services/lmsStorage';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: ''
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error?.message || 'Terjadi kesalahan sistem yang tidak terduga.'
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    try {
      safeStorageRemove('lms_token');
    } catch {
      // ignore
    }
    this.setState({ hasError: false, errorMessage: '' });
    try {
      window.location.reload();
    } catch {
      // ignore if iframe blocks navigation
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F1F3F5] flex items-center justify-center p-4">
          <div className="bg-white border border-[#DEE2E6] rounded-xl p-6 sm:p-8 max-w-md w-full shadow-lg text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#FCE8E6] text-[#C5221F] mx-auto flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-[#1A1C1E]">Terjadi Kendala Tampilan</h2>
            <p className="text-xs sm:text-sm text-[#6C757D] leading-relaxed">
              Aplikasi mengalami kendala saat memuat data. Anda dapat memuat ulang untuk memperbarui sesi.
            </p>
            {this.state.errorMessage && (
              <div className="p-2.5 rounded bg-[#F8F9FA] border border-[#DEE2E6] text-[11px] font-mono text-[#C5221F] text-left break-words">
                {this.state.errorMessage}
              </div>
            )}
            <button
              type="button"
              onClick={this.handleReload}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#0052CC] hover:bg-[#0047B3] text-white font-medium text-xs sm:text-sm transition-colors shadow-xs"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Muat Ulang Halaman</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
