import { useEffect, useState } from "react";
import { ArrowRight, Bookmark, FolderHeart, ListMusic, Moon, Share2, ShieldCheck, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { updateSettings, useSettings } from "@/lib/hv/settings";
import wavesImg from "@/assets/onboarding-waves.jpg";

const STEPS = 4;

export function Onboarding() {
  const { onboarded } = useSettings();
  const [step, setStep] = useState(0);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || onboarded) return null;

  const finish = () => updateSettings({ onboarded: true });
  const nextStep = async () => {
    if (step === 2 && navigator.storage?.persist) {
      try {
        await navigator.storage.persist();
      } catch {
        /* not supported */
      }
    }
    if (step < STEPS - 1) setStep(step + 1);
    else finish();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-center overflow-y-auto bg-background" role="dialog" aria-label="Welcome to Her Voice">
      <div className="flex min-h-full w-full max-w-md flex-col px-6 pt-[max(env(safe-area-inset-top),1.5rem)] pb-8">
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5" aria-label={`Step ${step + 1} of ${STEPS}`}>
            {Array.from({ length: STEPS }).map((_, i) => (
              <span
                key={i}
                className={cn("h-1.5 rounded-full transition-all", i === step ? "w-6 bg-primary" : "w-1.5 bg-foreground/15")}
              />
            ))}
          </div>
          <button onClick={finish} className="text-sm font-semibold text-muted-foreground hover:text-foreground">
            Skip
          </button>
        </div>

        <div key={step} className="flex flex-1 animate-float-in flex-col justify-center py-8">
          {step === 0 && (
            <>
              <img
                src={wavesImg}
                alt=""
                width={1024}
                height={1024}
                className="mx-auto aspect-square w-full max-w-[18rem] rounded-[2.5rem] object-cover shadow-lift"
              />
              <h1 className="mt-10 text-5xl leading-none font-normal italic">her voice</h1>
              <p className="mt-4 text-lg text-muted-foreground">
                Every voice note worth keeping, gathered in one quiet place to listen again and again.
              </p>
            </>
          )}
          {step === 1 && (
            <>
              <h1 className="text-4xl leading-tight font-normal">
                Keep them close, <em>beautifully</em> organised.
              </h1>
              <ul className="mt-8 space-y-3">
                {[
                  [FolderHeart, "Folders", "Friends, Family, College — or your own, with colours and PINs."],
                  [ListMusic, "Playlists & queue", "Line up the notes you want to hear together."],
                  [Bookmark, "Bookmarks", "Save the exact second that makes you smile."],
                  [Moon, "Sleep timer", "Fall asleep to a familiar voice. It fades out gently."],
                ].map(([Icon, title, body]) => {
                  const I = Icon as typeof FolderHeart;
                  return (
                    <li key={title as string} className="flex gap-4 rounded-2xl bg-card p-4 shadow-soft">
                      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                        <I className="size-5" />
                      </span>
                      <span>
                        <span className="block font-semibold">{title as string}</span>
                        <span className="text-sm text-muted-foreground">{body as string}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
          {step === 2 && (
            <>
              <span className="inline-flex size-16 items-center justify-center rounded-3xl bg-accent text-accent-foreground">
                <ShieldCheck className="size-8" />
              </span>
              <h1 className="mt-8 text-4xl leading-tight font-normal">Private by design.</h1>
              <p className="mt-4 text-lg text-muted-foreground">
                Voice notes are copied into storage on <strong className="text-foreground">this device only</strong>. Nothing is
                uploaded, and no account is needed.
              </p>
              <p className="mt-4 rounded-2xl bg-muted/70 p-4 text-sm text-muted-foreground">
                On the next tap your browser may ask to keep Her Voice’s storage permanently, so your notes aren’t cleared
                when space runs low. Make backups from Settings anytime.
              </p>
            </>
          )}
          {step === 3 && (
            <>
              <h1 className="text-4xl leading-tight font-normal">Bringing notes in</h1>
              <ol className="mt-8 space-y-3">
                {[
                  [Share2, "From WhatsApp or Telegram", "Long-press a voice note → Share → Save to Files (or Download)."],
                  [Smartphone, "Open Her Voice", "Tap Import and pick one or many audio files."],
                  [FolderHeart, "Choose a folder", "Preview, rename, and we’ll skip any duplicates for you."],
                ].map(([Icon, title, body], i) => {
                  const I = Icon as typeof Share2;
                  return (
                    <li key={i} className="flex gap-4 rounded-2xl bg-card p-4 shadow-soft">
                      <span className="font-display text-3xl text-primary italic">{i + 1}</span>
                      <span className="flex-1">
                        <span className="flex items-center gap-2 font-semibold">
                          <I className="size-4" /> {title as string}
                        </span>
                        <span className="text-sm text-muted-foreground">{body as string}</span>
                      </span>
                    </li>
                  );
                })}
              </ol>
              <p className="mt-4 text-sm text-muted-foreground">Works with OPUS, OGG, MP3, M4A, WAV, AAC and FLAC.</p>
            </>
          )}
        </div>

        <Button variant="hero" size="xl" className="w-full" onClick={nextStep}>
          {step === 0 ? "Begin" : step === 2 ? "Keep my notes safe" : step === STEPS - 1 ? "Start listening" : "Continue"}
          <ArrowRight />
        </Button>
      </div>
    </div>
  );
}
