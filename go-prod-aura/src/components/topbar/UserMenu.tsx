import { useState, useEffect, useRef } from "react";
import { ChevronUp, LogOut, Shield, UserRound, Lock, Languages } from "lucide-react";
import { useI18n, type Lang } from "../../lib/i18n";
import type { Profile } from "../../types/user";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

function Avatar({ name, url }: { name?: string | null; url?: string | null }) {
  if (url) return <img src={url} alt={name ?? 'avatar'} className="w-12 h-12 rounded-full object-cover" />;
  const initials = (name ?? 'U').split(' ').map(p => p[0]).slice(0,2).join('').toUpperCase();
  return (
    <div className="w-12 h-12 rounded-full bg-grad-violet text-white flex items-center justify-center text-base font-bold shadow-violet-glow">
      {initials}
    </div>
  );
}

export default function UserMenu({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const { t, lang, setLang } = useI18n();
  const nav = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);
  const isAdmin = profile.role === 'admin' || profile.role === 'owner';

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
        setLangOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
    nav('/auth/signin');
  };

  const handleLangChange = (newLang: Lang) => {
    setLang(newLang);
    setLangOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setOpen(v => !v)} 
        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors"
      >
        <Avatar name={profile.full_name ?? ''} url={profile.avatar_url ?? undefined} />
        <div className="flex-1 text-left">
          <div className="text-sm font-medium truncate text-white">{profile.full_name ?? 'User'}</div>
          <div className="text-xs text-gray-500 capitalize">{profile.role}</div>
        </div>
        <ChevronUp className={`w-4 h-4 text-gray-400 transition-transform ${open ? '' : 'rotate-180'}`} />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-2 rounded-lg border border-white/10 bg-night-900/95 backdrop-blur shadow-xl p-1 z-50">
          <button 
            onClick={() => { setOpen(false); nav('/app/settings/profile'); }} 
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-white/5 rounded transition-colors"
          >
            <UserRound className="w-4 h-4" /> {t('profile')}
          </button>
          
          <button 
            onClick={() => { setOpen(false); nav('/app/settings/security'); }} 
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-white/5 rounded transition-colors"
          >
            <Lock className="w-4 h-4" /> {t('security')}
          </button>
          
          <button
            disabled={!isAdmin}
            title={!isAdmin ? t('admin_only') : undefined}
            onClick={() => { if (isAdmin) { setOpen(false); nav('/app/admin/permissions'); } }}
            className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded transition-colors ${
              isAdmin 
                ? 'text-white hover:bg-white/5' 
                : 'text-gray-600 cursor-not-allowed'
            }`}
          >
            <Shield className="w-4 h-4" /> {t('permissions')}
          </button>
          
          <div className="border-t border-white/10 my-1" />
          
          <div className="relative">
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-white/5 rounded transition-colors"
            >
              <Languages className="w-4 h-4" /> {t('language')} ({lang.toUpperCase()})
            </button>
            
            {langOpen && (
              <div className="absolute right-0 top-0 mr-1 w-32 rounded-lg border border-white/10 bg-night-900/95 backdrop-blur shadow-xl p-1">
                {(['fr', 'en', 'de'] as Lang[]).map((langOption) => (
                  <button
                    key={langOption}
                    onClick={() => handleLangChange(langOption)}
                    className={`w-full text-left px-3 py-2 text-sm rounded transition-colors ${
                      lang === langOption 
                        ? 'bg-violetNeon-500 text-white' 
                        : 'text-white hover:bg-white/5'
                    }`}
                  >
                    {langOption === 'fr' ? '🇫🇷 Français' : langOption === 'en' ? '🇬🇧 English' : '🇩🇪 Deutsch'}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div className="border-t border-white/10 my-1" />
          
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/5 rounded text-red-400 hover:text-red-300 transition-colors"
          >
            <LogOut className="w-4 h-4" /> {t('sign_out')}
          </button>
        </div>
      )}
    </div>
  );
}
