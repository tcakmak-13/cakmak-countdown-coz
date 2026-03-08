import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Flame } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <Flame className="h-12 w-12 text-primary mb-4" />
      <h1 className="mb-2 text-5xl font-display font-bold">404</h1>
      <p className="mb-6 text-lg text-muted-foreground">Aradığınız sayfa bulunamadı.</p>
      <Button
        onClick={() => navigate('/')}
        className="bg-gradient-orange text-primary-foreground border-0 hover:opacity-90"
      >
        Ana Sayfaya Dön
      </Button>
    </div>
  );
};

export default NotFound;
