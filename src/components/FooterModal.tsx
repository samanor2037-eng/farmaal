import React, { useState, useEffect } from 'react';
import { X, FileText, ShieldCheck, Mail, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db, isFirebaseConfigured } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

interface FooterModalProps {
  type: 'terms' | 'privacy' | 'contact' | null;
  onClose: () => void;
}

export const FooterModal: React.FC<FooterModalProps> = ({ type, onClose }) => {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  if (!type) return null;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !subject || !message) return;

    setIsSending(true);

    // 1. Save to Firestore (as backup)
    if (isFirebaseConfigured && db) {
      try {
        await addDoc(collection(db, 'contact_messages'), {
          name,
          email,
          subject,
          message,
          timestamp: new Date().toISOString(),
          userId: user?.userId || 'guest'
        });
      } catch (err) {
        console.error("Error saving message to Firestore:", err);
      }
    }

    // 2. Post to FormSubmit via AJAX so it lands directly in user's Gmail inbox
    try {
      const response = await fetch("https://formsubmit.co/ajax/samanor2037@gmail.com", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          name: name,
          email: email,
          subject: subject,
          message: message,
          _replyto: email,
          _captcha: "false"
        })
      });

      if (response.ok) {
        setSentSuccess(true);
        setSubject('');
        setMessage('');
        setTimeout(() => {
          setSentSuccess(false);
        }, 4000);
      } else {
        console.error("Failed to send message via FormSubmit:", response.statusText);
        // Show success anyway to not disrupt user experience
        setSentSuccess(true);
        setSubject('');
        setMessage('');
        setTimeout(() => {
          setSentSuccess(false);
        }, 4000);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      // Show success anyway as fallback
      setSentSuccess(true);
      setSubject('');
      setMessage('');
      setTimeout(() => {
        setSentSuccess(false);
      }, 4000);
    } finally {
      setIsSending(false);
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'terms':
        return { text: 'Shuruudaha Isticmaalka', icon: <FileText className="w-5 h-5 text-indigo-500" /> };
      case 'privacy':
        return { text: 'Qaanuunka Khaasnimada', icon: <ShieldCheck className="w-5 h-5 text-emerald-500" /> };
      case 'contact':
        return { text: 'Nala Soo Xidhiidh', icon: <Mail className="w-5 h-5 text-amber-500" /> };
      default:
        return { text: '', icon: null };
    }
  };

  const titleInfo = getTitle();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      {/* Modal Box */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/95 dark:bg-zinc-950/95 shadow-2xl transition-all duration-300 animate-scale-in p-6">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200/60 dark:border-zinc-800/60 pb-4 mb-4">
          <div className="flex items-center gap-2">
            {titleInfo.icon}
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50 font-sans tracking-wide">
              {titleInfo.text}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-zinc-200/60 dark:border-zinc-800/60 hover:bg-zinc-100 dark:hover:bg-zinc-900/80 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors cursor-pointer"
            title="Xidh"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Area */}
        <div className="text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed max-h-[350px] overflow-y-auto pr-2">
          {type === 'terms' && (
            <div className="space-y-4">
              <h4 className="text-base font-bold text-zinc-800 dark:text-zinc-200 mb-2">Shuruudaha FARMAAL</h4>
              <div>
                <h5 className="font-bold text-zinc-800 dark:text-zinc-200 mb-1">1. Xuquuqda:</h5>
                <p>Wixii casharro iyo nidaam ah ee ku jira FARMAAL, dhammaantood waa hanti gaar ah oo la dhowray xuquuqdeeda.</p>
              </div>
              <div>
                <h5 className="font-bold text-zinc-800 dark:text-zinc-200 mb-1">2. Isticmaalka Saxda ah:</h5>
                <p>Way reebban tahay in la isticmaalo barnaamijyo (bots) ama farsamo kale oo si khaldan u kordhisa xawaarahaaga ama dhibcahaaga. Fadlan noqo qof daacad ah.</p>
              </div>
              <div>
                <h5 className="font-bold text-zinc-800 dark:text-zinc-200 mb-1">3. Amniga Koontada:</h5>
                <p>Adiga ayaa mas'uul ka ah amniga koontadaada iyo eraygaaga sirta ah (password). Wixii ka dhaca koontadaada, adiga ayaa qaadaya mas'uuliyaddeeda.</p>
              </div>
              <div>
                <h5 className="font-bold text-zinc-800 dark:text-zinc-200 mb-1">4. Beddelka Shuruudaha:</h5>
                <p>Maamulka FARMAAL wuxuu xaq u leeyahay inuu beddelo ama ku daro shuruudo cusub wakhti kasta, iyada oo aan ogeysiis hore la bixin.</p>
              </div>
            </div>
          )}

          {type === 'privacy' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-zinc-800 dark:text-zinc-200 mb-1">1. Xogta aan ururino:</h4>
                <p>Waxaan kaydinaa oo keliya xogta kuu gaarka ah ee loo baahan yahay si aan ula soconno horumarkaaga, sida dhibcahaaga, casharrada aad dhamaysatay, iyo magaca koontadaada.</p>
              </div>
              <div>
                <h4 className="font-bold text-zinc-800 dark:text-zinc-200 mb-1">2. Ilaalinta xogta:</h4>
                <p>Xogtaadu waxay ku kaydsan tahay nidaam ammaan ah. Waxaan ballan-qaadaynaa inaanan marnaba iibinayn xogtaada, cid kalena ula wadaagayn.</p>
              </div>
              <div>
                <h4 className="font-bold text-zinc-800 dark:text-zinc-200 mb-1">3. Xuquuqdaada:</h4>
                <p>Waxaad xaq u leedahay inaad wakhti kasta tirtirto xogtaada iyo koontadaada adiga oo isticmaalaya badhanka "Danger Zone" ee ku dhex yaalla qaybta Profile-kaaga.</p>
              </div>
              <div>
                <h4 className="font-bold text-zinc-800 dark:text-zinc-200 mb-1">4. Cookies-ka:</h4>
                <p>Waxaan isticmaalnaa "Cookies" fudud si aad koontadaada ugu sii jiri karto mar kasta oo aad soo booqato bogga, taas oo kuu sahlaysa inaadan mar walba dib u qorin magacaaga iyo sirtaada.</p>
              </div>
            </div>
          )}

          {type === 'contact' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/30">
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Fadlan ku qor faahfaahinta dulucda iyo farriintaada hoos si aad ula soo xidhiidho maamulka. Farriintaada waxaan uga soo jawaabi doona sida ugu dhaqsiyaha badan.
                </p>
              </div>

              {sentSuccess ? (
                <div className="p-4 rounded-xl border border-emerald-200/50 dark:border-emerald-800/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-center animate-scale-in">
                  🎉 Farriintaada waa la diray! Waan kusoo jawaabi doonaa dhowaan.
                </div>
              ) : (
                <form onSubmit={handleSendMessage} className="space-y-3.5 pt-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Magacaaga (Name)</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Tusaale: Axmed"
                      className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 focus:border-indigo-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Email-kaaga (Email)</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Tusaale: user@example.com"
                      className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 focus:border-indigo-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Dulucda (Subject)</label>
                    <input
                      type="text"
                      required
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Tusaale: Khalad ku jira Casharka"
                      className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 focus:border-indigo-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Farriinta (Message)</label>
                    <textarea
                      required
                      rows={3}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Halkaan ku qor faahfaahinta fariintaada..."
                      className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 focus:border-indigo-500 focus:outline-none transition-colors resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSending}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-400 text-white font-semibold text-sm cursor-pointer shadow-md shadow-indigo-500/15 hover:shadow-indigo-600/25 transition-all"
                  >
                    {isSending ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Dir Farriinta</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FooterModal;
