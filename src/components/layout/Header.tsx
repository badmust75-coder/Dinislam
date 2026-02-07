import { useState } from 'react';
import { Home, LogOut } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import VoiceNoteDialog from '@/components/notes/VoiceNoteDialog';
import noteIcon from '@/assets/note-icon.png';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
}

const Header = ({
  title = 'Dini Bismillah',
  showBack = false
}: HeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, isAdmin } = useAuth();
  const [showNoteDialog, setShowNoteDialog] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const isHome = location.pathname === '/';

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-gradient-to-r from-primary via-primary to-royal-dark shadow-royal safe-top">
        <div className="flex items-center justify-between h-14 px-4">
          {/* Left: Note Icon */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setShowNoteDialog(true)} 
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            <img 
              src={noteIcon} 
              alt="Note" 
              className="h-8 w-8 object-contain invert"
            />
          </Button>

          {/* Center: Title with logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center">
              <span className="font-arabic text-sm text-primary">﷽</span>
            </div>
            <h1 className="text-lg font-bold text-primary-foreground">
              {title}
            </h1>
            {isAdmin}
          </div>

          {/* Right: Home or Logout */}
          <div className="flex items-center gap-1">
            {!isHome && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate('/')} 
                className="text-primary-foreground hover:bg-primary-foreground/10"
              >
                <Home className="h-5 w-5" />
              </Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10">
                  <LogOut className="h-5 w-5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Se déconnecter ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Êtes-vous sûr de vouloir quitter l'application ?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handleLogout} className="bg-destructive hover:bg-destructive/90">
                    Quitter
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </header>

      <VoiceNoteDialog open={showNoteDialog} onOpenChange={setShowNoteDialog} />
    </>
  );
};

export default Header;
