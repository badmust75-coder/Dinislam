import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Sparkles, Star } from 'lucide-react';

interface NouraniaUnlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  lessonNumber: number;
}

const NouraniaUnlockDialog = ({
  open,
  onOpenChange,
  onConfirm,
  lessonNumber,
}: NouraniaUnlockDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="h-6 w-6 text-gold" />
            <Star className="h-5 w-5 text-gold" />
          </div>
          <AlertDialogTitle className="text-center">
            Bien joué ! Es-tu prêt pour la suite ?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center space-y-2">
            <p className="text-lg font-arabic">ما شاء الله</p>
            <p className="text-sm text-muted-foreground mt-2">
              Tu t'apprêtes à découvrir la Leçon {lessonNumber}
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          <AlertDialogAction
            onClick={onConfirm}
            className="w-full bg-gradient-to-r from-gold to-gold-dark text-primary"
          >
            Oui, je suis prêt(e) !
          </AlertDialogAction>
          <AlertDialogCancel className="w-full">
            Pas encore
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default NouraniaUnlockDialog;
