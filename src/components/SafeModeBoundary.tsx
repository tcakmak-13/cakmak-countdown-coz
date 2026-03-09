import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, Shield, Home } from "lucide-react";

function getSafeModeEnabled() {
  try {
    const url = new URL(window.location.href);
    const qp = url.searchParams.get("safe");
    if (qp === "1" || qp === "true") return true;
    return localStorage.getItem("safeMode") === "1";
  } catch {
    return false;
  }
}

function enableSafeModeAndReload() {
  try {
    localStorage.setItem("safeMode", "1");
  } catch {
    // ignore
  }
  window.location.reload();
}

function disableSafeModeAndReload() {
  try {
    localStorage.removeItem("safeMode");
  } catch {
    // ignore
  }

  try {
    const url = new URL(window.location.href);
    url.searchParams.delete("safe");
    window.location.href = url.toString();
  } catch {
    window.location.reload();
  }
}

type Props = { children: ReactNode };

type State = {
  hasError: boolean;
  errorMessage: string | null;
  errorStack: string | null;
  safeMode: boolean;
};

export default class SafeModeBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    errorMessage: null,
    errorStack: null,
    safeMode: typeof window !== "undefined" ? getSafeModeEnabled() : false,
  };

  static getDerivedStateFromError(error: unknown): Partial<State> {
    const msg = error instanceof Error ? error.message : "Bilinmeyen hata";
    const stack = error instanceof Error ? error.stack?.split('\n').slice(0, 5).join('\n') : null;
    return { hasError: true, errorMessage: msg, errorStack: stack };
  }

  componentDidCatch(_error: unknown, _info: ErrorInfo) {
    // Error logged in production monitoring if needed
  }

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg p-8 space-y-6 border-primary/20 shadow-[0_0_40px_rgba(249,115,22,0.08)]">
          {/* Header */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-orange-600/20 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-primary" />
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              Bir Sorun Oluştu
            </h1>
            <p className="text-sm text-muted-foreground max-w-sm">
              Beklenmedik bir hata ile karşılaştık. Ekibimiz bu sorunu çözmek için çalışıyor.
            </p>
          </div>

          {/* Error Details (collapsible in production) */}
          {this.state.errorMessage && import.meta.env.DEV && (
            <div className="rounded-xl bg-destructive/5 border border-destructive/20 p-4 space-y-2">
              <p className="text-xs font-semibold text-destructive flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
                Hata Detayı
              </p>
              <pre className="text-[11px] whitespace-pre-wrap text-muted-foreground font-mono leading-relaxed overflow-x-auto">
                {this.state.errorMessage}
              </pre>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <Button 
              onClick={() => window.location.reload()} 
              className="w-full gap-2 bg-gradient-to-r from-primary to-orange-600 text-primary-foreground hover:opacity-90"
              size="lg"
            >
              <RefreshCw className="h-4 w-4" />
              Sayfayı Yenile
            </Button>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={this.handleGoHome} 
                className="flex-1 gap-2"
              >
                <Home className="h-4 w-4" />
                Ana Sayfa
              </Button>
              <Button 
                variant="secondary" 
                onClick={enableSafeModeAndReload} 
                className="flex-1 gap-2"
              >
                <Shield className="h-4 w-4" />
                Güvenli Mod
              </Button>
            </div>

            {(this.state.safeMode || getSafeModeEnabled()) && (
              <Button 
                variant="ghost" 
                onClick={disableSafeModeAndReload} 
                className="w-full text-muted-foreground hover:text-foreground"
                size="sm"
              >
                Güvenli Modu Kapat
              </Button>
            )}
          </div>

          {/* Footer */}
          <p className="text-[11px] text-center text-muted-foreground/70">
            Bu hata devam ederse lütfen destek ekibimizle iletişime geçin.
          </p>
        </Card>
      </div>
    );
  }
}
