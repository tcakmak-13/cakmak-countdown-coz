import { useNavigate } from "react-router-dom";
import { Home } from "lucide-react";
import AppLogo from "@/components/AppLogo";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary/20 to-orange-600/20 flex items-center justify-center mb-6">
        <Flame className="h-10 w-10 text-primary" />
      </div>
      <h1 className="mb-2 text-6xl font-display font-bold text-gradient-orange">404</h1>
      <p className="mb-8 text-lg text-muted-foreground text-center max-w-sm">
        Aradığınız sayfa bulunamadı veya taşınmış olabilir.
      </p>
      <Button
        onClick={() => navigate('/')}
        className="gap-2 bg-gradient-orange text-primary-foreground border-0 hover:opacity-90"
        size="lg"
      >
        <Home className="h-4 w-4" />
        Ana Sayfaya Dön
      </Button>
    </div>
  );
};

export default NotFound;
