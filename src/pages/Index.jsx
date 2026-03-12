import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Heart, UtensilsCrossed, Apple, TrendingUp, FileText, MessageSquare, ArrowRight, CheckCircle, Stethoscope } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: UtensilsCrossed,
      title: "Smart Recipe Recommendations",
      description: "Get personalized recipes based on your health profile and available ingredients",
      color: "from-primary to-primary-glow"
    },
    {
      icon: Apple,
      title: "Custom Diet Plans",
      description: "AI-generated meal plans tailored to your goals and medical conditions",
      color: "from-accent to-green-500"
    },
    {
      icon: TrendingUp,
      title: "Progress Tracking",
      description: "Monitor your health journey with detailed insights and visualizations",
      color: "from-secondary to-blue-500"
    },
    {
      icon: FileText,
      title: "Lab Report Analysis",
      description: "Upload your reports for instant AI-powered analysis and recommendations",
      color: "from-warning to-orange-500"
    },
    {
      icon: MessageSquare,
      title: "AI Health Assistant",
      description: "24/7 medical guidance from our intelligent chatbot",
      color: "from-destructive to-red-500"
    }
  ];

  const benefits = [
    "Personalized health recommendations based on your medical history",
    "Diabetic-friendly and heart-healthy meal suggestions",
    "Track weight, blood pressure, and other vital metrics",
    "AI-powered lab report interpretation",
    "Professional medical-grade interface"
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary-light via-background to-secondary-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center space-y-8 animate-fade-in">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-primary to-primary-glow shadow-2xl mb-6 animate-pulse-glow">
              <Heart className="h-12 w-12 text-white" />
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground">
              Welcome to
              <span className="block bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                Smart Nutrition Assistant
              </span>
            </h1>
            
            <p className="text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto px-4">
              AI-powered health recommendations, personalized meal plans, and comprehensive progress tracking - all in one place
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6">
              <Button 
                className="h-14 px-8 text-lg medical-gradient text-white shadow-lg hover:opacity-90 smooth-transition gap-2"
                onClick={() => navigate("/signup")}
              >
                Get Started Free
                <ArrowRight className="h-5 w-5" />
              </Button>
              <Button 
                variant="outline" 
                className="h-14 px-8 text-lg"
                onClick={() => navigate("/login")}
              >
                Sign In
              </Button>
            </div>

            <div className="pt-4">
              <Button
                variant="ghost"
                className="gap-2 text-primary hover:text-primary-glow"
                onClick={() => {
                  navigate("/signup");
                  // Set flag for nutritionist registration – handled via URL state
                  sessionStorage.setItem('registerAsNutritionist', 'true');
                }}
              >
                <Stethoscope className="h-5 w-5" />
                Register as Nutritionist
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Everything You Need for Better Health
          </h2>
          <p className="text-xl text-muted-foreground">
            Comprehensive tools designed by health professionals
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card 
              key={index}
              className="glass-card p-8 hover-lift smooth-transition"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 shadow-lg`}>
                <feature.icon className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-semibold text-foreground mb-3">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Benefits Section */}
      <div className="bg-gradient-to-br from-muted/30 to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
                Why Choose HealthHub?
              </h2>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3 animate-slide-up" style={{ animationDelay: `${index * 100}ms` }}>
                    <CheckCircle className="h-6 w-6 text-success flex-shrink-0 mt-1" />
                    <p className="text-lg text-foreground">{benefit}</p>
                  </div>
                ))}
              </div>
              <Button 
                className="mt-8 h-12 px-6 medical-gradient text-white gap-2"
                onClick={() => navigate("/signup")}
              >
                Start Your Journey
                <ArrowRight className="h-5 w-5" />
              </Button>
            </div>

            <Card className="glass-card p-8 lg:p-12">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-primary mb-2">500+</div>
                    <div className="text-sm text-muted-foreground">Healthy Recipes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-accent mb-2">100+</div>
                    <div className="text-sm text-muted-foreground">Diet Plans</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-secondary mb-2">24/7</div>
                    <div className="text-sm text-muted-foreground">AI Support</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-success mb-2">95%</div>
                    <div className="text-sm text-muted-foreground">Success Rate</div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-br from-primary to-primary-glow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Transform Your Health?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join thousands of users who are already achieving their health goals with HealthHub
          </p>
          <Button 
            className="h-14 px-8 text-lg bg-white text-primary hover:bg-white/90 shadow-lg gap-2"
            onClick={() => navigate("/signup")}
          >
            Get Started Now
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-card border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-lg">
              <Heart className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-foreground">Smart Nutrition Assistant</span>
          </div>
          <p className="text-center text-muted-foreground">
            © 2025 developed by Arooj Ahmad
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
