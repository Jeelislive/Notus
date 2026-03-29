'use client'

import { Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface Language {
  code: string
  name: string
  nativeName: string
  flag: string
}

const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'auto', name: 'Auto Detect', nativeName: 'Auto Detect', flag: '🌐' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇧🇩' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', flag: '🇵🇰' },
]

interface LanguageSelectorProps {
  selectedLanguage: string
  onLanguageChange: (language: string) => void
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function LanguageSelector({ 
  selectedLanguage, 
  onLanguageChange, 
  disabled = false,
  size = 'md' 
}: LanguageSelectorProps) {
  const currentLanguage = SUPPORTED_LANGUAGES.find(lang => lang.code === selectedLanguage) || SUPPORTED_LANGUAGES[0]

  const sizeClasses = {
    sm: 'px-2 py-1 text-[12px]',
    md: 'px-3 py-1.5 text-[13px]',
    lg: 'px-4 py-2 text-[14px]'
  }

  return (
    <div className="relative group">
      <Button
        variant="outline"
        size={size === 'sm' ? 'sm' : size === 'lg' ? 'default' : 'sm'}
        disabled={disabled}
        className="flex items-center gap-2 border-border/60 hover:border-border"
      >
        <span className="text-lg">{currentLanguage.flag}</span>
        <span className="hidden sm:inline">{currentLanguage.nativeName}</span>
        <span className="sm:hidden">{currentLanguage.flag}</span>
        <Globe className="size-3 opacity-60" />
      </Button>
      
      {/* Language Dropdown */}
      <div className="absolute top-full left-0 mt-1 bg-background border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 min-w-[200px]">
        <div className="max-h-60 overflow-y-auto">
          {SUPPORTED_LANGUAGES.map((language) => (
            <button
              key={language.code}
              onClick={() => onLanguageChange(language.code)}
              disabled={disabled}
              className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted/50 transition-colors ${
                selectedLanguage === language.code ? 'bg-muted/70' : ''
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span className="text-lg">{language.flag}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground">{language.nativeName}</div>
                <div className="text-xs text-muted-foreground">{language.name}</div>
              </div>
              {selectedLanguage === language.code && (
                <div className="size-1.5 rounded-full bg-indigo-500" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export function getLanguageName(code: string): string {
  const language = SUPPORTED_LANGUAGES.find(lang => lang.code === code)
  return language?.nativeName || 'Auto Detect'
}

export function getLanguageFlag(code: string): string {
  const language = SUPPORTED_LANGUAGES.find(lang => lang.code === code)
  return language?.flag || '🌐'
}
