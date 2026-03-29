'use client'

import { useState } from 'react'
import { Globe, Loader2, CheckCircle } from 'lucide-react'
import { UserLanguageSelector } from '@/components/ui/user-language-selector'
import { Button } from '@/components/ui/button'

interface LanguageSettingsProps {
  currentPreferredLanguage?: string
  currentTranscriptionLanguage?: string
}

export function LanguageSettings({ 
  currentPreferredLanguage = 'en',
  currentTranscriptionLanguage = 'auto'
}: LanguageSettingsProps) {
  const [preferredLanguage, setPreferredLanguage] = useState(currentPreferredLanguage)
  const [transcriptionLanguage, setTranscriptionLanguage] = useState(currentTranscriptionLanguage)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    
    try {
      const response = await fetch('/api/user/language-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferredLanguage,
          transcriptionLanguage,
        }),
      })

      if (response.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } catch (error) {
      console.error('Failed to save language preferences:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-2xl border border-border overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Globe className="size-4" />
          Language Preferences
        </h2>
      </div>
      
      <div className="p-5 space-y-6">
        {/* Interface Language */}
        <div className="space-y-4">
          <div>
            <h3 className="text-[15px] font-medium text-foreground mb-1">Interface Language</h3>
            <p className="text-[13px] text-muted-foreground">
              Choose your preferred language for the Notus interface
            </p>
          </div>
          
          <div className="flex items-center justify-between">
            <UserLanguageSelector
              selectedLanguage={preferredLanguage}
              onLanguageChange={setPreferredLanguage}
              type="interface"
              size="md"
            />
            <span className="text-xs text-muted-foreground">
              {preferredLanguage === 'en' ? 'English' : 
               preferredLanguage === 'hi' ? 'हिन्दी' :
               preferredLanguage === 'gu' ? 'ગુજરાતી' : preferredLanguage}
            </span>
          </div>
        </div>

        {/* Transcription Language */}
        <div className="space-y-4">
          <div>
            <h3 className="text-[15px] font-medium text-foreground mb-1">Transcription Language</h3>
            <p className="text-[13px] text-muted-foreground">
              Default language for meeting transcriptions and AI processing
            </p>
          </div>
          
          <div className="flex items-center justify-between">
            <UserLanguageSelector
              selectedLanguage={transcriptionLanguage}
              onLanguageChange={setTranscriptionLanguage}
              type="transcription"
              size="md"
            />
            <span className="text-xs text-muted-foreground">
              {transcriptionLanguage === 'auto' ? 'Auto Detect' :
               transcriptionLanguage === 'en' ? 'English' :
               transcriptionLanguage === 'hi' ? 'हिन्दी' :
               transcriptionLanguage === 'gu' ? 'ગુજરાતી' : transcriptionLanguage}
            </span>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="text-xs text-muted-foreground">
            Changes will apply to new meetings and future sessions
          </div>
          
          <Button
            onClick={handleSave}
            disabled={saving}
            className="gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving...
              </>
            ) : saved ? (
              <>
                <CheckCircle className="size-4" />
                Saved
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
