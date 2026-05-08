import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="btn-glass p-2 flex items-center justify-center rounded-full hover:bg-white/20 transition-all duration-300">
          <Languages className="w-5 h-5 text-[#b24760]" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="glass-strong border-white/20 bg-white/80 backdrop-blur-xl">
        <DropdownMenuItem 
          onClick={() => changeLanguage('en')}
          className={`cursor-pointer focus:bg-[#b24760]/10 ${i18n.language === 'en' ? 'text-[#b24760] font-bold' : ''}`}
        >
          English
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => changeLanguage('fr')}
          className={`cursor-pointer focus:bg-[#b24760]/10 ${i18n.language === 'fr' ? 'text-[#b24760] font-bold' : ''}`}
        >
          Français
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
