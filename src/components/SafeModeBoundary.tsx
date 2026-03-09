import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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
  safeMode: boolean;
};

export default class SafeModeBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    errorMessage: null,
    safeMode: typeof window !== "undefined" ? getSafeModeEnabled() : false,
  };

  static getDerivedStateFromError(error: unknown): Partial<State> {
    const msg = error instanceof Error ? error.message : "Bilinmeyen hata";
    return { hasError: true, errorMessage: msg };
  }

  componentDidCatch(_error: unknown, _info: ErrorInfo) {
    // intentionally empty: we keep app stable instead of crashing
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-xl p-6 space-y-4">
          <div className="space-y-1">
            <h1 className="font-display text-xl font-bold text-foreground">Uygulama kurtarma modu</h1>
            <p className="text-sm text-muted-foreground">
              Bir runtime hata yakalandı; sayfayı ayakta tutmak için güvenli fallback gösteriyoruz.
            </p>
          </div>

          {this.state.errorMessage && (
            <pre className="text-xs whitespace-pre-wrap rounded-md bg-secondary p-3 text-foreground">
              {this.state.errorMessage}
            </pre>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={() => window.location.reload()} className="sm:flex-1">
              Yeniden yükle
            </Button>
            <Button variant="secondary" onClick={enableSafeModeAndReload} className="sm:flex-1">
              Safe Mode ile aç
            </Button>
            {(this.state.safeMode || getSafeModeEnabled()) && (
              <Button variant="outline" onClick={disableSafeModeAndReload} className="sm:flex-1">
                Safe Mode kapat
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Not: Safe Mode animasyon/etkileşim yoğun alanlarda hatayı izole etmek için kullanılır.
          </p>
        </Card>
      </div>
    );
  }
}
