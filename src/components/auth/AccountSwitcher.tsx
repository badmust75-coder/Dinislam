import { useState, useEffect } from 'react';
import { UsersRound, Plus, Trash2, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const STORAGE_KEY = 'dini_saved_accounts';

interface SavedAccount {
  email: string;
}

const getSavedAccounts = (): SavedAccount[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const setSavedAccounts = (accounts: SavedAccount[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
};

const AccountSwitcher = () => {
  const { user, signIn, signOut } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [accounts, setAccounts] = useState<SavedAccount[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [switchEmail, setSwitchEmail] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      const saved = getSavedAccounts();
      // Auto-add current user if not already saved
      if (user?.email && !saved.find((a) => a.email === user.email)) {
        const updated = [...saved, { email: user.email }];
        setSavedAccounts(updated);
        setAccounts(updated);
      } else {
        setAccounts(saved);
      }
    }
  }, [open, user?.email]);

  const handleAddAccount = () => {
    const email = newEmail.trim().toLowerCase();
    if (!email || accounts.find((a) => a.email === email)) {
      toast({ title: 'Ce compte existe déjà dans la liste', variant: 'destructive' });
      return;
    }
    const updated = [...accounts, { email }];
    setSavedAccounts(updated);
    setAccounts(updated);
    setNewEmail('');
    setShowAdd(false);
    toast({ title: 'Compte ajouté à la liste' });
  };

  const handleRemoveAccount = (email: string) => {
    const updated = accounts.filter((a) => a.email !== email);
    setSavedAccounts(updated);
    setAccounts(updated);
    setSwitchEmail(null);
  };

  const handleSwitch = async () => {
    if (!switchEmail || !password) return;
    setLoading(true);
    try {
      await signOut();
      const { error } = await signIn(switchEmail, password);
      if (error) {
        toast({
          title: 'Erreur de connexion',
          description: 'Email ou mot de passe incorrect',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }
      toast({ title: `Connecté en tant que ${switchEmail}` });
      setOpen(false);
      setSwitchEmail(null);
      setPassword('');
    } catch {
      toast({ title: 'Erreur lors du changement de compte', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const currentEmail = user?.email;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setSwitchEmail(null); setPassword(''); setShowAdd(false); } }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10">
          <UsersRound className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">Changer de compte</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 mt-2">
          {accounts.map((account) => (
            <div
              key={account.email}
              className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                account.email === currentEmail
                  ? 'bg-primary/10 border-primary'
                  : switchEmail === account.email
                  ? 'bg-accent border-accent'
                  : 'hover:bg-muted'
              }`}
              onClick={() => {
                if (account.email !== currentEmail) {
                  setSwitchEmail(account.email);
                  setPassword('');
                }
              }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                  {account.email.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm truncate">{account.email}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {account.email === currentEmail && (
                  <Badge variant="secondary" className="text-xs">Actif</Badge>
                )}
                {account.email !== currentEmail && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => { e.stopPropagation(); handleRemoveAccount(account.email); }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Password input for selected account */}
        {switchEmail && (
          <div className="space-y-3 mt-3 p-3 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground">
              Mot de passe pour <strong>{switchEmail}</strong>
            </p>
            <Input
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSwitch()}
              autoFocus
            />
            <Button onClick={handleSwitch} disabled={loading || !password} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Se connecter
            </Button>
          </div>
        )}

        {/* Add new account */}
        {!switchEmail && (
          <>
            {showAdd ? (
              <div className="space-y-2 mt-3">
                <Input
                  type="email"
                  placeholder="Adresse e-mail"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddAccount()}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowAdd(false)} className="flex-1">
                    Annuler
                  </Button>
                  <Button onClick={handleAddAccount} disabled={!newEmail.trim()} className="flex-1">
                    Ajouter
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" onClick={() => setShowAdd(true)} className="w-full mt-2">
                <Plus className="h-4 w-4 mr-2" /> Ajouter un compte
              </Button>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AccountSwitcher;
