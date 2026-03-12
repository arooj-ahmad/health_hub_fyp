import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Heart, Lock, Mail, User, Stethoscope } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";

const Signup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { register } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isNutritionist, setIsNutritionist] = useState(() => {
    const flag = sessionStorage.getItem('registerAsNutritionist');
    if (flag) sessionStorage.removeItem('registerAsNutritionist');
    return flag === 'true';
  });
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      await register(formData.email, formData.password, formData.fullName, isNutritionist ? 'nutritionist' : 'user');
      toast({
        title: "Account Created!",
        description: isNutritionist ? "Let's complete your nutritionist profile." : "Let's set up your health profile.",
      });
      navigate(isNutritionist ? "/nutritionist/setup-profile" : "/profile-setup");
    } catch (error) {
      console.error('Signup error:', error);
      toast({
        title: "Signup Failed",
        description: error.message || "Failed to create account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary-light via-background to-secondary-light">
      <div className="w-full max-w-md animate-scale-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-glow shadow-lg mb-4">
            <Heart className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Join HealthHub</h1>
          <p className="text-muted-foreground">{isNutritionist ? 'Register as a Nutritionist' : 'Create your account to get started'}</p>
        </div>

        <Card className="glass-card p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                Full Name
              </Label>
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="glass-input h-11"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="glass-input h-11"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-primary" />
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="glass-input h-11"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-primary" />
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="glass-input h-11"
                required
              />
            </div>

            {/* Role Toggle */}
            <div
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer smooth-transition ${
                isNutritionist ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              }`}
              onClick={() => setIsNutritionist(!isNutritionist)}
            >
              <Stethoscope className={`h-5 w-5 ${isNutritionist ? 'text-primary' : 'text-muted-foreground'}`} />
              <div className="flex-1">
                <p className="text-sm font-medium">Register as Nutritionist</p>
                <p className="text-xs text-muted-foreground">Toggle to create a professional nutritionist account</p>
              </div>
              <div className={`w-10 h-6 rounded-full smooth-transition flex items-center px-1 ${isNutritionist ? 'bg-primary' : 'bg-muted'}`}>
                <div className={`w-4 h-4 rounded-full bg-white smooth-transition ${isNutritionist ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-11 medical-gradient hover:opacity-90 smooth-transition text-white font-medium shadow-lg"
              disabled={isLoading}
            >
              {isLoading ? <LoadingSpinner size="sm" /> : (isNutritionist ? "Register as Nutritionist" : "Create Account")}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:text-primary-glow smooth-transition font-medium">
                Sign in
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Signup;
