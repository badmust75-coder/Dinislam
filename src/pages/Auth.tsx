import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Lock, User, Star, Moon, CalendarIcon, Eye, EyeOff } from 'lucide-react';

const Auth = () => {
  const { user, loading: authLoading, signIn, signUp, resetPassword } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Form states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupGender, setSignupGender] = useState('');
  const [signupDob, setSignupDob] = useState(''); // JJ/MM/AAAA
  const [signupPasswordConfirm, setSignupPasswordConfirm] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupPasswordConfirm, setShowSignupPasswordConfirm] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary to-royal-dark">
        <Loader2 className="h-12 w-12 animate-spin text-gold" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(loginEmail, loginPassword);

    if (error) {
      toast({
        title: "Erreur de connexion",
        description: error.message === 'Invalid login credentials' 
          ? "Email ou mot de passe incorrect"
          : error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Bienvenue !",
        description: "Connexion réussie. Bismillah !",
      });
    }

    setLoading(false);
  };

  // Parse JJ/MM/AAAA to YYYY-MM-DD
  const parseDobToISO = (dob: string): string | null => {
    const match = dob.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return null;
    const [, day, month, year] = match;
    const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (isNaN(d.getTime())) return null;
    if (d.getDate() !== parseInt(day) || d.getMonth() !== parseInt(month) - 1) return null;
    return `${year}-${month}-${day}`;
  };

  // Calculate age from DOB string (JJ/MM/AAAA)
  const calculateAge = (dob: string): number | null => {
    const iso = parseDobToISO(dob);
    if (!iso) return null;
    const birth = new Date(iso);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  // Auto-format DOB input
  const handleDobChange = (value: string) => {
    // Remove non-digits
    const digits = value.replace(/\D/g, '');
    let formatted = '';
    if (digits.length <= 2) formatted = digits;
    else if (digits.length <= 4) formatted = digits.slice(0, 2) + '/' + digits.slice(2);
    else formatted = digits.slice(0, 2) + '/' + digits.slice(2, 4) + '/' + digits.slice(4, 8);
    setSignupDob(formatted);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (signupPassword !== signupPasswordConfirm) {
      setPasswordError('Les mots de passe ne correspondent pas');
      setLoading(false);
      return;
    }

    if (signupPassword.length < 6) {
      setPasswordError('Le mot de passe doit contenir au moins 6 caractères');
      setLoading(false);
      return;
    }

    let dobISO: string | undefined;
    if (signupDob) {
      const parsed = parseDobToISO(signupDob);
      if (!parsed) {
        toast({
          title: "Date invalide",
          description: "Veuillez entrer une date au format JJ/MM/AAAA",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      dobISO = parsed;
    }

    const { error } = await signUp(signupEmail, signupPassword, signupName, signupGender, dobISO);

    if (error) {
      toast({
        title: "Erreur d'inscription",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Inscription envoyée !",
        description: "Votre demande sera validée par l'enseignant. Vous serez notifié.",
      });
    }

    setLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await resetPassword(resetEmail);

    if (error) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Email envoyé",
        description: "Vérifiez votre boîte mail pour réinitialiser votre mot de passe",
      });
      setShowForgotPassword(false);
    }

    setLoading(false);
  };

  const computedAge = signupDob ? calculateAge(signupDob) : null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-primary via-royal-dark to-primary pattern-islamic relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-10 left-10 text-gold/20">
        <Star className="h-16 w-16 animate-float" />
      </div>
      <div className="absolute bottom-20 right-10 text-gold/20">
        <Moon className="h-20 w-20 animate-float" style={{ animationDelay: '1s' }} />
      </div>
      <div className="absolute top-1/4 right-1/4 text-gold/10">
        <Star className="h-8 w-8" />
      </div>

      {/* Logo and Title */}
      <div className="text-center mb-8 animate-fade-in">
        <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center shadow-gold">
          <span className="font-arabic text-4xl text-primary-foreground">﷽</span>
        </div>
        <h1 className="text-4xl font-bold text-primary-foreground mb-2">
          <span className="text-gradient-gold">Dini</span> Bismillah
        </h1>
        <p className="text-primary-foreground/70 text-lg">
          Votre compagnon d'apprentissage de l'arabe
        </p>
      </div>

      {showForgotPassword ? (
        <Card className="w-full max-w-md shadow-elevated animate-scale-in border-gold/20">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-primary">Mot de passe oublié</CardTitle>
            <CardDescription>
              Entrez votre email pour recevoir un lien de réinitialisation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="votre@email.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full bg-primary hover:bg-royal-dark" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Envoyer le lien
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setShowForgotPassword(false)}
              >
                Retour à la connexion
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card className="w-full max-w-md shadow-elevated animate-scale-in border-gold/20">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl text-primary">Accéder à l'application</CardTitle>
            <CardDescription>
              Connectez-vous ou créez un compte pour commencer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Connexion
                </TabsTrigger>
                <TabsTrigger value="signup" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Inscription
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="votre@email.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                    <div className="space-y-2">
                    <Label htmlFor="login-password">Mot de passe</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-password"
                        type={showLoginPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="pl-10 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      >
                        {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="link"
                    className="px-0 text-sm text-gold hover:text-gold-dark"
                    onClick={() => setShowForgotPassword(true)}
                  >
                    Mot de passe oublié ?
                  </Button>
                  <Button type="submit" className="w-full bg-primary hover:bg-royal-dark" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Se connecter
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nom complet</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Votre nom"
                        value={signupName}
                        onChange={(e) => setSignupName(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-gender">Genre</Label>
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant={signupGender === 'garcon' ? 'default' : 'outline'}
                        className={`flex-1 ${signupGender === 'garcon' ? 'bg-primary' : ''}`}
                        onClick={() => setSignupGender('garcon')}
                      >
                        👦 Garçon
                      </Button>
                      <Button
                        type="button"
                        variant={signupGender === 'fille' ? 'default' : 'outline'}
                        className={`flex-1 ${signupGender === 'fille' ? 'bg-primary' : ''}`}
                        onClick={() => setSignupGender('fille')}
                      >
                        👧 Fille
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-dob">Date de naissance</Label>
                    <div className="relative">
                      <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-dob"
                        type="text"
                        inputMode="numeric"
                        placeholder="JJ/MM/AAAA"
                        value={signupDob}
                        onChange={(e) => handleDobChange(e.target.value)}
                        className="pl-10"
                        maxLength={10}
                      />
                    </div>
                    {computedAge !== null && computedAge >= 0 && (
                      <p className="text-xs text-muted-foreground">
                        Âge : <span className="font-semibold">{computedAge} ans</span>
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="votre@email.com"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Mot de passe</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="••••••••"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        className="pl-10"
                        required
                        minLength={6}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Minimum 6 caractères</p>
                  </div>
                  <Button type="submit" className="w-full bg-primary hover:bg-royal-dark" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Créer un compte
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Footer decoration */}
      <p className="mt-8 text-primary-foreground/50 text-sm font-arabic text-xl">
        بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
      </p>
    </div>
  );
};

export default Auth;
